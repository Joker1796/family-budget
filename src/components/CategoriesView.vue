<script setup>
import { ref, computed, watch } from 'vue'
import { categoriesOf, saveCategory, deleteCategory, moveCategory, transactions } from '../store'
import Icon from './Icon.vue'
import CatIcon from './CatIcon.vue'
import IconPicker from './IconPicker.vue'
import Segmented from './Segmented.vue'

const TYPES = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const emit = defineEmits(['back'])
const type = ref('expense')
const list = computed(() => categoriesOf(type.value))
const newName = ref('')
const newIcon = ref('tag')
const picking = ref(null) // id категории, для которой открыт выбор иконки; 'new' — для новой

watch(type, (t) => {
  picking.value = null
  newIcon.value = t === 'income' ? 'coins' : 'tag'
})

const togglePicker = (id) => (picking.value = picking.value === id ? null : id)

function setIcon(cat, icon) {
  if (icon !== cat.icon) saveCategory({ id: cat.id, icon })
  picking.value = null
}

// название применяем по уходу из поля, чтобы не синхронизировать каждую букву
function rename(cat, e) {
  const name = e.target.value.trim()
  if (!name || name === cat.name) return (e.target.value = cat.name)
  if (list.value.some((c) => c.name === name)) {
    alert('Такая категория уже есть')
    return (e.target.value = cat.name)
  }
  const used = transactions.value.filter((t) => t.category === cat.name && t.type === cat.type).length
  if (used && !confirm(`Переименовать «${cat.name}» → «${name}»? Записей с этой категорией: ${used}, они тоже переименуются.`)) {
    return (e.target.value = cat.name)
  }
  saveCategory({ id: cat.id, name })
}

function remove(cat) {
  if (confirm(`Скрыть категорию «${cat.name}»? Старые записи с ней останутся.`)) deleteCategory(cat.id)
}

function add() {
  const name = newName.value.trim()
  if (!name) return
  if (list.value.some((c) => c.name === name)) return alert('Такая категория уже есть')
  saveCategory({ name, type: type.value, icon: newIcon.value })
  newName.value = ''
  picking.value = null
}
</script>

<template>
  <section class="cats">
    <button class="back" @click="emit('back')"><Icon name="left" :size="20" />Настройки</button>
    <Segmented v-model="type" :options="TYPES" />

    <!-- при перестановке строки плавно меняются местами -->
    <TransitionGroup :key="type" name="list" tag="div" class="cat-list">
      <div v-for="(c, i) in list" :key="c.id" class="cat-item">
        <div class="cat-row">
          <button class="icon-btn" :class="{ active: picking === c.id }" aria-label="Сменить иконку" @click="togglePicker(c.id)">
            <CatIcon :icon="c.icon" :size="22" />
          </button>
          <input :value="c.name" @change="rename(c, $event)" />
          <button :disabled="i === 0" aria-label="Выше" @click="moveCategory(c.id, -1)"><Icon name="up" :size="20" /></button>
          <button :disabled="i === list.length - 1" aria-label="Ниже" @click="moveCategory(c.id, 1)"><Icon name="down" :size="20" /></button>
          <button class="danger" aria-label="Удалить" @click="remove(c)"><Icon name="trash" :size="20" /></button>
        </div>
        <Transition name="expand">
          <div v-if="picking === c.id" class="expand">
            <div><IconPicker :model-value="c.icon" @update:model-value="setIcon(c, $event)" /></div>
          </div>
        </Transition>
      </div>
    </TransitionGroup>

    <div class="cat-row">
      <button class="icon-btn" :class="{ active: picking === 'new' }" aria-label="Иконка новой категории" @click="togglePicker('new')">
        <CatIcon :icon="newIcon" :size="22" />
      </button>
      <input v-model="newName" placeholder="Новая категория" @keyup.enter="add" />
      <button class="primary wide" @click="add">Добавить</button>
    </div>
    <Transition name="expand">
      <div v-if="picking === 'new'" class="expand">
        <div><IconPicker v-model="newIcon" @update:model-value="picking = null" /></div>
      </div>
    </Transition>
    <p class="hint">Нажмите на иконку, чтобы сменить её. Порядок здесь = порядок кнопок на экране добавления.</p>
  </section>
</template>
