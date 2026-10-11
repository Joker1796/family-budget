import { ref, watch } from 'vue'

/** Имя анимации для смены значения: вперёд — уезжает влево, назад — вправо. */
export function useSlide(source) {
  const name = ref('slide-left')
  watch(source, (to, from) => (name.value = to >= from ? 'slide-left' : 'slide-right'))
  return name
}
