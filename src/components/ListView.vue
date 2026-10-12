<script setup>
import { computed } from 'vue'
import { transactions, categories, categoryIcon } from '../store'
import CatIcon from './CatIcon.vue'
import { money, dayLabel } from '../format'
import MonthPicker from './MonthPicker.vue'
import Select from './Select.vue'
import { useSlide } from '../motion'

const month = defineModel('month', { type: String, required: true })
// фильтр по категории: '' — все, иначе 'expense:Покупки' (одно название может быть и у расхода, и у дохода)
const filter = defineModel('filter', { type: String, default: '' })
const emit = defineEmits(['edit'])
const slide = useSlide(month)

const keyOf = (t) => `${t.type}:${t.category}`

// сначала расходы, потом доходы; в конце — скрытые категории, если по ним есть записи
const filterOptions = computed(() => {
  const opts = [{ value: '', label: 'Все категории' }]
  for (const type of ['expense', 'income']) {
    const names = categories.value.filter((c) => c.type === type).map((c) => c.name)
    for (const t of transactions.value) if (t.type === type && !names.includes(t.category)) names.push(t.category)
    for (const name of names) {
      opts.push({ value: `${type}:${name}`, label: type === 'income' ? `${name} (доход)` : name, icon: categoryIcon(name, type) || 'tag' })
    }
  }
  return opts
})
const filterType = computed(() => filter.value.split(':')[0])

const monthTxs = computed(() =>
  transactions.value.filter((t) => t.date.startsWith(month.value) && (!filter.value || keyOf(t) === filter.value)),
)

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
    <Select v-model="filter" :options="filterOptions" class="list-filter" />

    <Transition :name="slide" mode="out-in">
    <div :key="month">
    <div v-if="filter" class="summary pair">
      <div><small>Записей</small><b>{{ monthTxs.length }}</b></div>
      <div><small>Сумма</small><b :class="filterType">{{ money(totals[filterType]) }}</b></div>
    </div>
    <div v-else class="summary">
      <div><small>Расход</small><b class="expense">{{ money(totals.expense) }}</b></div>
      <div><small>Доход</small><b class="income">{{ money(totals.income) }}</b></div>
      <div><small>Баланс</small><b>{{ money(totals.income - totals.expense) }}</b></div>
    </div>

    <Transition name="fade"><p v-if="!days.length" class="empty">{{ filter ? 'В этом месяце записей в категории нет' : 'В этом месяце записей нет' }}</p></Transition>

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
