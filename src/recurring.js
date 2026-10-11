// Логика регулярных платежей: когда платёж наступает, оплачен ли он и сколько ожидать.
//
// Платёж (rec): { id, name, category, kind: 'fixed'|'variable', amount, everyMonths, day, startMonth: 'YYYY-MM' }
// Оплата — обычная трата с recurringId и period ('YYYY-MM' — за какой месяц платёж).
import { computed } from 'vue'
import { transactions, recurring } from './store'
import { isoDate, isoMonth, shiftMonth } from './format'

const HISTORY = 6 // по скольким последним оплатам считать медиану
export const SOON_DAYS = 3 // за сколько дней напоминать
export const HORIZON_DAYS = 60 // насколько вперёд показывать редкие платежи

const monthIndex = (month) => {
  const [y, m] = month.split('-').map(Number)
  return y * 12 + m - 1
}

export function isDue(rec, month) {
  const diff = monthIndex(month) - monthIndex(rec.startMonth)
  return diff >= 0 && diff % Math.max(1, rec.everyMonths) === 0
}

/** Дата платежа в месяце; 31-е в коротком месяце превращается в последний день. */
export function dueDate(rec, month) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(rec.day, last)).padStart(2, '0')}`
}

export function daysUntil(date, today = isoDate()) {
  const toUtc = (s) => Date.UTC(...s.split('-').map((n, i) => (i === 1 ? n - 1 : +n)))
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000)
}

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// оплаты по каждому платежу, свежие первыми
const paymentsByRec = computed(() => {
  const map = {}
  for (const tx of transactions.value) {
    if (!tx.recurringId) continue
    ;(map[tx.recurringId] ??= []).push(tx)
  }
  for (const list of Object.values(map)) list.sort((a, b) => b.period.localeCompare(a.period) || b.date.localeCompare(a.date))
  return map
})

export const paymentsOf = (rec) => paymentsByRec.value[rec.id] ?? []

/** Сколько ожидать: фиксированная сумма или медиана последних оплат (пока их нет — оценка из шаблона). */
export function estimate(rec) {
  if (rec.kind === 'fixed') return rec.amount
  const last = paymentsOf(rec).slice(0, HISTORY).map((t) => t.amount)
  return last.length ? Math.round(median(last)) : rec.amount
}

/** Все платежи, выпадающие на месяц, со статусом оплаты. */
export function occurrences(month, today = isoDate()) {
  return recurring.value
    .filter((rec) => isDue(rec, month))
    .map((rec) => {
      const due = dueDate(rec, month)
      const paid = paymentsOf(rec).find((t) => t.period === month) ?? null
      const days = daysUntil(due, today)
      const status = paid ? 'paid' : days < 0 ? 'overdue' : days <= SOON_DAYS ? 'soon' : 'upcoming'
      return { rec, month, due, days, paid, status, amount: paid ? paid.amount : estimate(rec) }
    })
    .sort((a, b) => a.due.localeCompare(b.due))
}

export function summarize(list) {
  const paid = list.filter((o) => o.paid).reduce((s, o) => s + o.amount, 0)
  const left = list.filter((o) => !o.paid).reduce((s, o) => s + o.amount, 0)
  return { paid, left, total: paid + left }
}

/** Что пора оплатить: просроченное в этом месяце и всё, до чего осталось ≤ SOON_DAYS дней. */
export function reminders(today = isoDate()) {
  const month = isoMonth()
  return [...occurrences(month, today), ...occurrences(shiftMonth(month, 1), today)].filter(
    (o) => !o.paid && o.days <= SOON_DAYS && (o.days >= 0 || o.month === month),
  )
}

/** Редкие платежи (не ежемесячные) в ближайшие HORIZON_DAYS дней после текущего месяца. */
export function horizon(today = isoDate()) {
  const result = []
  for (let k = 1; k <= Math.ceil(HORIZON_DAYS / 28); k++) {
    for (const o of occurrences(shiftMonth(isoMonth(), k), today)) {
      if (o.rec.everyMonths > 1 && o.days <= HORIZON_DAYS) result.push(o)
    }
  }
  return result
}

export function periodLabel(rec) {
  if (rec.everyMonths === 1) return `каждый месяц, ${rec.day}-го`
  if (rec.everyMonths === 12) {
    const [y, m] = rec.startMonth.split('-').map(Number)
    return `раз в год, ${new Date(y, m - 1, rec.day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
  }
  return `раз в ${rec.everyMonths} мес., ${rec.day}-го`
}

export function dueLabel(days) {
  if (days < 0) return `просрочен на ${-days} дн.`
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  if (days === 2) return 'послезавтра'
  return `через ${days} дн.`
}
