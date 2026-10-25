import { watch, onBeforeUnmount } from 'vue'

// Жест «назад» (свайп от края в iOS, кнопка «назад» в Android) закрывает открытый вложенный экран,
// а не уводит из приложения. Каждому открытому экрану соответствует запись в истории с номером глубины:
// открыли — дописываем запись, закрыли кнопкой — откатываем историю, пришёл popstate — закрываем лишние экраны.

const stack = [] // close-функции открытых экранов, от нижнего к верхнему
let scheduled = false
let going = false // ждём popstate от собственного history.go()

const depth = () => history.state?.depth ?? 0

function flush() {
  scheduled = false
  if (going) return
  const cur = depth()
  if (stack.length > cur) for (let d = cur + 1; d <= stack.length; d++) history.pushState({ depth: d }, '')
  else if (stack.length < cur) go(stack.length - cur)
}

function go(delta) {
  going = true
  history.go(delta)
}

function schedule() {
  if (!scheduled) (scheduled = true), queueMicrotask(flush)
}

// закрытие жестом — без своей анимации: iOS уже показал сдвиг экрана, второй слайд выглядел бы как рывок
function instant() {
  const html = document.documentElement
  html.classList.add('instant')
  setTimeout(() => html.classList.remove('instant'), 120)
}

window.addEventListener('popstate', () => {
  if (going) {
    going = false
    return flush()
  }
  const d = depth()
  if (d > stack.length) return go(stack.length - d) // «вперёд» на запись уже закрытого экрана
  if (stack.length > d) instant()
  while (stack.length > d) stack.pop()()
})

// перезагрузились посреди вложенного экрана — экраны закрыты, лишние записи откатываем
if (depth()) go(-depth())

/** Пока open() истинно, жест «назад» вызывает close(). */
export function useBack(open, close) {
  let entry = null
  const release = () => {
    const i = stack.indexOf(entry)
    if (i >= 0) stack.splice(i, 1), schedule()
    entry = null
  }
  watch(
    open,
    (v) => {
      if (v && !entry) {
        entry = () => ((entry = null), close())
        stack.push(entry)
        schedule()
      } else if (!v && entry) release()
    },
    { immediate: true },
  )
  onBeforeUnmount(() => entry && release())
}
