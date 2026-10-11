<script setup>
import { monthLabel, shiftMonth } from '../format'
import Icon from './Icon.vue'

const month = defineModel({ type: String, required: true })
</script>

<template>
  <div class="month-picker">
    <button aria-label="Предыдущий месяц" @click="month = shiftMonth(month, -1)"><Icon name="left" :size="26" /></button>
    <span>{{ monthLabel(month) }}</span>
    <button aria-label="Следующий месяц" @click="month = shiftMonth(month, 1)"><Icon name="right" :size="26" /></button>
  </div>
</template>
