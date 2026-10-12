<script setup>
import { ref } from 'vue'
import { accounts, saveAccount, deleteAccount, moveAccount } from '../store'
import Icon from './Icon.vue'
import CatIcon from './CatIcon.vue'
import IconPicker from './IconPicker.vue'

// Редактор списка счетов копилки — устроен как редактор категорий
const emit = defineEmits(['back'])
const newName = ref('')
const newIcon = ref('piggy-bank')
const picking = ref(null) // id счёта, для которого открыт выбор иконки; 'new' — для нового

const togglePicker = (id) => (picking.value = picking.value === id ? null : id)

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
          <button :disabled="i === 0" aria-label="Выше" @click="moveAccount(a.id, -1)"><Icon name="up" :size="20" /></button>
          <button :disabled="i === accounts.length - 1" aria-label="Ниже" @click="moveAccount(a.id, 1)"><Icon name="down" :size="20" /></button>
          <button class="danger" aria-label="Удалить" @click="remove(a)"><Icon name="trash" :size="20" /></button>
        </div>
        <Transition name="expand">
          <div v-if="picking === a.id" class="expand">
            <div><IconPicker :model-value="a.icon" @update:model-value="setIcon(a, $event)" /></div>
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
    <p class="hint">Остаток вносится на экране копилок: нажмите на счёт.</p>
  </section>
</template>
