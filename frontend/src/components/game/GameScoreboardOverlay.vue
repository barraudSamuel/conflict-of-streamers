<script setup lang="ts">
import {computed} from 'vue'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Kbd} from '@/components/ui/kbd'
import {Users, ScrollText} from 'lucide-vue-next'
import type {ActionLogEntry, GameInfoItem, PlayerSummary} from '@/types/game'

const props = defineProps<{
  gameInfoItems: GameInfoItem[]
  connectedPlayerCount: number
  totalPlayers: number
  players: PlayerSummary[]
  actionHistory: ActionLogEntry[]
  formatLogTimestamp: (timestamp: number) => string
}>()

const hasHistory = computed(() => props.actionHistory.length > 0)
</script>

<template>
  <div
      class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
    <div class="pointer-events-auto flex w-full max-w-5xl flex-col gap-6">
      <Card class="backdrop-blur">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Users class="size-5 text-emerald-300"/>
            <span>Tableau de bord</span>
          </CardTitle>
          <CardDescription class="text-sm">
            <span class="flex items-center gap-2">
              Aperçu de la partie
              <Kbd>Tab</Kbd>
              pour masquer.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div
                v-for="item in gameInfoItems"
                :key="item.label"
                class="rounded-lg border bg-accent p-4">
              <span class="text-xs uppercase tracking-wide text-muted-foreground">{{ item.label }}</span>
              <p class="mt-1 text-base font-semibold">{{ item.value }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="flex items-start justify-between gap-4">
        <Card class="backdrop-blur w-full">
          <CardHeader class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle class="flex items-center gap-2">
              <Users class="size-4 text-emerald-300"/>
              <span>Joueurs</span>
            </CardTitle>
            <CardDescription class="text-xs">
              {{ connectedPlayerCount }}/{{ totalPlayers }} connectés
            </CardDescription>
          </CardHeader>
          <CardContent class="pt-0">
            <ScrollArea class="h-[360px] pr-4">
              <ul class="space-y-3 p-1">
                <li
                    v-for="player in players"
                    :key="player.id"
                    class="flex items-center justify-between rounded-xl border bg-accent px-4 py-4"
                    :class="player.isCurrent ? 'ring-2 ring-primary/80' : ''"
                >
                  <div class="flex items-center gap-3">
                  <span
                      class="size-3 rounded-full ring-2 ring-white/30"
                      :style="{ backgroundColor: player.color || '#94a3b8' }"
                  ></span>
                    <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-100">
                      {{ player.twitchUsername }}
                      <span v-if="player.isAdmin" class="ml-1 text-xs uppercase text-yellow-400">Host</span>
                      <span v-else-if="player.isCurrent" class="ml-1 text-xs uppercase text-primary">Vous</span>
                    </span>
                      <span class="text-xs text-slate-400">
                      Territoires: {{ player.territories }} • Score: {{ player.score }}
                    </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                  <span :class="player.connected ? 'text-emerald-300' : 'text-slate-500'">
                    {{ player.connected ? 'Connecté' : 'Déconnecté' }}
                  </span>
                    <span
                        class="size-2 rounded-full"
                        :class="player.connected ? 'bg-emerald-400' : 'bg-slate-500'"
                    ></span>
                  </div>
                </li>
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card class="backdrop-blur w-full">
          <CardHeader class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle class="flex items-center gap-2">
              <ScrollText class="size-4 text-emerald-300"/>
              <span>Historique des actions</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Journal complet des actions récentes.
            </CardDescription>
          </CardHeader>
          <CardContent class="pt-0">
            <ScrollArea class="h-[360px] pr-4">
              <div
                  v-if="!hasHistory"
                  class="rounded-lg border border-white/10 bg-accent p-4 text-xs"
              >
                Aucun événement pour le moment.
              </div>
              <ul v-else class="space-y-3 p-1">
                <li
                    v-for="entry in actionHistory"
                    :key="`modal-${entry.id}`"
                    class="rounded-lg border border-white/10 bg-accent p-3"
                >
                  <p
                      class="text-sm font-semibold"
                      :class="{
                        'text-emerald-300': entry.variant === 'success',
                        'text-red-300': entry.variant === 'error',
                        'text-slate-200': entry.variant === 'info'
                      }"
                  >
                  <span
                      v-for="part in entry.parts"
                      :key="`${entry.id}-${part.text}-${part.color ?? 'none'}-modal`"
                      :style="part.color ? { color: part.color } : undefined"
                  >
                    {{ part.text }}
                  </span>
                  </p>
                  <p class="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {{ formatLogTimestamp(entry.timestamp) }}
                  </p>
                </li>
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
