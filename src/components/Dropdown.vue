<script setup>
// Общая оболочка для выпадашек: кнопка + всплывающая панель.
// Закрывается по тапу мимо и по Escape.
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

defineProps({ align: { type: String, default: 'left' } }) // right — панель прижата к правому краю
const emit = defineEmits(['open'])

const open = ref(false)
const root = ref(null)
const panel = ref(null)
const up = ref(false) // внизу экрана не помещается — раскрываем вверх

// снизу экран перекрыт нижним меню и кнопкой сохранения
const BOTTOM_RESERVE = 140

const onOutside = (e) => !root.value?.contains(e.target) && close()
const onKey = (e) => e.key === 'Escape' && close()

async function show() {
  emit('open')
  open.value = true
  document.addEventListener('pointerdown', onOutside)
  document.addEventListener('keydown', onKey)
  up.value = false
  await nextTick()
  const box = root.value.getBoundingClientRect()
  const height = panel.value.offsetHeight
  const below = window.innerHeight - BOTTOM_RESERVE - box.bottom
  if (height > below && box.top - 60 > below) up.value = true
  else panel.value.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function close() {
  open.value = false
  document.removeEventListener('pointerdown', onOutside)
  document.removeEventListener('keydown', onKey)
}

onBeforeUnmount(close)
</script>

<template>
  <div ref="root" class="dropdown" :class="{ open }">
    <button type="button" class="dropdown-trigger" :aria-expanded="open" @click="open ? close() : show()">
      <slot name="trigger" />
      <ChevronDown class="dropdown-chevron" :size="18" aria-hidden="true" />
    </button>
    <Transition name="drop">
      <div v-if="open" ref="panel" class="dropdown-panel" :class="[align, { up }]">
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
