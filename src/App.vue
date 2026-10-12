<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { state, isConfigured, sync } from './store'
import { isoMonth, isoDate } from './format'
import AddView from './components/AddView.vue'
import ListView from './components/ListView.vue'
import PaymentsView from './components/PaymentsView.vue'
import StatsView from './components/StatsView.vue'
import SettingsView from './components/SettingsView.vue'
import SavingsView from './components/SavingsView.vue'
import Reminders from './components/Reminders.vue'
import Icon from './components/Icon.vue'

const tab = ref(isConfigured.value ? 'add' : 'settings')
const month = ref(isoMonth())
const listFilter = ref('') // фильтр «Трат» по категории — живёт, пока открыто приложение
const editing = ref(null) // транзакция, открытая на редактирование
const draft = ref(null) // предзаполненная новая трата — оплата регулярного платежа
let returnTab = 'list' // куда вернуться после редактирования/оплаты

const tabs = [
  { id: 'list', icon: 'list', label: 'Траты' },
  { id: 'payments', icon: 'calendar', label: 'Платежи' },
  { id: 'add', icon: 'plus', label: 'Добавить' },
  { id: 'stats', icon: 'chart', label: 'Итоги' },
  { id: 'savings', icon: 'savings', label: 'Копилки' },
]

// экран выезжает с той стороны, куда переходим по меню; настройки (кнопка в шапке) — «правее» всех
const slide = ref('slide-left')
watch(tab, (to, from) => {
  const order = [...tabs.map((t) => t.id), 'settings']
  slide.value = order.indexOf(to) >= order.indexOf(from) ? 'slide-left' : 'slide-right'
})

function openTab(id) {
  editing.value = null
  draft.value = null
  tab.value = id
}

function edit(tx) {
  returnTab = tab.value
  editing.value = tx
  tab.value = 'add'
}

function pay(o) {
  returnTab = tab.value === 'add' ? 'payments' : tab.value
  draft.value = {
    type: 'expense',
    category: o.rec.category,
    comment: o.rec.name,
    amount: o.amount,
    date: isoDate(),
    recurringId: o.rec.id,
    period: o.month,
  }
  editing.value = null
  tab.value = 'add'
}

function closeEditor() {
  if (editing.value || draft.value) openTab(returnTab)
}

// синхронизируемся при открытии, возврате в приложение, появлении сети и раз в минуту
const onVisible = () => document.visibilityState === 'visible' && sync()
let timer
onMounted(() => {
  sync()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', sync)
  timer = setInterval(onVisible, 60_000)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('online', sync)
  clearInterval(timer)
})
</script>

<template>
  <header class="topbar">
    <span class="title">Семейный бюджет</span>
    <div class="topbar-actions">
      <button class="sync" :class="{ spinning: state.syncing, error: state.error }" :title="state.error || 'Синхронизировать'" @click="sync()">
        <Icon name="sync" :size="22" />
        <Transition name="pop"><span v-if="state.queue.length" class="badge">{{ state.queue.length }}</span></Transition>
      </button>
      <button class="sync" :class="{ active: tab === 'settings' }" aria-label="Настройки" title="Настройки" @click="openTab('settings')">
        <Icon name="settings" :size="22" />
      </button>
    </div>
  </header>
  <Transition name="expand">
    <div v-if="state.error" class="expand"><div><div class="banner">{{ state.error }}</div></div></div>
  </Transition>

  <main>
    <Transition :name="slide" mode="out-in">
    <div v-if="tab === 'add'" key="add">
      <Reminders v-if="!editing && !draft" @pay="pay" />
      <AddView
        :key="editing?.id || (draft && draft.recurringId + draft.period) || 'new'"
        :tx="editing"
        :draft="draft"
        @saved="closeEditor"
        @cancel="closeEditor"
      />
    </div>
    <ListView v-else-if="tab === 'list'" key="list" v-model:month="month" v-model:filter="listFilter" @edit="edit" />
    <PaymentsView v-else-if="tab === 'payments'" key="payments" @pay="pay" @edit="edit" />
    <StatsView v-else-if="tab === 'stats'" key="stats" v-model:month="month" />
    <SavingsView v-else-if="tab === 'savings'" key="savings" />
    <SettingsView v-else key="settings" @done="openTab('add')" />
    </Transition>
  </main>

  <nav class="tabbar">
    <button v-for="t in tabs" :key="t.id" :class="{ active: tab === t.id, 'add-tab': t.id === 'add' }" :disabled="!isConfigured" @click="openTab(t.id)">
      <span class="tab-icon"><Icon :name="t.icon" :size="t.id === 'add' ? 30 : 26" /></span>{{ t.label }}
    </button>
  </nav>
</template>
