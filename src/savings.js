// Копилки: остатки на счетах считаются по истории операций.
// Пополнение и снятие меняют остаток, «Остаток» задаёт его заново (например, после начисления процентов).
import { computed } from 'vue'
import { state, savings } from './store'

export const KINDS = [
  { value: 'in', label: 'Пополнение' },
  { value: 'out', label: 'Снятие' },
  { value: 'set', label: 'Остаток' },
]

const round = (n) => Math.round(n * 100) / 100

export const applyOp = (before, kind, amount) => round(kind === 'set' ? amount : kind === 'out' ? before - amount : before + amount)

// проигрываем историю от старых операций к новым
export const ledger = computed(() => {
  const balance = {} // accountId → текущий остаток
  const last = {} // accountId → дата последней операции
  const steps = {} // id операции → { before, after }
  const ordered = [...savings.value].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  for (const s of ordered) {
    const before = balance[s.accountId] ?? 0
    const after = applyOp(before, s.kind, s.amount)
    balance[s.accountId] = after
    last[s.accountId] = s.date
    steps[s.id] = { before, after }
  }
  return { balance, last, steps }
})

// ищем и среди удалённых счетов, чтобы в истории не пропадали названия
export const accountOf = (id) => state.accs[id] ?? { name: 'Счёт удалён', icon: '' }
