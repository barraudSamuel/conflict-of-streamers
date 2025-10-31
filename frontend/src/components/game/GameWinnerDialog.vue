<script setup lang="ts">
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogClose from '@/components/ui/dialog/DialogClose.vue'
import {Button} from '@/components/ui/button'
import {ScrollArea} from '@/components/ui/scroll-area'
import {LogOut, Trophy} from 'lucide-vue-next'
import type {RankingEntry} from '@/types/game'

defineProps<{
  open: boolean
  winnerDisplayName: string
  rankings: RankingEntry[]
  winnerPlayerId: string | null
  leavingGame: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'continue'): void
  (event: 'leave'): void
}>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
        :overlay-class="'bg-slate-950/80 backdrop-blur'"
        class="w-full !max-w-3xl space-y-6 border-emerald-400/30 bg-card/90 p-6 sm:max-h-[85vh] sm:overflow-y-auto sm:p-10 z-60"
    >
      <DialogHeader class="items-start gap-4 text-left">
        <div class="flex items-start gap-4">
          <span class="flex size-12 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/40">
            <Trophy class="size-7 text-emerald-300"/>
          </span>
          <div class="space-y-2">
            <DialogTitle class="text-left text-2xl text-emerald-200 sm:text-3xl">
              {{ winnerDisplayName }} remporte la partie !
            </DialogTitle>
            <DialogDescription class="text-left text-slate-300">
              Tous les autres joueurs ont été conquis. Les bots restants ne bloquent pas la victoire.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="rounded-2xl border border-white/10 bg-accent/70">
        <div class="flex items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Classement final
          </h3>
          <span class="text-xs text-slate-500">
            Trié par territoires puis par score global.
          </span>
        </div>
        <ScrollArea class="max-h-[320px]">
          <ul class="space-y-2 px-4 py-4">
            <li
                v-for="entry in rankings"
                :key="`ranking-${entry.id}`"
                class="flex items-center justify-between rounded-xl border px-4 py-3 transition"
                :class="entry.id === winnerPlayerId
                  ? 'border-emerald-400/60 bg-emerald-400/15 text-slate-100 shadow-lg shadow-emerald-500/10'
                  : 'border-white/10 bg-card/70 text-slate-300'"
            >
              <div class="flex items-center gap-4">
                <span
                    class="text-lg font-semibold"
                    :class="entry.id === winnerPlayerId ? 'text-emerald-300' : 'text-slate-200'"
                >
                  #{{ entry.rank }}
                </span>
                <span
                    class="inline-flex size-3 rounded-full ring-2 ring-white/20"
                    :style="{ backgroundColor: entry.color || '#94a3b8' }"
                ></span>
                <div class="flex flex-col">
                  <span class="font-semibold text-slate-100">
                    {{ entry.twitchUsername }}
                  </span>
                  <span
                      v-if="entry.id === winnerPlayerId"
                      class="text-xs text-emerald-300"
                  >
                    Dernier joueur en vie
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-4 text-xs text-slate-400">
                <span>
                  Territoires
                  <span class="ml-1 font-semibold text-slate-100">{{ entry.territories }}</span>
                </span>
                <span>
                  Score
                  <span class="ml-1 font-semibold text-slate-100">{{ entry.score }}</span>
                </span>
              </div>
            </li>
          </ul>
        </ScrollArea>
      </div>

      <DialogFooter class="sm:justify-between">
        <div class="hidden text-xs text-slate-500 sm:block">
          Merci d'avoir joué ! Vous pouvez continuer à observer la carte ou quitter la partie.
        </div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <DialogClose as-child>
            <Button variant="secondary" class="w-full sm:w-auto" @click="emit('continue')">
              Continuer
            </Button>
          </DialogClose>
          <Button
              variant="outline"
              class="w-full sm:w-auto"
              :disabled="leavingGame"
              @click="emit('leave')"
          >
            <LogOut class="size-4"/>
            <span v-if="!leavingGame">Quitter la partie</span>
            <span v-else>Déconnexion...</span>
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
