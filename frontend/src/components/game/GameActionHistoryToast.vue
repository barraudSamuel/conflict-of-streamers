<script setup lang="ts">
import type {ActionLogEntry} from '@/types/game'

defineProps<{
  entries: ActionLogEntry[]
  formatLogTimestamp: (timestamp: number) => string
}>()
</script>

<template>
  <div
      class="pointer-events-none absolute right-4 top-24 z-40 flex w-full max-w-xs flex-col gap-3">
    <div
        v-for="entry in entries"
        :key="entry.id"
        class="pointer-events-auto overflow-hidden rounded-xl border border-white/10 bg-card/70 px-4 py-3 shadow-lg backdrop-blur">
      <p
          class="text-xs font-semibold"
          :class="{
            'text-emerald-300': entry.variant === 'success',
            'text-red-300': entry.variant === 'error',
            'text-slate-200': entry.variant === 'info'
          }"
      >
        <span
            v-for="part in entry.parts"
            :key="`${entry.id}-${part.text}-${part.color ?? 'none'}`"
            :style="part.color ? { color: part.color } : undefined"
        >
          {{ part.text }}
        </span>
      </p>
      <p class="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {{ formatLogTimestamp(entry.timestamp) }}
      </p>
    </div>
  </div>
</template>
