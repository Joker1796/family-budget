<script setup>
import { ICON_GROUPS } from '../icons'

defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="icon-picker">
    <template v-for="g in ICON_GROUPS" :key="g.title">
      <small>{{ g.title }}</small>
      <div class="icon-grid">
        <button
          v-for="(component, key) in g.icons"
          :key="key"
          :class="{ active: key === modelValue }"
          :aria-label="key"
          @click="emit('update:modelValue', key)"
        >
          <component :is="component" :size="24" :stroke-width="1.75" />
        </button>
      </div>
    </template>
  </div>
</template>
