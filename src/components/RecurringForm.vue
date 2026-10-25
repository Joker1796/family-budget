<script setup>
import { reactive, ref, computed } from 'vue'
import { categoriesOf, saveRecurring, deleteRecurring } from '../store'
import { isoMonth, parseAmount } from '../format'
import Segmented from './Segmented.vue'
import Select from './Select.vue'
import DateField from './DateField.vue'
import AmountInput from './AmountInput.vue'

const KINDS = [
  { value: 'fixed', label: 'Фиксированная' },
  { value: 'variable', label: 'Плавающая' },
]

const props = defineProps({ rec: { type: Object, default: null } })
const emit = defineEmits(['done'])

const PERIODS = [
  { value: 1, label: 'Каждый месяц' },
  { value: 12, label: 'Раз в год' },
  { value: 0, label: 'Раз в N месяцев' },
]

const r = props.rec
const form = reactive({
  name: r?.name ?? '',
  category: r?.category ?? categoriesOf('expense')[0]?.name ?? '',
  kind: r?.kind ?? 'fixed',
  amount: r ? String(r.amount) : '',
  period: r ? ([1, 12].includes(r.everyMonths) ? r.everyMonths : 0) : 1,
  every: r && ![1, 12].includes(r.everyMonths) ? r.everyMonths : 3,
  day: r?.day ?? new Date().getDate(),
  startMonth: r?.startMonth ?? isoMonth(),
})
const error = ref('')

const startLabel = computed(() => (form.period === 1 ? 'Начиная с месяца' : form.period === 12 ? 'Месяц платежа' : 'Первый платёж в месяце'))

function save() {
  const amount = parseAmount(form.amount)
  const day = Math.round(Number(form.day))
  const everyMonths = form.period || Math.round(Number(form.every))
  if (!form.name.trim()) return (error.value = 'Введите название')
  if (!amount) return (error.value = form.kind === 'fixed' ? 'Введите сумму' : 'Введите примерную сумму')
  if (!(day >= 1 && day <= 31)) return (error.value = 'День — от 1 до 31')
  if (!(everyMonths >= 1 && everyMonths <= 120)) return (error.value = 'Период — от 1 до 120 месяцев')
  if (!form.startMonth) return (error.value = 'Укажите месяц')
  saveRecurring({
    ...(r ? { id: r.id } : {}),
    name: form.name.trim(),
    category: form.category,
    kind: form.kind,
    amount,
    everyMonths,
    day,
    startMonth: form.startMonth,
  })
  emit('done')
}

function remove() {
  if (!confirm(`Удалить «${r.name}»? Уже внесённые оплаты останутся в истории.`)) return
  deleteRecurring(r.id)
  emit('done')
}
</script>

<template>
  <section class="form">
    <h2>{{ rec ? 'Платёж' : 'Новый платёж' }}</h2>
    <label>Название<input v-model="form.name" placeholder="Интернет, Яндекс Диск…" /></label>
    <div class="field">Категория
      <Select v-model="form.category" :options="categoriesOf('expense').map((c) => ({ value: c.name, label: c.name, icon: c.icon }))" />
    </div>

    <Segmented v-model="form.kind" :options="KINDS" />
    <label>{{ form.kind === 'fixed' ? 'Сумма' : 'Примерная сумма (пока нет истории оплат)' }}
      <AmountInput v-model="form.amount" placeholder="0 ₽" />
    </label>

    <div class="field">Периодичность
      <Select v-model="form.period" :options="PERIODS" />
    </div>
    <Transition name="expand">
      <div v-if="form.period === 0" class="expand"><div>
        <label>Каждые N месяцев<input v-model="form.every" type="number" min="1" max="120" inputmode="numeric" /></label>
      </div></div>
    </Transition>
    <div class="row">
      <label>День месяца<input v-model="form.day" type="number" min="1" max="31" inputmode="numeric" /></label>
      <div class="field">{{ startLabel }}<DateField v-model="form.startMonth" type="month" align="right" /></div>
    </div>

    <p class="flash"><Transition name="fade" mode="out-in"><span :key="error">{{ error }}</span></Transition></p>
    <div class="actions">
      <button class="primary" @click="save">Сохранить</button>
      <button @click="emit('done')">Отмена</button>
      <button v-if="rec" class="danger" @click="remove">Удалить</button>
    </div>
  </section>
</template>
