import { ref, watch } from 'vue'

/** Значение, которое помнит конкретный телефон (последняя открытая вкладка и т.п.). На сервер не уходит. */
export function localRef(key, fallback, allowed) {
  const saved = localStorage.getItem(key)
  const value = ref(allowed.includes(saved) ? saved : fallback)
  watch(value, (v) => localStorage.setItem(key, v))
  return value
}
