<script setup>
import { ref, computed } from 'vue'
import { recurring, categoryIcon } from '../store'
import { occurrences, summarize, horizon, periodLabel, estimate, dueLabel } from '../recurring'
import { money, isoMonth, shiftMonth, monthLabel, dayLabel } from '../format'
import MonthPicker from './MonthPicker.vue'
import RecurringForm from './RecurringForm.vue'
import CatIcon from './CatIcon.vue'
import { useSlide } from '../motion'
import { useBack } from '../back'

const emit = defineEmits(['pay', 'edit'])
const month = ref(isoMonth())
const slide = useSlide(month)
const editing = ref(undefined) // undefined — список, null — новый платёж, объект — редактирование
useBack(() => editing.value !== undefined, () => (editing.value = undefined))

const list = computed(() => occurrences(month.value))
const sum = computed(() => summarize(list.value))
const isCurrent = computed(() => month.value === isoMonth())
const next = computed(() => summarize(occurrences(shiftMonth(isoMonth(), 1))))
const later = computed(() => horizon())

const STATUS = { paid: '✓', overdue: '!', soon: '⏳', upcoming: '' }

function open(o) {
  if (o.paid) emit('edit', o.paid)
  else emit('pay', o)
}
</script>

<template>
  <Transition :name="editing !== undefined ? 'slide-left' : 'slide-right'" mode="out-in">
  <RecurringForm v-if="editing !== undefined" :key="editing?.id || 'new'" :rec="editing" @done="editing = undefined" />

  <section v-else>
    <MonthPicker v-model="month" />

    <Transition :name="slide" mode="out-in">
    <div :key="month">

    <div class="summary">
      <div><small>Оплачено</small><b>{{ money(sum.paid) }}</b></div>
      <div><small>Осталось</small><b class="expense">~{{ money(sum.left) }}</b></div>
      <div><small>Всего</small><b>~{{ money(sum.total) }}</b></div>
    </div>

    <p v-if="!recurring.length" class="empty">Регулярных платежей пока нет.<br />Добавьте интернет, подписки, коммуналку — приложение напомнит об оплате.</p>
    <p v-else-if="!list.length" class="empty">В этом месяце платежей нет</p>

    <button v-for="o in list" :key="o.rec.id" class="tx occ" :class="o.status" @click="open(o)">
      <CatIcon :icon="categoryIcon(o.rec.category, 'expense')" tile />
      <span class="info">
        <span>{{ o.rec.name }}</span>
        <small>
          <template v-if="o.paid">оплачено {{ dayLabel(o.paid.date).toLowerCase() }}</template>
          <template v-else>{{ isCurrent || o.days <= 31 ? dueLabel(o.days) : dayLabel(o.due) }}</template>
        </small>
      </span>
      <b>
        <span class="status">{{ STATUS[o.status] }}</span>
        {{ !o.paid && o.rec.kind === 'variable' ? '~' : '' }}{{ money(o.amount) }}
      </b>
    </button>

    <template v-if="isCurrent && recurring.length">
      <button class="forecast" @click="month = shiftMonth(month, 1)">
        <span>Прогноз на {{ monthLabel(shiftMonth(month, 1)).toLowerCase() }}</span>
        <b>~{{ money(next.total) }}</b>
      </button>

      <template v-if="later.length">
        <h3>Редкие платежи впереди</h3>
        <div v-for="o in later" :key="o.rec.id + o.month" class="tx static">
          <CatIcon :icon="categoryIcon(o.rec.category, 'expense')" tile />
          <span class="info"><span>{{ o.rec.name }}</span><small>{{ dueLabel(o.days) }}, {{ dayLabel(o.due).toLowerCase() }}</small></span>
          <b>{{ money(o.amount) }}</b>
        </div>
      </template>
    </template>

    </div>
    </Transition>

    <h3>Все регулярные платежи</h3>
    <TransitionGroup name="list" tag="div" class="tg">
    <button v-for="r in recurring" :key="r.id" class="tx" @click="editing = r">
      <CatIcon :icon="categoryIcon(r.category, 'expense')" tile />
      <span class="info"><span>{{ r.name }}</span><small>{{ periodLabel(r) }}{{ r.kind === 'variable' ? ' · плавающая' : '' }}</small></span>
      <b>{{ r.kind === 'variable' ? '~' : '' }}{{ money(estimate(r)) }}</b>
    </button>
    </TransitionGroup>
    <button class="add-btn" @click="editing = null">+ Добавить платёж</button>
  </section>
  </Transition>
</template>
