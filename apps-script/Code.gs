/**
 * Бэкенд семейного бюджета на Google Apps Script.
 *
 * Один эндпоинт: POST { secret, action: 'sync', ops: [{ tx } | { rec } | { cat } | { acc } | { sav }], since: <ms> }
 *   - применяет пришедшие изменения (upsert по id, удаление — флаг deleted)
 *   - возвращает все записи, изменённые на сервере после `since`
 *
 * Тело запроса шлём как text/plain, чтобы браузер не делал CORS preflight
 * (Apps Script его не поддерживает).
 */

// Колонки читаются по заголовкам, поэтому новые можно дописывать в конец —
// ensureSheet() добавит их в уже существующую таблицу.
const TABLES = {
  tx: {
    sheet: 'Transactions',
    columns: ['id', 'date', 'type', 'amount', 'category', 'author', 'comment', 'createdAt', 'updatedAt', 'deleted', 'recurringId', 'period'],
  },
  rec: {
    sheet: 'Recurring',
    columns: ['id', 'name', 'category', 'kind', 'amount', 'everyMonths', 'day', 'startMonth', 'createdAt', 'updatedAt', 'deleted'],
  },
  cat: {
    sheet: 'Categories',
    columns: ['id', 'name', 'type', 'icon', 'order', 'createdAt', 'updatedAt', 'deleted'],
  },
  // копилки: счета и история операций по ним; с тратами и доходами не связаны
  acc: {
    sheet: 'Accounts',
    // locked — нельзя снять в любой момент; lockedUntil — до какой даты (YYYY-MM-DD), пусто — бессрочно
    columns: ['id', 'name', 'icon', 'order', 'createdAt', 'updatedAt', 'deleted', 'locked', 'lockedUntil'],
  },
  sav: {
    sheet: 'Savings',
    // kind: in — пополнение, out — снятие, set — уточнили остаток (amount = новый остаток)
    columns: ['id', 'date', 'accountId', 'kind', 'amount', 'comment', 'createdAt', 'updatedAt', 'deleted'],
  },
};
const NUMBER_COLUMNS = ['amount', 'createdAt', 'updatedAt', 'everyMonths', 'day', 'order'];
const BOOL_COLUMNS = ['deleted', 'locked'];
// если таблица всё же превратила строку в дату — вернём её в исходном виде
const DATE_FORMATS = { date: 'yyyy-MM-dd', startMonth: 'yyyy-MM', period: 'yyyy-MM', lockedUntil: 'yyyy-MM-dd' };

// стартовый набор категорий, к которым пришли в таблице за 2025 год
const DEFAULT_CATEGORIES = [
  // [название, тип, иконка] — ключи иконок см. src/icons.js
  ['Покупки', 'expense', 'shopping-cart'],
  ['Кафе | Рестораны', 'expense', 'utensils'],
  ['Кв. Плата | Подписки', 'expense', 'receipt'],
  ['Кредиты | Рассрочки', 'expense', 'landmark'],
  ['Транспорт', 'expense', 'car'],
  ['Красота | Здоровье', 'expense', 'heart-pulse'],
  ['Подарки', 'expense', 'gift'],
  ['Прочее', 'expense', 'package'],
  ['Зарплата', 'income', 'briefcase'],
  ['Прочее', 'income', 'coins'],
];

/** Запустить один раз вручную из редактора: создаёт листы и задаёт пароль. */
function setup() {
  Object.keys(TABLES).forEach(key => ensureSheet(TABLES[key]));

  const cat = ensureSheet(TABLES.cat);
  if (cat.getLastRow() < 2) {
    const header = cat.getRange(1, 1, 1, cat.getLastColumn()).getValues()[0];
    const now = Date.now();
    const rows = DEFAULT_CATEGORIES.map(([name, type, icon], i) =>
      toRow('cat', { id: Utilities.getUuid(), name, type, icon, order: i }, header, now + i));
    cat.getRange(2, 1, rows.length, header.length).setValues(rows);
  }

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('FAMILY_SECRET')) {
    const secret = Utilities.getUuid().slice(0, 8);
    props.setProperty('FAMILY_SECRET', secret);
    Logger.log('Семейный пароль: ' + secret + ' (поменять: Project Settings → Script Properties)');
  } else {
    Logger.log('Пароль уже задан: ' + props.getProperty('FAMILY_SECRET'));
  }
}

