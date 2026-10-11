import { reactive, computed, watch } from 'vue'
import { callApi } from './api'

// Синхронизируемые сущности: ключ op'а на сервере → поле в state.
// tx — траты/доходы, rec — регулярные платежи, cat — категории.
const ENTITIES = { tx: 'txs', rec: 'recs', cat: 'cats' }

const SCHEMA = 4 // при смене формата локальных данных — перекачиваем всё с сервера
const KEYS = { settings: 'fb.settings', txs: 'fb.txs', recs: 'fb.recs', cats: 'fb.cats', queue: 'fb.queue', since: 'fb.since' }

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
  for (const key of ['fb.categories', KEYS.txs, KEYS.recs, KEYS.cats, KEYS.since]) localStorage.removeItem(key)
  localStorage.setItem('fb.schema', SCHEMA)
}

export const state = reactive({
  settings: load(KEYS.settings, { apiUrl: '', secret: '', author: '' }),
  // id -> запись; удалённые хранятся с deleted: true
  txs: load(KEYS.txs, {}),
  recs: load(KEYS.recs, {}),
  cats: load(KEYS.cats, {}),
  queue: load(KEYS.queue, []), // ещё не отправленные изменения: [{ tx }, { rec }, ...]
  since: load(KEYS.since, 0), // серверная метка последней синхронизации
  syncing: false,
  error: '',
  lastSyncAt: null,
})

for (const [field, key] of Object.entries(KEYS)) {
  watch(() => state[field], (v) => localStorage.setItem(key, JSON.stringify(v)), { deep: true })
}

export const isConfigured = computed(() => Boolean(state.settings.apiUrl && state.settings.secret && state.settings.author))

const alive = (map) => Object.values(map).filter((x) => !x.deleted)

export const transactions = computed(() =>
  alive(state.txs).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
)

export const recurring = computed(() => alive(state.recs).sort((a, b) => a.day - b.day || a.name.localeCompare(b.name)))

export const categories = computed(() => alive(state.cats).sort((a, b) => a.order - b.order))

export const categoriesOf = (type) => categories.value.filter((c) => c.type === type)

// ищем и среди удалённых категорий, чтобы у старых записей не пропадали иконки
export const categoryIcon = (name, type) =>
  Object.values(state.cats).find((c) => c.name === name && c.type === type && !c.deleted)?.icon ||
  Object.values(state.cats).find((c) => c.name === name && c.type === type)?.icon ||
  ''

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
  const tx = put('tx', { author: state.settings.author, comment: '', recurringId: '', period: '' }, fields)
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
  const cat = put('cat', { order, icon: 'tag' }, fields)
  // траты и платежи ссылаются на категорию по названию — переименовываем и в них
  if (prev && !fields.deleted && prev.name !== cat.name) {
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

export const deleteCategory = (id) => saveCategory({ id, deleted: true })

/** Меняет местами категорию с соседней в пределах её типа. */
export function moveCategory(id, delta) {
  const list = categoriesOf(state.cats[id].type)
  const i = list.findIndex((c) => c.id === id)
  const other = list[i + delta]
  if (!other) return
  const a = list[i].order
  put('cat', {}, { id, order: other.order })
  put('cat', {}, { id: other.id, order: a })
  sync()
}

let pendingResync = false

export async function sync({ full = false } = {}) {
  if (!isConfigured.value) return
  if (state.syncing) {
    pendingResync = true
    return
  }
  state.syncing = true
  const sent = state.queue.length
  try {
    const res = await callApi(state.settings, {
      action: 'sync',
      ops: state.queue.slice(0, sent),
      since: full ? 0 : state.since,
    })
    state.queue.splice(0, sent)
    // пока ждали ответ, запись могли поменять локально — её версия новее
    const stillPending = new Set(state.queue.map((op) => Object.entries(op).map(([k, v]) => `${k}:${v.id}`)[0]))
    for (const [kind, field] of Object.entries(ENTITIES)) {
      for (const item of res[`${kind}s`] ?? []) {
        if (!stillPending.has(`${kind}:${item.id}`)) state[field][item.id] = item
      }
    }
    state.since = res.serverTime
    state.error = ''
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
