<script setup lang="ts">
import {computed} from 'vue'
import {Button} from '@/components/ui/button'
import {Kbd} from '@/components/ui/kbd'
import {LogOut, SignalHigh, SignalLow, Users} from 'lucide-vue-next'

const props = defineProps<{
  realtimeConnected: boolean
  connectionStatusLabel: string
  connectedPlayerCount: number
  totalPlayers: number
  socketError: string
  leaveError: string
  leavingGame: boolean
}>()

const emit = defineEmits<{
  (event: 'leave'): void
}>()

const statusIcon = computed(() => (props.realtimeConnected ? SignalHigh : SignalLow))
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