/** Создаёт лист или дописывает недостающие колонки. Возвращает лист. */
function ensureSheet(table) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(table.sheet);
  if (!sheet) {
    sheet = ss.insertSheet(table.sheet);
    sheet.setFrozenRows(1);
  }
  const lastCol = sheet.getLastColumn();
  const header = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  table.columns.forEach(name => {
    if (header.indexOf(name) !== -1) return;
    header.push(name);
    const col = header.length;
    sheet.getRange(1, col).setValue(name).setFontWeight('bold');
    // строковые колонки — как текст, чтобы таблица не превращала их в даты/числа
    if (NUMBER_COLUMNS.indexOf(name) === -1 && BOOL_COLUMNS.indexOf(name) === -1) {
      sheet.getRange(1, col, sheet.getMaxRows(), 1).setNumberFormat('@');
    }
  });
  return sheet;
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('FAMILY_SECRET');
    if (!secret || req.secret !== secret) return json({ ok: false, error: 'unauthorized' });

    if (req.action === 'sync') return json(sync(req.ops || [], Number(req.since) || 0));
    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, hint: 'use POST' });
}

function sync(ops, since) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const keys = Object.keys(TABLES);
    const data = {};
    let maxUpdated = 0;
    keys.forEach(key => {
      const sheet = ensureSheet(TABLES[key]);
      const values = sheet.getDataRange().getValues();
      const header = values[0];
      const upd = header.indexOf('updatedAt');
      const rowById = {};
      for (let i = 1; i < values.length; i++) {
        rowById[values[i][0]] = i + 1; // номер строки в листе
        maxUpdated = Math.max(maxUpdated, Number(values[i][upd]) || 0);
      }
      data[key] = { sheet, header, rowById, appended: [] };
    });

    // строго больше любой существующей метки, иначе клиент с since=max может пропустить запись
    const now = Math.max(Date.now(), maxUpdated + 1);
    ops.forEach((op, idx) => {
      const key = keys.find(k => op[k]);
      const item = key && op[key];
      if (!item || !item.id) return;
      const d = data[key];
      // разные метки, чтобы порядок изменений внутри одного sync сохранялся
      const row = toRow(key, item, d.header, now + idx);
      const at = d.rowById[item.id];
      if (at > 0) {
        d.sheet.getRange(at, 1, 1, row.length).setValues([row]);
      } else if (at === -1) {
        // тот же id уже есть в этом пакете — заменяем добавляемую строку
        d.appended[d.appended.findIndex(r => r[0] === String(item.id))] = row;
      } else {
        d.appended.push(row);
        d.rowById[item.id] = -1;
      }
    });

    const result = { ok: true, serverTime: since };
    keys.forEach(key => {
      const d = data[key];
      if (d.appended.length) {
        d.sheet.getRange(d.sheet.getLastRow() + 1, 1, d.appended.length, d.header.length).setValues(d.appended);
      }
      const items = d.sheet.getDataRange().getValues().slice(1).map(r => fromRow(r, d.header));
      result[key + 's'] = items.filter(it => it.updatedAt > since);
      items.forEach(it => { result.serverTime = Math.max(result.serverTime, it.updatedAt); });
    });
    return result; // { ok, txs, recs, cats, accs, savs, serverTime }
  } finally {
    lock.releaseLock();
  }
}

function toRow(key, item, header, updatedAt) {
  const clean = Object.assign({}, item, { updatedAt: updatedAt, createdAt: Number(item.createdAt) || Date.now() });
  if (key === 'tx' || key === 'cat') clean.type = item.type === 'income' ? 'income' : 'expense';
  if (key === 'rec') clean.kind = item.kind === 'variable' ? 'variable' : 'fixed';
  if (key === 'sav') clean.kind = ['in', 'out', 'set'].indexOf(item.kind) !== -1 ? item.kind : 'set';
  return header.map(name => {
    const v = clean[name];
    if (NUMBER_COLUMNS.indexOf(name) !== -1) return Number(v) || 0;
    if (BOOL_COLUMNS.indexOf(name) !== -1) return v === true;
    return v === undefined || v === null ? '' : String(v);
  });
}

function fromRow(r, header) {
  const item = {};
  header.forEach((name, i) => {
    let v = r[i];
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), DATE_FORMATS[name] || 'yyyy-MM-dd');
    if (NUMBER_COLUMNS.indexOf(name) !== -1) v = Number(v) || 0;
    else if (BOOL_COLUMNS.indexOf(name) !== -1) v = v === true || v === 'TRUE';
    else v = String(v);
    item[name] = v;
  });
  return item;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
