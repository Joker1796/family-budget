<script setup>
import { computed } from 'vue'
import { reminders, dueLabel } from '../recurring'
import { money } from '../format'

const emit = defineEmits(['pay'])
const list = computed(() => reminders())
</script>

<template>
  <TransitionGroup name="list" tag="div" class="reminders tg">
    <button v-for="o in list" :key="o.rec.id + o.month" :class="o.status" @click="emit('pay', o)">
      <span>{{ o.rec.name }} — {{ dueLabel(o.days) }}</span>
      <b>{{ o.rec.kind === 'variable' ? '~' : '' }}{{ money(o.amount) }}</b>
    </button>
  </TransitionGroup>
</template>
