<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { accounts, saveSaving, deleteSaving } from '../store'
import { KINDS, ledger, applyOp, accountOf } from '../savings'
import { isoDate, parseAmount, money } from '../format'
import Segmented from './Segmented.vue'
import Select from './Select.vue'
import DateField from './DateField.vue'
import AmountInput from './AmountInput.vue'

// item — редактирование операции из истории, accountId — новая операция по счёту
const props = defineProps({ item: { type: Object, default: null }, accountId: { type: String, default: '' } })
const emit = defineEmits(['done'])

const s = props.item
const startAccount = s?.accountId || props.accountId || accounts.value[0]?.id || ''
const form = reactive({
  accountId: startAccount,
  // по счёту без истории первым делом вносят текущий остаток
  kind: s?.kind ?? (ledger.value.balance[startAccount] === undefined ? 'set' : 'in'),
  amount: s ? String(s.amount) : '',
  date: s?.date ?? isoDate(),
  comment: s?.comment ?? '',
})
const error = ref('')
const amountInput = ref(null)

const accountOptions = computed(() => {
  const opts = accounts.value.map((a) => ({ value: a.id, label: a.name, icon: a.icon }))
  // операция по удалённому счёту — оставляем его в списке, чтобы не потерять
  if (s && !opts.some((o) => o.value === s.accountId)) opts.push({ value: s.accountId, label: accountOf(s.accountId).name })
  return opts
})

// остаток «Остаток = 0» — законный: счёт закрыли или всё сняли
const amount = computed(() => (form.kind === 'set' && /^[\s0]*([,.]0*)?$/.test(form.amount) && form.amount.trim() ? 0 : parseAmount(form.amount)))
const current = computed(() => ledger.value.balance[form.accountId] ?? 0)
const preview = computed(() => (s || amount.value === null ? null : applyOp(current.value, form.kind, amount.value)))

onMounted(() => !s && amountInput.value?.focus())

function save() {
  if (!form.accountId) return (error.value = 'Выберите счёт')
  if (amount.value === null) return (error.value = form.kind === 'set' ? 'Введите остаток на счёте' : 'Введите сумму')
  saveSaving({
    ...(s ? { id: s.id } : {}),
    accountId: form.accountId,
    kind: form.kind,
    amount: amount.value,
    date: form.date,
    comment: form.comment.trim(),
  })
  emit('done')
}

function remove() {
  if (!confirm('Удалить операцию? Остаток на счёте пересчитается.')) return
  deleteSaving(s.id)
  emit('done')
}
</script>

<template>
  <section class="form">
    <h2>{{ s ? 'Операция' : 'Новая операция' }}</h2>
    <div class="field">Счёт<Select v-model="form.accountId" :options="accountOptions" /></div>
    <Segmented v-model="form.kind" :options="KINDS" />
    <label>{{ form.kind === 'set' ? 'Сколько сейчас на счёте' : 'Сумма' }}
      <AmountInput ref="amountInput" v-model="form.amount" placeholder="0 ₽" enterkeyhint="done" @keyup.enter="save" />
    </label>
    <div class="row">
      <input v-model="form.comment" placeholder="Комментарий" @keyup.enter="save" />
      <DateField v-model="form.date" align="right" />
    </div>

    <p class="flash">
      <Transition name="fade" mode="out-in">
        <span v-if="error" :key="error">{{ error }}</span>
        <span v-else-if="!s" key="preview">
          Сейчас {{ money(current) }}<template v-if="preview !== null && preview !== current"> → станет {{ money(preview) }}</template>
        </span>
      </Transition>
    </p>
    <div class="actions">
      <button class="primary" @click="save">Сохранить</button>
      <button @click="emit('done')">Отмена</button>
      <button v-if="s" class="danger" @click="remove">Удалить</button>
    </div>
  </section>
</template>
