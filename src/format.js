const intFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const kopFmt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// копейки показываем только если они есть: «1 250 ₽», но «1 250,50 ₽»
export const money = (n) => `${(Number.isInteger(n) ? intFmt : kopFmt).format(n)} ₽`

const pad = (n) => String(n).padStart(2, '0')

export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const isoMonth = (d = new Date()) => isoDate(d).slice(0, 7)

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  return isoMonth(new Date(y, m - 1 + delta, 1))
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return s[0].toUpperCase() + s.slice(1).replace(' г.', '')
}

export function dayLabel(date) {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (date === isoDate(today)) return 'Сегодня'
  if (date === isoDate(yesterday)) return 'Вчера'
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
}

export function parseAmount(str) {
  const n = parseFloat(String(str).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

// «1250000,5» → «1 250 000,5»: разряды через пробел, одна запятая, не больше двух знаков копеек
export function groupAmount(str) {
  const [int, ...rest] = String(str).replace(/\./g, ',').replace(/[^\d,]/g, '').split(',')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return rest.length ? `${grouped},${rest.join('').slice(0, 2)}` : grouped
}
