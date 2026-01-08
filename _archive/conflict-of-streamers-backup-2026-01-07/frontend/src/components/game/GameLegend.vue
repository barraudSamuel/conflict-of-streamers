<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { LegendEntry } from '@/types/game'

defineProps<{
  currentPlayerColor: string
  currentPlayerAvatar?: string | null
  botColor: string
  otherEntries: LegendEntry[]
}>()
</script>

<template>
  <div class="w-fit mt-4">
    <div
      class="px-4 py-3 text-xs text-card-foreground rounded-xl border bg-card/70 backdrop-blur shadow-xl ring-1 ring-white/10"
    >
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Légende</p>
      <ul class="space-y-2 text-slate-200">
        <li class="flex items-center gap-3">
          <Avatar class="size-6 border border-white/10">
            <AvatarImage
              v-if="currentPlayerAvatar"
              :src="currentPlayerAvatar"
              alt="Avatar joueur actuel"
            />
            <AvatarFallback
              class="flex size-full items-center justify-center rounded-full text-[10px] font-semibold uppercase text-white"
              :style="{ backgroundColor: currentPlayerColor }"
            >
              V
            </AvatarFallback>
          </Avatar>
          <span>Vos territoires</span>
        </li>
        <li class="flex items-center gap-3">
          <span class="inline-flex size-3 rounded-full" :style="{ backgroundColor: botColor }"></span>
          <span>Contrôle IA</span>
        </li>
        <li
          v-for="entry in otherEntries"
          :key="entry.id"
          class="flex items-center gap-3"
        >
          <Avatar class="size-6 border border-white/10">
            <AvatarImage
              v-if="entry.avatarUrl"
              :src="entry.avatarUrl"
              :alt="`Avatar de ${entry.label}`"
            />
            <AvatarFallback
              class="flex size-full items-center justify-center rounded-full text-[10px] font-semibold uppercase text-white"
              :style="entry.color ? { backgroundColor: entry.color } : undefined"
            >
              {{ entry.label?.charAt(0)?.toUpperCase() ?? 'J' }}
            </AvatarFallback>
          </Avatar>
          <span>{{ entry.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
