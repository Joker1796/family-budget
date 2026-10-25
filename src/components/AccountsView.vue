<script setup>
import { ref } from 'vue'
import { accounts, saveAccount, deleteAccount, moveAccount } from '../store'
import Icon from './Icon.vue'
import CatIcon from './CatIcon.vue'
import IconPicker from './IconPicker.vue'
import Segmented from './Segmented.vue'
import DateField from './DateField.vue'
import { isoDate } from '../format'

// Редактор списка счетов копилки — устроен как редактор категорий
const emit = defineEmits(['back'])
const newName = ref('')
const newIcon = ref('piggy-bank')
const picking = ref(null) // id счёта, для которого открыт выбор иконки; 'new' — для нового

const locking = ref(null) // id счёта, для которого открыты настройки блокировки

const togglePicker = (id) => (picking.value = picking.value === id ? null : id)
const toggleLock = (id) => (locking.value = locking.value === id ? null : id)

// блокировка: можно снять в любой момент / нельзя бессрочно / нельзя до даты
const LOCKS = [
  { value: 'free', label: 'Свободный' },
  { value: 'forever', label: 'Бессрочно' },
  { value: 'until', label: 'До даты' },
]
const lockMode = (a) => (!a.locked ? 'free' : a.lockedUntil ? 'until' : 'forever')

function setLock(acc, mode) {
  if (mode === lockMode(acc)) return
  if (mode === 'free') return saveAccount({ id: acc.id, locked: false })
  if (mode === 'forever') return saveAccount({ id: acc.id, locked: true, lockedUntil: '' })
  // срок по умолчанию — через год (типичный вклад), дальше поправят в календаре
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  saveAccount({ id: acc.id, locked: true, lockedUntil: acc.lockedUntil || isoDate(d) })
}

function setIcon(acc, icon) {
  if (icon !== acc.icon) saveAccount({ id: acc.id, icon })
  picking.value = null
}

// название применяем по уходу из поля, чтобы не синхронизировать каждую букву
function rename(acc, e) {
  const name = e.target.value.trim()
  if (!name || name === acc.name) return (e.target.value = acc.name)
  if (accounts.value.some((a) => a.name === name)) {
    alert('Такой счёт уже есть')
    return (e.target.value = acc.name)
  }
  saveAccount({ id: acc.id, name })
}

function remove(acc) {
  if (confirm(`Удалить счёт «${acc.name}»? Его операции останутся в истории.`)) deleteAccount(acc.id)
}

function add() {
  const name = newName.value.trim()
  if (!name) return
  if (accounts.value.some((a) => a.name === name)) return alert('Такой счёт уже есть')
  saveAccount({ name, icon: newIcon.value })
  newName.value = ''
  picking.value = null
}
</script>

<template>
  <section class="cats">
    <button class="back" @click="emit('back')"><Icon name="left" :size="20" />Копилки</button>

    <TransitionGroup name="list" tag="div" class="cat-list">
      <div v-for="(a, i) in accounts" :key="a.id" class="cat-item">
        <div class="cat-row">
          <button class="icon-btn" :class="{ active: picking === a.id }" aria-label="Сменить иконку" @click="togglePicker(a.id)">
            <CatIcon :icon="a.icon" :size="22" />
          </button>
          <input :value="a.name" @change="rename(a, $event)" />
          <button :class="{ active: locking === a.id, locked: a.locked }" aria-label="Блокировка" @click="toggleLock(a.id)">
            <Icon :name="a.locked ? 'lock' : 'unlock'" :size="20" />
          </button>
          <button :disabled="i === 0" aria-label="Выше" @click="moveAccount(a.id, -1)"><Icon name="up" :size="20" /></button>
          <button :disabled="i === accounts.length - 1" aria-label="Ниже" @click="moveAccount(a.id, 1)"><Icon name="down" :size="20" /></button>
          <button class="danger" aria-label="Удалить" @click="remove(a)"><Icon name="trash" :size="20" /></button>
        </div>
        <Transition name="expand">
          <div v-if="picking === a.id" class="expand">
            <div><IconPicker :model-value="a.icon" @update:model-value="setIcon(a, $event)" /></div>
          </div>
        </Transition>
        <Transition name="expand">
          <div v-if="locking === a.id" class="expand">
            <div class="lock-panel">
              <small>Можно ли снять деньги в любой момент?</small>
              <Segmented :model-value="lockMode(a)" :options="LOCKS" @update:model-value="setLock(a, $event)" />
              <Transition name="expand">
                <div v-if="a.locked && a.lockedUntil" class="expand"><div>
                  <div class="field">Заблокирован до<DateField :model-value="a.lockedUntil" @update:model-value="saveAccount({ id: a.id, lockedUntil: $event })" /></div>
                  <small v-if="a.lockedUntil <= isoDate()" class="hint">Срок прошёл — счёт считается свободным.</small>
                </div></div>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </TransitionGroup>

    <div class="cat-row">
      <button class="icon-btn" :class="{ active: picking === 'new' }" aria-label="Иконка нового счёта" @click="togglePicker('new')">
        <CatIcon :icon="newIcon" :size="22" />
      </button>
      <input v-model="newName" placeholder="Новый счёт: вклад, накопительный…" @keyup.enter="add" />
      <button class="primary wide" @click="add">Добавить</button>
    </div>
    <Transition name="expand">
      <div v-if="picking === 'new'" class="expand">
        <div><IconPicker v-model="newIcon" @update:model-value="picking = null" /></div>
      </div>
    </Transition>
    <p class="hint">Остаток вносится на экране копилок: нажмите на счёт. Замок — если деньги нельзя снять в любой момент (вклад).</p>
  </section>
</template>
