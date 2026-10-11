<script setup>
import { computed } from 'vue'
import { transactions, categoryIcon } from '../store'
import CatIcon from './CatIcon.vue'
import { money } from '../format'
import MonthPicker from './MonthPicker.vue'
import { useSlide } from '../motion'

const month = defineModel('month', { type: String, required: true })

const slide = useSlide(month)

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
</script>

<template>
  <section>
    <MonthPicker v-model="month" />

    <Transition :name="slide" mode="out-in">
    <p v-if="!monthTxs.length" :key="month + '-empty'" class="empty">В этом месяце записей нет</p>

    <div v-else :key="month">
      <h2>Расходы <span class="expense">{{ money(byCategory.total) }}</span></h2>
      <p v-if="obligatory" class="hint sub">из них регулярные платежи: {{ money(obligatory) }}</p>
      <div v-for="r in byCategory.rows" :key="r.name" class="bar-row">
        <div class="bar-label">
          <span class="with-icon"><CatIcon :icon="categoryIcon(r.name, 'expense')" :size="18" />{{ r.name }}</span>
          <span>{{ money(r.sum) }} <small>{{ Math.round(r.share * 100) }}%</small></span>
        </div>
        <div class="bar"><div :style="{ width: r.share * 100 + '%' }" /></div>
      </div>

      <h2>Доходы <span class="income">{{ money(income.total) }}</span></h2>
      <div v-for="r in income.rows" :key="r.name" class="bar-label plain">
        <span class="with-icon"><CatIcon :icon="categoryIcon(r.name, 'income')" :size="18" />{{ r.name }}</span><span>{{ money(r.sum) }}</span>
      </div>
    </div>
    </Transition>
  </section>
</template>
