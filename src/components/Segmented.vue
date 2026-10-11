<script setup>
import { computed } from 'vue'

// Переключатель с плавно переезжающей подсветкой выбранного варианта
const props = defineProps({ options: { type: Array, required: true } }) // [{ value, label }]
const model = defineModel({ required: true })
const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === model.value)))
</script>

<template>
  <div class="segmented" :style="{ '--count': options.length, '--index': index }">
    <span class="segmented-indicator" aria-hidden="true" />
    <button v-for="o in options" :key="o.value" :class="{ active: o.value === model }" @click="model = o.value">{{ o.label }}</button>
  </div>
</template>
