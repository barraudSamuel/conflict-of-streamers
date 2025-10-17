<script setup lang="ts">
import type {LegendEntry} from '@/types/game'

defineProps<{
  currentPlayerColor: string
  botColor: string
  otherEntries: LegendEntry[]
}>()
</script>

<template>
  <div class="w-fit mt-4">
    <div
        class="px-4 py-3 text-xs text-card-foreground rounded-xl border bg-card/70 backdrop-blur shadow-xl ring-1 ring-white/10">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Légende</p>
      <ul class="space-y-2 text-slate-200">
        <li class="flex items-center gap-3">
        <span
            class="inline-flex size-3 rounded-full"
            :style="{ backgroundColor: currentPlayerColor }"
        ></span>
          <span>Vos territoires</span>
        </li>
        <li class="flex items-center gap-3">
        <span
            class="inline-flex size-3 rounded-full"
            :style="{ backgroundColor: botColor }"
        ></span>
          <span>Contrôle IA</span>
        </li>
        <li
            v-for="entry in otherEntries"
            :key="entry.id"
            class="flex items-center gap-3"
        >
        <span
            class="inline-flex size-3 rounded-full"
            :style="{ backgroundColor: entry.color }"
        ></span>
          <span>{{ entry.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
