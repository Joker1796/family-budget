<script setup>
import { computed } from 'vue'
import { iconComponent } from '../icons'

const props = defineProps({
  icon: { type: String, default: '' },
  size: { type: Number, default: 24 },
  tile: { type: Boolean, default: false }, // квадратная плашка — в списках
})
const component = computed(() => iconComponent(props.icon))
</script>

<template>
  <span class="cat-icon" :class="{ tile }">
    <component :is="component" :size="size" :stroke-width="1.75" aria-hidden="true" />
  </span>
</template>
