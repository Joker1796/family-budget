<script setup>
import { ref, computed } from 'vue'
import { transactions, categoryIcon } from '../store'
import CatIcon from './CatIcon.vue'
import { money } from '../format'
import MonthPicker from './MonthPicker.vue'
import Segmented from './Segmented.vue'
import Donut from './Donut.vue'
import { useSlide } from '../motion'
import { localRef } from '../local'

const TYPES = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const month = defineModel('month', { type: String, required: true })
const type = localRef('fb.statsType', 'expense', ['expense', 'income']) // последняя открытая вкладка
const picked = ref('') // выбранный сегмент диаграммы доходов

const slide = useSlide(month)
const typeSlide = useSlide(type) // expense < income — доходы «правее»

const monthTxs = computed(() => transactions.value.filter((t) => t.date.startsWith(month.value)))

function groupBy(type, key) {
  const map = {}
  for (const t of monthTxs.value) if (t.type === type) map[t[key]] = (map[t[key]] || 0) + t.amount
  const total = Object.values(map).reduce((s, v) => s + v, 0)
  const rows = Object.entries(map)
    .map(([name, sum]) => ({ name, sum, share: total ? sum / total : 0 }))
    .sort((a, b) => b.sum - a.sum)
  return { total, rows }
}

const byCategory = computed(() => groupBy('expense', 'category'))
const income = computed(() => groupBy('income', 'category'))
const obligatory = computed(() =>
  monthTxs.value.filter((t) => t.type === 'expense' && t.recurringId).reduce((s, t) => s + t.amount, 0),
)

// в круге больше шести сегментов не различить — хвост сворачиваем в «Остальное».
// Цвет по порядку слотов: --series-1…6 (палитра проверена на различимость, в т.ч. при дальтонизме)
const SLOTS = 6
const incomeSlices = computed(() => {
  const rows = income.value.rows
  const head = rows.length > SLOTS ? rows.slice(0, SLOTS - 1) : rows
  const tail = rows.slice(head.length)
  const slices = head.map((r, i) => ({ ...r, color: `var(--series-${i + 1})` }))
  if (tail.length) {
    const sum = tail.reduce((s, r) => s + r.sum, 0)
    slices.push({ name: 'Остальное', sum, share: sum / income.value.total, color: 'var(--series-other)', rest: tail })
  }
  return slices
})
</script>

<template>
  <section>
    <MonthPicker v-model="month" />
    <Segmented v-model="type" :options="TYPES" class="stats-tabs" />

    <Transition :name="slide" mode="out-in">
    <div :key="month">
      <Transition :name="typeSlide" mode="out-in">
      <div v-if="type === 'expense'" key="expense">
        <p v-if="!byCategory.rows.length" class="empty">Расходов в этом месяце нет</p>
        <template v-else>
          <h2>Расходы <span class="expense">{{ money(byCategory.total) }}</span></h2>
          <p v-if="obligatory" class="hint sub">из них регулярные платежи: {{ money(obligatory) }}</p>
          <div v-for="r in byCategory.rows" :key="r.name" class="bar-row">
            <div class="bar-label">
              <span class="with-icon"><CatIcon :icon="categoryIcon(r.name, 'expense')" :size="18" />{{ r.name }}</span>
              <span>{{ money(r.sum) }} <small>{{ Math.round(r.share * 100) }}%</small></span>
            </div>
            <div class="bar"><div :style="{ width: r.share * 100 + '%' }" /></div>
          </div>
        </template>
      </div>

      <div v-else key="income">
        <p v-if="!income.rows.length" class="empty">Доходов в этом месяце нет</p>
        <template v-else>
          <h2>Доходы <span class="income">{{ money(income.total) }}</span></h2>
          <Donut v-model:selected="picked" :rows="incomeSlices" :total="income.total" />
          <!-- легенда и она же таблица значений; тап по строке выделяет сегмент -->
          <button
            v-for="s in incomeSlices" :key="s.name" class="legend-row" :class="{ active: picked === s.name, dim: picked && picked !== s.name }"
            @click="picked = picked === s.name ? '' : s.name"
          >
            <span class="swatch" :style="{ background: s.color }" />
            <span class="with-icon">
              <CatIcon v-if="!s.rest" :icon="categoryIcon(s.name, 'income')" :size="18" />{{ s.name }}
              <small v-if="s.rest">{{ s.rest.map((r) => r.name).join(', ') }}</small>
            </span>
            <span class="legend-sum">{{ money(s.sum) }} <small>{{ Math.round(s.share * 100) }}%</small></span>
          </button>
        </template>
      </div>
      </Transition>
    </div>
    </Transition>
  </section>
</template>
