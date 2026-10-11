<script setup>
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import Dropdown from './Dropdown.vue'
import CatIcon from './CatIcon.vue'

// options: [{ value, label, icon? }] — icon это ключ иконки категории
const props = defineProps({ options: { type: Array, required: true }, placeholder: { type: String, default: 'Выберите' } })
const model = defineModel({ required: true })
const current = computed(() => props.options.find((o) => o.value === model.value))
</script>

<template>
  <Dropdown>
    <template #trigger>
      <CatIcon v-if="current?.icon" :icon="current.icon" :size="20" />
      <span class="value" :class="{ placeholder: !current }">{{ current?.label ?? placeholder }}</span>
    </template>
    <template #default="{ close }">
      <div class="dropdown-list" role="listbox">
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          role="option"
          :aria-selected="o.value === model"
          :class="{ active: o.value === model }"
          @click="(model = o.value), close()"
        >
          <CatIcon v-if="o.icon" :icon="o.icon" :size="20" />
          {{ o.label }}
          <Check v-if="o.value === model" class="check" :size="18" />
        </button>
      </div>
    </template>
  </Dropdown>
</template>
