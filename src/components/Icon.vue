<script setup>
// Иконки интерфейса — тот же набор Lucide, что и у категорий
import {
  Plus, List, CalendarDays, ChartPie, PiggyBank, Settings, RefreshCw,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, Lock, LockOpen,
  Check, CircleAlert, Hourglass,
} from 'lucide-vue-next'

defineProps({ name: { type: String, required: true }, size: { type: Number, default: 24 } })

const icons = {
  plus: Plus,
  list: List,
  calendar: CalendarDays,
  chart: ChartPie,
  savings: PiggyBank,
  settings: Settings,
  sync: RefreshCw,
  left: ChevronLeft,
  right: ChevronRight,
  up: ChevronUp,
  down: ChevronDown,
  trash: Trash2,
  lock: Lock,
  unlock: LockOpen,
  check: Check,
  alert: CircleAlert,
  hourglass: Hourglass,
}
</script>

<template>
  <component :is="icons[name]" :size="size" :stroke-width="2" aria-hidden="true" />
</template>
