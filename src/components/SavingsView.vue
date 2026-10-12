<script setup>
import { ref, computed } from 'vue'
import { accounts, savings } from '../store'
import { ledger, accountOf } from '../savings'
import { money, dayLabel } from '../format'
import CatIcon from './CatIcon.vue'
import Segmented from './Segmented.vue'
import Select from './Select.vue'
import SavingForm from './SavingForm.vue'
import AccountsView from './AccountsView.vue'
import { useSlide } from '../motion'

const TABS = [
  { value: 'accounts', label: 'Счета' },
  { value: 'history', label: 'История' },
]

const tab = ref('accounts')
const tabSlide = useSlide(tab) // accounts < history — история «правее»
// null — список; 'accounts' — редактор счетов; { accountId } — новая операция; { item } — правка операции
const screen = ref(null)
const filter = ref('') // история по одному счёту

const total = computed(() => accounts.value.reduce((s, a) => s + (ledger.value.balance[a.id] ?? 0), 0))

const filterOptions = computed(() => [
  { value: '', label: 'Все счета' },
  ...accounts.value.map((a) => ({ value: a.id, label: a.name, icon: a.icon })),
])

const days = computed(() => {
  const groups = []
  for (const s of savings.value) {
    if (filter.value && s.accountId !== filter.value) continue
    if (groups.at(-1)?.date !== s.date) groups.push({ date: s.date, items: [] })
    groups.at(-1).items.push(s)
  }
  return groups
})

const change = (s) => {
  const step = ledger.value.steps[s.id]
  return step ? step.after - step.before : 0
}
const signed = (n) => `${n < 0 ? '−' : '+'}${money(Math.abs(Math.round(n * 100) / 100))}`

function note(s) {
  const after = money(ledger.value.steps[s.id]?.after ?? 0)
  return [s.kind === 'set' ? `уточнили остаток: ${after}` : `остаток ${after}`, s.comment].filter(Boolean).join(' · ')
}

const screenKey = computed(() => (screen.value === 'accounts' ? 'accounts' : screen.value?.item?.id ?? screen.value?.accountId ?? 'new'))
</script>

<template>
  <Transition :name="screen ? 'slide-left' : 'slide-right'" mode="out-in">
  <AccountsView v-if="screen === 'accounts'" key="accounts" @back="screen = null" />
  <SavingForm v-else-if="screen" :key="screenKey" :item="screen.item" :account-id="screen.accountId" @done="screen = null" />

  <section v-else>
    <Segmented v-model="tab" :options="TABS" />

    <Transition :name="tabSlide" mode="out-in">
    <div v-if="tab === 'accounts'" key="accounts">
      <div class="summary single">
        <div><small>Всего на счетах</small><b>{{ money(total) }}</b></div>
      </div>

      <p v-if="!accounts.length" class="empty">Счетов пока нет.<br />Добавьте вклады и накопительные счета, чтобы следить за остатками.</p>

      <TransitionGroup name="list" tag="div" class="tg">
      <button v-for="a in accounts" :key="a.id" class="tx" @click="screen = { accountId: a.id }">
        <CatIcon :icon="a.icon" tile />
        <span class="info">
          <span>{{ a.name }}</span>
          <small>{{ ledger.last[a.id] ? `обновлено ${dayLabel(ledger.last[a.id]).toLowerCase()}` : 'нажмите, чтобы внести остаток' }}</small>
        </span>
        <b>{{ money(ledger.balance[a.id] ?? 0) }}</b>
      </button>
      </TransitionGroup>
      <button class="add-btn" @click="screen = 'accounts'">{{ accounts.length ? 'Изменить список счетов' : '+ Добавить счёт' }}</button>
    </div>

    <div v-else key="history">
      <Select v-if="accounts.length > 1" v-model="filter" :options="filterOptions" class="list-filter" />

      <Transition name="fade"><p v-if="!days.length" class="empty">Операций пока нет</p></Transition>

      <TransitionGroup name="list" tag="div" class="tg">
      <div v-for="d in days" :key="d.date" class="day">
        <h3>{{ dayLabel(d.date) }}</h3>
        <TransitionGroup name="list" tag="div" class="tg">
        <button v-for="s in d.items" :key="s.id" class="tx" @click="screen = { item: s }">
          <CatIcon :icon="accountOf(s.accountId).icon" tile />
          <span class="info">
            <span>{{ accountOf(s.accountId).name }}</span>
            <small>{{ note(s) }}</small>
          </span>
          <b :class="change(s) < 0 ? 'expense' : change(s) > 0 ? 'income' : ''">{{ signed(change(s)) }}</b>
        </button>
        </TransitionGroup>
      </div>
      </TransitionGroup>
      <button v-if="accounts.length" class="add-btn" @click="screen = { accountId: filter }">+ Добавить операцию</button>
    </div>
    </Transition>
  </section>
  </Transition>
</template>
