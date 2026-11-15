import { reactive, computed, watch } from 'vue'
import { callApi } from './api'

// Синхронизируемые сущности: ключ op'а на сервере → поле в state.
// tx — траты/доходы, rec — регулярные платежи, cat — категории,
// acc — счета копилок, sav — операции по ним (с тратами не связаны).
const ENTITIES = { tx: 'txs', rec: 'recs', cat: 'cats', acc: 'accs', sav: 'savs' }

const SCHEMA = 4 // при смене формата локальных данных — перекачиваем всё с сервера
const KEYS = {
  settings: 'fb.settings', txs: 'fb.txs', recs: 'fb.recs', cats: 'fb.cats', accs: 'fb.accs', savs: 'fb.savs',
  queue: 'fb.queue', since: 'fb.since',
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Формат поменялся — выбрасываем кэш записей и перекачиваем его с сервера.
// Очередь неотправленных изменений не трогаем.
if (load('fb.schema', 1) !== SCHEMA) {
  for (const key of ['fb.categories', KEYS.txs, KEYS.recs, KEYS.cats, KEYS.accs, KEYS.savs, KEYS.since]) localStorage.removeItem(key)
  localStorage.setItem('fb.schema', SCHEMA)
}

export const state = reactive({
  settings: load(KEYS.settings, { apiUrl: '', secret: '' }),
  // id -> запись; удалённые хранятся с deleted: true
  txs: load(KEYS.txs, {}),
  recs: load(KEYS.recs, {}),
  cats: load(KEYS.cats, {}),
  accs: load(KEYS.accs, {}),
  savs: load(KEYS.savs, {}),
  queue: load(KEYS.queue, []), // ещё не отправленные изменения: [{ tx }, { rec }, ...]
  since: load(KEYS.since, 0), // серверная метка последней синхронизации
  syncing: false,
  error: '',
  lastSyncAt: null,
})

for (const [field, key] of Object.entries(KEYS)) {
  watch(() => state[field], (v) => localStorage.setItem(key, JSON.stringify(v)), { deep: true })
}

export const isConfigured = computed(() => Boolean(state.settings.apiUrl && state.settings.secret))

const alive = (map) => Object.values(map).filter((x) => !x.deleted)

export const transactions = computed(() =>
  alive(state.txs).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
)

export const recurring = computed(() => alive(state.recs).sort((a, b) => a.day - b.day || a.name.localeCompare(b.name)))

export const categories = computed(() => alive(state.cats).sort((a, b) => a.order - b.order))

export const accounts = computed(() => alive(state.accs).sort((a, b) => a.order - b.order))

export const savings = computed(() =>
  alive(state.savs).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
)

// родитель категории (подтипы дохода, один уровень); у удалённого или вложенного родителя категория — сама по себе
const parentOf = (c) => {
  const p = c.parent && state.cats[c.parent]
  return p && !p.deleted && !p.parent ? p : null
}

// порядок дерева: верхний уровень по order, сразу за каждой категорией — её подтипы
export const categoriesOf = (type) => {
  const list = categories.value.filter((c) => c.type === type)
  return list.filter((c) => !parentOf(c)).flatMap((top) => [top, ...list.filter((c) => parentOf(c)?.id === top.id)])
}

/** Категории, которые можно указать родителем для cat: верхний уровень того же типа, без самой cat. */
export const parentOptions = (cat) =>
  categoriesOf(cat.type).filter((c) => c.id !== cat.id && !parentOf(c))

export const hasChildren = (id) => categories.value.some((c) => parentOf(c)?.id === id)

/** Подтипы родителя в порядке дерева. */
export const childrenOf = (id) => categories.value.filter((c) => parentOf(c)?.id === id)

/** Подтип-наследник: тёзка родителя, к нему по названию относятся записи, внесённые до разделения. */
export const isNamesake = (c) => parentOf(c)?.name === c.name

// записи ссылаются на категорию по названию; у родителя с подтипами есть тёзка-наследник —
// записи «Зарплата» принадлежат ему, а не обёртке. Ищем и среди удалённых, чтобы не терять иконки старых записей
function findCategory(name, type) {
  const all = Object.values(state.cats).filter((c) => c.name === name && c.type === type)
  const alive = all.filter((c) => !c.deleted)
  return alive.find((c) => !hasChildren(c.id)) || alive[0] || all[0]
}

/** Название группы для статистики: имя родителя, если категория — подтип. */
export function categoryGroup(name, type) {
  const cat = findCategory(name, type)
  return (cat && parentOf(cat)?.name) || name
}

/** Записи с этим названием относятся к подтипу (их надо показывать в раскрытии группы). */
export const isSubcategory = (name, type) => Boolean(parentOf(findCategory(name, type) || {}))

export const categoryIcon = (name, type) => findCategory(name, type)?.icon || ''

/** Иконка строки-группы в Итогах: у источника с подтипами — иконка самой обёртки, а не тёзки. */
export const groupIcon = (name, type) =>
  categories.value.find((c) => c.name === name && c.type === type && hasChildren(c.id))?.icon || categoryIcon(name, type)

// crypto.randomUUID есть только в secure context; при отладке по http://192.168... его нет
const uuid = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

function put(kind, defaults, fields) {
  const map = state[ENTITIES[kind]]
  const prev = fields.id ? map[fields.id] : null
  const now = Date.now()
  const item = {
    deleted: false,
    ...defaults,
    ...prev,
    ...fields,
    id: prev?.id ?? fields.id ?? uuid(),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  }
  map[item.id] = item
  state.queue.push({ [kind]: item })
  return item
}

export function saveTx(fields) {
  const tx = put('tx', { comment: '', recurringId: '', period: '' }, fields)
  sync()
  return tx
}

export const deleteTx = (id) => saveTx({ id, deleted: true })

export function saveRecurring(fields) {
  const rec = put('rec', { kind: 'fixed', everyMonths: 1, day: 1 }, fields)
  sync()
  return rec
}

export const deleteRecurring = (id) => saveRecurring({ id, deleted: true })

export function saveCategory(fields) {
  const prev = fields.id ? state.cats[fields.id] : null
  const order = prev ? prev.order : Math.max(-1, ...Object.values(state.cats).map((c) => c.order)) + 1
  const cat = put('cat', { order, icon: 'tag', parent: '' }, fields)
  // траты и платежи ссылаются на категорию по названию — переименовываем и в них.
  // У обёртки с подтипами своих записей нет: записи с её названием принадлежат тёзке-наследнику
  if (prev && !fields.deleted && prev.name !== cat.name && !hasChildren(cat.id)) {
    for (const tx of Object.values(state.txs)) {
      if (tx.category === prev.name && tx.type === prev.type) put('tx', {}, { id: tx.id, category: cat.name })
    }
    if (prev.type === 'expense') {
      for (const rec of Object.values(state.recs)) {
        if (rec.category === prev.name) put('rec', {}, { id: rec.id, category: cat.name })
      }
    }
  }
  sync()
  return cat
}

// у родителя остался один тёзка-наследник — разделение больше не нужно: убираем тёзку,
// родитель снова обычная категория, и записи с этим названием по-прежнему его
function collapseIfOnlyNamesake(parentId) {
  const kids = childrenOf(parentId)
  if (kids.length && kids.every(isNamesake)) for (const k of kids) put('cat', {}, { id: k.id, deleted: true })
}

/**
 * Делает категорию подтипом parentId ('' — самостоятельной).
 * Первый подтип превращает родителя в обёртку: рядом появляется тёзка-наследник, к которому
 * по названию переходят все записи родителя (вносить записи в саму обёртку больше нельзя).
 */
export function setCategoryParent(id, parentId) {
  const cat = state.cats[id]
  const oldParent = parentOf(cat)?.id
  if (parentId && !hasChildren(parentId)) {
    const p = state.cats[parentId]
    // перед первым подтипом, чтобы наследник шёл в списке первым
    put('cat', {}, { name: p.name, type: p.type, icon: p.icon, parent: p.id, order: cat.order - 0.5 })
  }
  put('cat', {}, { id, parent: parentId })
  if (oldParent && oldParent !== parentId) collapseIfOnlyNamesake(oldParent)
  sync()
}

// подтипы удалённой категории становятся самостоятельными
export function deleteCategory(id) {
  const oldParent = parentOf(state.cats[id])?.id
  for (const c of Object.values(state.cats)) if (c.parent === id && !c.deleted) put('cat', {}, { id: c.id, parent: '' })
  // тёзку удалённой обёртки не плодим: он и так носит её имя и записи
  saveCategory({ id, deleted: true })
  if (oldParent) {
    collapseIfOnlyNamesake(oldParent)
    sync()
  }
}

/** Меняет элемент списка местами с соседним (по полю order). */
function swapOrder(kind, list, id, delta) {
  const i = list.findIndex((x) => x.id === id)
  const other = list[i + delta]
  if (!other) return
  const a = list[i].order
  put(kind, {}, { id, order: other.order })
  put(kind, {}, { id: other.id, order: a })
  sync()
}

/** Соседи по дереву: категории верхнего уровня или подтипы того же родителя. */
export const siblingsOf = (id) => {
  const pid = parentOf(state.cats[id])?.id
  return categoriesOf(state.cats[id].type).filter((c) => parentOf(c)?.id === pid)
}

/** Меняет местами категорию с соседней в пределах её уровня. */
export const moveCategory = (id, delta) => swapOrder('cat', siblingsOf(id), id, delta)

const nextOrder = (map) => Math.max(-1, ...Object.values(map).map((x) => x.order)) + 1

// счёт копилки; история ссылается на него по id, так что переименование ничего не каскадит
export function saveAccount(fields) {
  const acc = put('acc', { order: nextOrder(state.accs), icon: 'piggy-bank', locked: false, lockedUntil: '' }, fields)
  sync()
  return acc
}

export const deleteAccount = (id) => saveAccount({ id, deleted: true })

export const moveAccount = (id, delta) => swapOrder('acc', accounts.value, id, delta)

export function saveSaving(fields) {
  const sav = put('sav', { comment: '' }, fields)
  sync()
  return sav
}

export const deleteSaving = (id) => saveSaving({ id, deleted: true })

let pendingResync = false
// чего не знают прошлые версии Code.gs: запись вернулась без новой колонки или с другим kind
const OUTDATED = {
  acc: (item, echo) => !('locked' in echo),
  tx: (item, echo) => Boolean(item.extra) && !('extra' in echo),
  rec: (item, echo) => item.kind !== echo.kind,
  cat: (item, echo) => Boolean(item.parent) && !('parent' in echo),
}

export async function sync({ full = false } = {}) {
  if (!isConfigured.value) return
  if (state.syncing) {
    pendingResync = true
    return
  }
  state.syncing = true
  const sent = state.queue.length
  try {
    const ops = state.queue.slice(0, sent)
    const res = await callApi(state.settings, { action: 'sync', ops, since: full ? 0 : state.since })
    state.queue.splice(0, sent)
    // старый Code.gs молча пропускает незнакомые сущности — не теряем их, а держим в очереди
    // а новые колонки старой сущности он не пишет — запись вернулась без них
    const echo = (kind, id) => res[`${kind}s`]?.find((it) => it.id === id)
    const unknown = ops.filter((op) => {
      const [kind, item] = Object.entries(op)[0]
      const back = echo(kind, item.id)
      return !(`${kind}s` in res) || Boolean(back && OUTDATED[kind]?.(item, back))
    })
    state.queue.unshift(...unknown)
    // пока ждали ответ, запись могли поменять локально — её версия новее
    const stillPending = new Set(state.queue.map((op) => Object.entries(op).map(([k, v]) => `${k}:${v.id}`)[0]))
    for (const [kind, field] of Object.entries(ENTITIES)) {
      for (const item of res[`${kind}s`] ?? []) {
        if (!stillPending.has(`${kind}:${item.id}`)) state[field][item.id] = item
      }
    }
    state.since = res.serverTime
    state.error = unknown.length ? 'На сервере старая версия Code.gs — обновите развёртывание Apps Script' : ''
    state.lastSyncAt = Date.now()
  } catch (e) {
    state.error = e.message
  } finally {
    state.syncing = false
  }
  if (pendingResync || (state.queue.length && !state.error)) {
    pendingResync = false
    sync()
  }
}
