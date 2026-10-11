import { ref, watch } from 'vue'

// Тема — настройка конкретного телефона, на сервер не уходит.
// Атрибут на <html> ставит ещё скрипт в index.html, чтобы не было вспышки тёмной темы при загрузке.
export const THEMES = [
  { value: 'dark', label: 'Тёмная', bar: '#0e1517' },
  { value: 'light', label: 'Светлая', bar: '#fbf3ee' },
]

export const theme = ref(localStorage.getItem('fb.theme') === 'light' ? 'light' : 'dark')

let switchTimer
watch(theme, (value) => {
  localStorage.setItem('fb.theme', value)
  const root = document.documentElement
  // на время смены цвета перетекают плавно, а не мигают
  root.classList.add('theme-switching')
  clearTimeout(switchTimer)
  switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 400)
  root.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES.find((t) => t.value === value).bar)
})
