<script setup>
// Поле даты (YYYY-MM-DD) или месяца (YYYY-MM) со своим календарём вместо системного.
import { ref, computed } from 'vue'
import { isoDate, isoMonth, shiftMonth, monthLabel, dayLabel } from '../format'
import { useSlide } from '../motion'
import Dropdown from './Dropdown.vue'
import Icon from './Icon.vue'

const props = defineProps({
  type: { type: String, default: 'date' }, // date | month
  align: { type: String, default: 'left' },
})
const model = defineModel({ type: String, required: true })

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''))

const isMonth = computed(() => props.type === 'month')
const today = isoDate()
// что сейчас листаем: месяц (для дат) или год (для месяцев)
const view = ref('')
const slide = useSlide(view)

function reset() {
  const value = model.value || today
  view.value = isMonth.value ? value.slice(0, 4) : value.slice(0, 7)
}
reset()

const label = computed(() => {
  if (!model.value) return 'Выберите'
  return isMonth.value ? monthLabel(model.value) : dayLabel(model.value)
})

const days = computed(() => {
  const [y, m] = view.value.split('-').map(Number)
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7 // понедельник — первый
  const count = new Date(y, m, 0).getDate()
  return [
    ...Array(offset).fill(null),
    ...Array.from({ length: count }, (_, i) => {
      const date = `${view.value}-${String(i + 1).padStart(2, '0')}`
      return { date, day: i + 1, weekend: (offset + i) % 7 >= 5 }
    }),
  ]
})

function step(delta) {
  view.value = isMonth.value ? String(Number(view.value) + delta) : shiftMonth(view.value, delta)
}

function choose(value, close) {
  model.value = value
  close()
}

const yesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return isoDate(d)
}
</script>

<template>
  <Dropdown class="date-field" :align="align" @open="reset">
    <template #trigger><span class="value">{{ label }}</span></template>
    <template #default="{ close }">
      <div class="calendar">
        <div class="calendar-head">
          <button type="button" aria-label="Назад" @click="step(-1)"><Icon name="left" :size="22" /></button>
          <span>{{ isMonth ? view : monthLabel(view) }}</span>
          <button type="button" aria-label="Вперёд" @click="step(1)"><Icon name="right" :size="22" /></button>
        </div>

        <Transition :name="slide" mode="out-in">
          <div v-if="isMonth" :key="view" class="calendar-grid months">
            <button
              v-for="(name, i) in MONTHS"
              :key="name"
              type="button"
              :class="{ active: model === `${view}-${String(i + 1).padStart(2, '0')}`, today: isoMonth() === `${view}-${String(i + 1).padStart(2, '0')}` }"
              @click="choose(`${view}-${String(i + 1).padStart(2, '0')}`, close)"
            >{{ name }}</button>
          </div>
          <div v-else :key="view" class="calendar-grid">
            <span v-for="w in WEEK" :key="w" class="calendar-week">{{ w }}</span>
            <template v-for="(d, i) in days" :key="d?.date ?? `empty-${i}`">
              <span v-if="!d" />
              <button
                v-else
                type="button"
                :class="{ active: d.date === model, today: d.date === today, weekend: d.weekend }"
                @click="choose(d.date, close)"
              >{{ d.day }}</button>
            </template>
          </div>
        </Transition>

        <div class="calendar-foot">
          <template v-if="isMonth">
            <button type="button" @click="choose(isoMonth(), close)">Этот месяц</button>
            <button type="button" @click="choose(shiftMonth(isoMonth(), 1), close)">Следующий</button>
          </template>
          <template v-else>
            <button type="button" @click="choose(yesterday(), close)">Вчера</button>
            <button type="button" @click="choose(today, close)">Сегодня</button>
          </template>
        </div>
      </div>
    </template>
  </Dropdown>
</template>
