<script setup>
import { ref } from 'vue'
import { groupAmount } from '../format'

// Поле суммы: по мере ввода делит рубли на разряды пробелами («1 250 000»), курсор не прыгает
const model = defineModel({ type: String, default: '' })
const el = ref(null)

function onInput(e) {
  const input = e.target
  const head = input.value.slice(0, input.selectionStart ?? input.value.length)
  const digits = head.replace(/\D/g, '').length // сколько цифр стояло до курсора
  const afterSep = /[.,]/.test(head)
  const value = groupAmount(input.value)
  input.value = value
  model.value = value
  // ставим курсор сразу за той же по счёту цифрой (или за запятой, если её только что ввели)
  let pos = 0
  for (let n = 0; pos < value.length && n < digits; pos++) if (/\d/.test(value[pos])) n++
  const sep = value.indexOf(',')
  if (afterSep && sep >= 0 && pos <= sep) pos = sep + 1
  input.setSelectionRange(pos, pos)
}

defineExpose({ focus: () => el.value?.focus() })
</script>

<template>
  <input ref="el" :value="groupAmount(model)" inputmode="decimal" autocomplete="off" @input="onInput" />
</template>
