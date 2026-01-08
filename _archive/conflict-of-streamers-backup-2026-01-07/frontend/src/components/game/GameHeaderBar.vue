<script setup lang="ts">
import {computed} from 'vue'
import {Button} from '@/components/ui/button'
import {Kbd} from '@/components/ui/kbd'
import {LogOut, SignalHigh, SignalLow, Users, Volume, Volume1, Volume2, VolumeX} from 'lucide-vue-next'

const props = defineProps<{
  realtimeConnected: boolean
  connectionStatusLabel: string
  connectedPlayerCount: number
  totalPlayers: number
  socketError: string
  leaveError: string
  leavingGame: boolean
  volumeLevel: number
  muted: boolean
}>()

const emit = defineEmits<{
  (event: 'leave'): void
  (event: 'toggle-audio'): void
  (event: 'volume-change', value: number): void
}>()

const statusIcon = computed(() => (props.realtimeConnected ? SignalHigh : SignalLow))

const volumeIcon = computed(() => {
  if (props.muted || props.volumeLevel <= 0.01) return VolumeX
  if (props.volumeLevel >= 0.66) return Volume2
  if (props.volumeLevel >= 0.33) return Volume1
  return Volume
})
</script>

<template>
  <div class="pointer-events-none flex flex-wrap items-center justify-between gap-3 pt-4">
    <div
        class="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-card/70 px-4 py-2 text-xs ring-2 ring-white/10 shadow-lg backdrop-blur">
      <component :is="statusIcon" class="size-4 text-emerald-300"/>
      <span class="font-medium text-slate-200">{{ connectionStatusLabel }}</span>
      <span class="hidden sm:inline text-slate-600">•</span>
      <span class="hidden sm:flex items-center gap-2">
        <Users class="size-3 text-emerald-300"/>
        <span>{{ connectedPlayerCount }}/{{ totalPlayers }} connectés</span>
      </span>
      <span class="hidden md:flex items-center gap-2 text-slate-500">
        <Kbd>Tab</Kbd>
        <span>pour le tableau</span>
      </span>
    </div>
    <div class="pointer-events-auto flex flex-wrap items-center gap-2 text-xs">
      <p v-if="leaveError" class="text-red-400">{{ leaveError }}</p>
      <p v-else-if="socketError" class="text-amber-300">{{ socketError }}</p>
      <div
          class="flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 ring-2 ring-white/10 shadow-lg backdrop-blur">
        <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-slate-800/60 text-slate-200 transition hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            @click="emit('toggle-audio')"
            :aria-label="props.muted ? 'Activer le son' : 'Couper le son'"
        >
          <component :is="volumeIcon" class="size-4"/>
        </button>
        <input
            class="h-1 w-24 cursor-pointer accent-emerald-400"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="Math.round(props.volumeLevel * 100)"
            @input="emit('volume-change', Number(($event.target as HTMLInputElement).value) / 100)"
            aria-label="Volume général"
        />
      </div>
      <Button
          variant="outline"
          size="sm"
          class="flex items-center gap-2"
          @click="emit('leave')"
          :disabled="leavingGame"
      >
        <LogOut class="size-4"/>
        <span v-if="!leavingGame">Quitter</span>
        <span v-else>Déconnexion...</span>
      </Button>
    </div>
  </div>
</template>
