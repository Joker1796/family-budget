<script setup>
import { ref, computed, watch } from 'vue'
import { recurring, categoryIcon } from '../store'
import { occurrences, summarize, horizon, periodLabel, estimate, dueLabel, mortgageSummary } from '../recurring'
import { money, isoMonth, shiftMonth, monthLabel, dayLabel } from '../format'
import MonthPicker from './MonthPicker.vue'
import RecurringForm from './RecurringForm.vue'
import CatIcon from './CatIcon.vue'
import Icon from './Icon.vue'
import { useSlide } from '../motion'
import { useBack } from '../back'

const emit = defineEmits(['pay', 'edit'])
const month = ref(isoMonth())
const slide = useSlide(month)
const managing = ref(false) // список всех платежей для правки
const editing = ref(undefined) // undefined — список, null — новый платёж, объект — редактирование
useBack(managing, () => (managing.value = false))
useBack(() => editing.value !== undefined, () => (editing.value = undefined))

// чем глубже экран, тем «правее»: месяц → список платежей → форма
const level = computed(() => (editing.value !== undefined ? 2 : managing.value ? 1 : 0))
const screenSlide = ref('slide-left')
watch(level, (to, from) => (screenSlide.value = to > from ? 'slide-left' : 'slide-right'))

const list = computed(() => occurrences(month.value))
const sum = computed(() => summarize(list.value))
const isCurrent = computed(() => month.value === isoMonth())
const next = computed(() => summarize(occurrences(shiftMonth(isoMonth(), 1))))
const later = computed(() => horizon())
const mortgages = computed(() =>
  recurring.value.filter((r) => r.kind === 'mortgage').map((rec) => ({ rec, sum: mortgageSummary(rec) })).filter((m) => m.sum),
)

const STATUS = { paid: 'check', overdue: 'alert', soon: 'hourglass' } // иконка статуса; у upcoming её нет

function open(o) {
  if (o.paid) emit('edit', o.paid)
  else emit('pay', o)
}
</script>

<template>
  <Transition :name="screenSlide" mode="out-in">
  <RecurringForm v-if="editing !== undefined" :key="editing?.id || 'new'" :rec="editing" @done="editing = undefined" />

  <section v-else-if="managing" key="manage" class="manage">
    <button class="back" @click="managing = false"><Icon name="left" :size="20" />Платежи</button>
    <TransitionGroup name="list" tag="div" class="tg">
    <button v-for="r in recurring" :key="r.id" class="tx" @click="editing = r">
      <CatIcon :icon="categoryIcon(r.category, 'expense')" tile />
      <span class="info"><span>{{ r.name }}</span><small>{{ periodLabel(r) }}{{ r.kind === 'variable' ? ' · плавающая' : '' }}</small></span>
      <b>{{ r.kind === 'variable' ? '~' : '' }}{{ money(estimate(r)) }}</b>
    </button>
    </TransitionGroup>
    <button class="add-btn" @click="editing = null">+ Добавить платёж</button>
  </section>

  <section v-else key="month">
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
        <Icon v-if="STATUS[o.status]" :name="STATUS[o.status]" :size="18" class="status" />
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

    <template v-for="m in mortgages" :key="m.rec.id">
      <h3>{{ m.rec.name }}</h3>
      <div class="summary">
        <div><small>По графику</small><b>{{ money(m.sum.scheduled) }}</b></div>
        <div><small>Снизился на</small><b class="income">{{ money(m.sum.drop) }}</b></div>
        <div><small>Досрочно</small><b>{{ money(m.sum.extraTotal) }}</b></div>
      </div>
    </template>

    <div class="add-row">
      <button class="add-btn" @click="editing = null">+ Добавить платёж</button>
      <button v-if="recurring.length" class="add-btn" @click="managing = true">Изменить платежи</button>
    </div>
  </section>
  </Transition>
</template>
