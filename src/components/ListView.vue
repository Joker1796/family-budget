<script setup>
import { computed } from 'vue'
import { transactions, categoryIcon } from '../store'
import CatIcon from './CatIcon.vue'
import { money, dayLabel } from '../format'
import MonthPicker from './MonthPicker.vue'
import { useSlide } from '../motion'

const month = defineModel('month', { type: String, required: true })
const emit = defineEmits(['edit'])
const slide = useSlide(month)

const monthTxs = computed(() => transactions.value.filter((t) => t.date.startsWith(month.value)))

const totals = computed(() => {
  const sum = (type) => monthTxs.value.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)
  return { expense: sum('expense'), income: sum('income') }
})

const days = computed(() => {
  const groups = []
  for (const t of monthTxs.value) {
    if (groups.at(-1)?.date !== t.date) groups.push({ date: t.date, items: [] })
    groups.at(-1).items.push(t)
  }
  return groups
})
</script>

<template>
  <section>
    <MonthPicker v-model="month" />

    <Transition :name="slide" mode="out-in">
    <div :key="month">
    <div class="summary">
      <div><small>Расход</small><b class="expense">{{ money(totals.expense) }}</b></div>
      <div><small>Доход</small><b class="income">{{ money(totals.income) }}</b></div>
      <div><small>Баланс</small><b>{{ money(totals.income - totals.expense) }}</b></div>
    </div>

    <Transition name="fade"><p v-if="!days.length" class="empty">В этом месяце записей нет</p></Transition>

    <TransitionGroup name="list" tag="div" class="tg">
    <div v-for="d in days" :key="d.date" class="day">
      <h3>{{ dayLabel(d.date) }}</h3>
      <TransitionGroup name="list" tag="div" class="tg">
      <button v-for="t in d.items" :key="t.id" class="tx" @click="emit('edit', t)">
        <CatIcon :icon="categoryIcon(t.category, t.type)" tile />
        <span class="info">
          <span>{{ t.category }}</span>
          <small v-if="t.comment">{{ t.comment }}</small>
        </span>
        <b :class="t.type"><span v-if="t.recurringId" class="rec-mark" title="Регулярный платёж">↻</span>{{ t.type === 'income' ? '+' : '−' }}{{ money(t.amount) }}</b>
      </button>
      </TransitionGroup>
    </div>
    </TransitionGroup>
    </div>
    </Transition>
  </section>
</template>
