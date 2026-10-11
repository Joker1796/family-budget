<script setup>
import { ref, computed } from 'vue'
import { money } from '../format'

// Кольцевая диаграмма: доли категорий. Тап по сегменту — в центре его сумма и доля.
// rows: [{ name, sum, share, color }], уже отсортированы и свёрнуты до ≤ 6 штук
const props = defineProps({ rows: { type: Array, required: true }, total: { type: Number, required: true } })
const selected = defineModel('selected', { type: String, default: '' })

const GAP = 0.8 // зазор между сегментами, в сотых долях окружности

const segments = computed(() => {
  let start = 0
  return props.rows.map((r) => {
    const len = r.share * 100
    const gap = props.rows.length > 1 ? Math.min(GAP, len / 2) : 0
    const seg = { ...r, dash: `${len - gap} ${100 - len + gap}`, offset: -start }
    start += len
    return seg
  })
})

const current = computed(() => props.rows.find((r) => r.name === selected.value))
const toggle = (name) => (selected.value = selected.value === name ? '' : name)
</script>

<template>
  <div class="donut" :class="{ picked: current }">
    <svg viewBox="0 0 100 100" role="img" :aria-label="rows.map((r) => `${r.name} ${Math.round(r.share * 100)}%`).join(', ')">
      <circle
        v-for="(s, i) in segments" :key="s.name" class="donut-seg" :class="{ active: s.name === selected }"
        cx="50" cy="50" r="40" pathLength="100" :stroke="s.color" :stroke-dasharray="s.dash" :stroke-dashoffset="s.offset"
        :style="{ animationDelay: i * 60 + 'ms' }" @click="toggle(s.name)"
      />
    </svg>
    <div class="donut-center">
      <Transition name="fade" mode="out-in">
        <div :key="current?.name ?? ''">
          <small>{{ current ? current.name : 'Всего' }}</small>
          <b>{{ money(current ? current.sum : total) }}</b>
          <small v-if="current">{{ Math.round(current.share * 100) }}%</small>
        </div>
      </Transition>
    </div>
  </div>
</template>
