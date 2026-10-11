<script setup>
import { reactive, ref } from 'vue'
import { state, sync } from '../store'
import CategoriesView from './CategoriesView.vue'

const emit = defineEmits(['done'])
const form = reactive({ ...state.settings })
const status = ref('')
const showCategories = ref(false)

async function save() {
  form.apiUrl = form.apiUrl.trim()
  if (!form.apiUrl || !form.secret) {
    status.value = 'Заполните все поля'
    return
  }
  const urlChanged = form.apiUrl !== state.settings.apiUrl
  state.settings = { ...form }
  status.value = 'Проверяю…'
  await sync({ full: urlChanged })
  if (state.error) {
    status.value = state.error
  } else {
    status.value = 'Готово ✓'
    emit('done')
  }
}

async function resync() {
  status.value = 'Загружаю всё заново…'
  await sync({ full: true })
  status.value = state.error || 'Готово ✓'
}
</script>

<template>
  <Transition :name="showCategories ? 'slide-left' : 'slide-right'" mode="out-in">
  <CategoriesView v-if="showCategories" @back="showCategories = false" />
  <section v-else class="settings">
    <label>Адрес Apps Script<input v-model="form.apiUrl" placeholder="https://script.google.com/macros/s/…/exec" /></label>
    <label>Семейный пароль<input v-model="form.secret" type="password" /></label>
    <button class="primary" @click="save">Сохранить и проверить</button>
    <p v-if="status" class="flash">{{ status }}</p>

    <hr />
    <button @click="showCategories = true">Категории расходов и доходов</button>
    <hr />
    <p class="hint">
      Записей: {{ Object.keys(state.txs).length }} · в очереди: {{ state.queue.length }}<br />
      <template v-if="state.lastSyncAt">Последняя синхронизация: {{ new Date(state.lastSyncAt).toLocaleTimeString('ru-RU') }}</template>
    </p>
    <button @click="resync">Полная пересинхронизация</button>
  </section>
  </Transition>
</template>
