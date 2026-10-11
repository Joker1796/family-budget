<script setup>
import { ref, computed, onMounted } from 'vue'
import { categoriesOf, saveTx, deleteTx } from '../store'
import { isoDate, parseAmount, money } from '../format'
import CatIcon from './CatIcon.vue'
import Segmented from './Segmented.vue'
import DateField from './DateField.vue'

const TYPES = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
]

// tx — редактирование существующей записи, draft — предзаполненная новая (оплата регулярного платежа)
const props = defineProps({ tx: { type: Object, default: null }, draft: { type: Object, default: null } })
const emit = defineEmits(['saved', 'cancel'])

const init = props.tx ?? props.draft ?? {}

const type = ref(init.type ?? 'expense')
const amountStr = ref(init.amount ? String(init.amount) : '')
const category = ref(init.category ?? '')
const comment = ref(init.comment ?? '')
const date = ref(init.date ?? isoDate())
const flash = ref('')
const saved = ref(null) // последняя сохранённая запись — для «Отменить»
const justSaved = ref(false) // кнопка на секунду показывает «Сохранено»
const amountInput = ref(null)
let flashTimer, savedTimer

const categories = computed(() => categoriesOf(type.value))
const amount = computed(() => parseAmount(amountStr.value))
const ready = computed(() => Boolean(amount.value && category.value))

// подсказка на кнопке: чего не хватает или что именно сохранится
const saveLabel = computed(() => {
  if (justSaved.value) return 'Сохранено'
  if (!amount.value && !category.value) return 'Введите сумму и выберите категорию'
  if (!amount.value) return 'Введите сумму'
  if (!category.value) return 'Выберите категорию'
  return `Сохранить ${money(amount.value)}`
})

onMounted(() => !props.tx && amountInput.value?.focus())

function setType(t) {
  type.value = t
  category.value = ''
}

// повторный тап снимает выбор
function pick(name) {
  justSaved.value = false
  category.value = category.value === name ? '' : name
  if (!amount.value) amountInput.value?.focus()
}

function showFlash(text, tx = null) {
  clearTimeout(flashTimer)
  flash.value = text
  saved.value = tx
  flashTimer = setTimeout(() => {
    flash.value = ''
    saved.value = null
  }, 5000)
}

function save() {
  if (!amount.value) {
    amountInput.value?.focus()
    return showFlash('Введите сумму')
  }
  if (!category.value) return showFlash('Выберите категорию')
  const fields = { type: type.value, amount: amount.value, category: category.value, comment: comment.value.trim(), date: date.value }
  if (props.tx) fields.id = props.tx.id
  if (props.draft) Object.assign(fields, { recurringId: props.draft.recurringId, period: props.draft.period })
  const tx = saveTx(fields)
  if (props.tx || props.draft) return emit('saved')
  showFlash(`Сохранено: ${tx.category}, ${money(tx.amount)}`, tx)
  clearTimeout(savedTimer)
  justSaved.value = true
  savedTimer = setTimeout(() => (justSaved.value = false), 1500)
  amountStr.value = ''
  comment.value = ''
  category.value = ''
  amountInput.value?.focus()
  emit('saved')
}

function undo() {
  deleteTx(saved.value.id)
  showFlash('Запись удалена')
}

function remove() {
  if (!confirm('Удалить запись?')) return
  deleteTx(props.tx.id)
  emit('saved')
}
</script>

<template>
  <section class="add">
    <p v-if="draft" class="draft-title">Оплата: {{ draft.comment }}</p>
    <Segmented v-else :model-value="type" :options="TYPES" @update:model-value="setType" />

    <input ref="amountInput" v-model="amountStr" class="amount" :class="type" inputmode="decimal" enterkeyhint="done" placeholder="0 ₽" @input="justSaved = false" @keyup.enter="save" />

    <div class="row">
      <input v-model="comment" placeholder="Комментарий" @keyup.enter="save" />
      <DateField v-model="date" align="right" />
    </div>

    <p class="flash" :class="{ ok: saved }">
      <Transition name="fade" mode="out-in">
        <span :key="flash">
          {{ flash }}
          <button v-if="saved" class="link" @click="undo">Отменить</button>
        </span>
      </Transition>
    </p>

    <Transition name="fade" mode="out-in">
      <div :key="type" class="categories">
        <button v-for="c in categories" :key="c.id" :class="{ active: category === c.name }" @click="pick(c.name)">
          <CatIcon :icon="c.icon" :size="32" />{{ c.name }}
        </button>
      </div>
    </Transition>

    <div class="actions save-bar">
      <button class="primary" :class="{ waiting: !ready && !justSaved, done: justSaved }" @click="save">
        <Transition name="fade" mode="out-in"><span :key="justSaved">{{ tx ? 'Сохранить' : saveLabel }}</span></Transition>
      </button>
      <button v-if="tx || draft" @click="emit('cancel')">Отмена</button>
      <button v-if="tx" class="danger" @click="remove">Удалить</button>
    </div>
  </section>
</template>
