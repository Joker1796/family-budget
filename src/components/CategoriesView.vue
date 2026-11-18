<script setup>
import { ref, computed, watch } from 'vue'
import { categoriesOf, saveCategory, deleteCategory, moveCategory, siblingsOf, parentOptions, hasChildren, isNamesake, setCategoryParent, transactions } from '../store'
import Icon from './Icon.vue'
import CatIcon from './CatIcon.vue'
import IconPicker from './IconPicker.vue'
import Segmented from './Segmented.vue'
import Select from './Select.vue'

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

// подтип — категория дохода с живым родителем; в Итогах она складывается в родителя
const isChild = (c) => Boolean(c.parent) && !list.value.every((x) => x.id !== c.parent)
const position = (c) => {
  const sibs = siblingsOf(c.id)
  return { first: sibs[0]?.id === c.id, last: sibs.at(-1)?.id === c.id }
}
const parentChoices = (c) => [
  { value: '', label: 'Сама по себе' },
  ...parentOptions(c).map((p) => ({ value: p.id, label: p.name, icon: p.icon })),
]
function setParent(c, parent) {
  if (parent !== (isChild(c) ? c.parent : '')) setCategoryParent(c.id, parent)
  picking.value = null
}

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
  const note = hasChildren(cat.id) ? ' Её подтипы станут самостоятельными.' : ''
  if (confirm(`Скрыть категорию «${cat.name}»? Старые записи с ней останутся.${note}`)) deleteCategory(cat.id)
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
      <div v-for="c in list" :key="c.id" class="cat-item" :class="{ child: isChild(c) }">
        <div class="cat-row">
          <Icon v-if="isChild(c)" name="sub" :size="18" class="cat-sub-mark" />
          <button class="icon-btn" :class="{ active: picking === c.id }" aria-label="Сменить иконку" @click="togglePicker(c.id)">
            <CatIcon :icon="c.icon" :size="22" />
          </button>
          <!-- тёзка носит имя источника — подпись вместо поля, чтобы строка не выглядела дублем;
               если переименовать источник, тёзка перестанет быть тёзкой и получит обычное поле -->
          <div v-if="isNamesake(c)" class="cat-name-fixed"><span>{{ c.name }}</span><small>без подтипа</small></div>
          <input v-else :value="c.name" @change="rename(c, $event)" />
          <button :disabled="position(c).first" aria-label="Выше" @click="moveCategory(c.id, -1)"><Icon name="up" :size="20" /></button>
          <button :disabled="position(c).last" aria-label="Ниже" @click="moveCategory(c.id, 1)"><Icon name="down" :size="20" /></button>
          <button class="danger" aria-label="Удалить" @click="remove(c)"><Icon name="trash" :size="20" /></button>
        </div>
        <!-- тап по иконке: у дохода сверху «Входит в» (подтип источника), ниже — выбор иконки -->
        <Transition name="expand">
          <div v-if="picking === c.id" class="expand">
            <div class="cat-panel">
              <div v-if="type === 'income'" class="nest-panel">
                <p v-if="hasChildren(c.id)" class="hint">
                  «{{ c.name }}» — источник с подтипами: записи вносятся только в подтипы, сам он подтипом быть не может.
                </p>
                <p v-else-if="isNamesake(c)" class="hint">
                  Наследник: к нему относятся записи «{{ c.name }}» до разделения. Исчезнет сам, когда других подтипов не останется.
                </p>
                <template v-else>
                  <span class="hint">Входит в</span>
                  <Select :model-value="isChild(c) ? c.parent : ''" :options="parentChoices(c)" @update:model-value="setParent(c, $event)" />
                </template>
              </div>
              <IconPicker :model-value="c.icon" @update:model-value="setIcon(c, $event)" />
            </div>
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
    <p v-if="type === 'income'" class="hint">
      Там же, по тапу на иконку, доход можно сделать подтипом другого («Входит в»): в Итогах подтипы сложатся в один источник, а по тапу раскроются.
    </p>
  </section>
</template>
