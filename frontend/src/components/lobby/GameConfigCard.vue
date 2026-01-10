<script setup lang="ts">
/**
 * GameConfigCard - Display current game configuration in the lobby
 * Story 2.4 - Display Game Instructions in Lobby (FR11)
 */
import type { GameConfig } from 'shared/types'
import { Card } from '@/components/ui'

interface Props {
  config: GameConfig | null
}

const props = defineProps<Props>()

// Default values when config is not yet loaded
// These should match backend defaults in RoomManager (30s battle, 10s cooldown)
const DEFAULT_BATTLE_DURATION = 30
const DEFAULT_COOLDOWN = 10
</script>

<template>
  <Card :padding="'md'" class="animate-fade-in">
    <template #header>
      <h2 class="text-lg font-semibold text-white">Configuration de la partie</h2>
    </template>

    <div class="grid grid-cols-2 gap-6">
      <!-- Battle Duration -->
      <div class="text-center">
        <div class="flex items-center justify-center gap-2 text-gray-400 text-base mb-1">
          <span class="text-xl">⚔️</span>
          <span>Duree des batailles</span>
        </div>
        <div class="flex items-center justify-center gap-2">
          <span class="text-3xl font-bold text-player-cyan">
            {{ props.config?.battleDuration ?? DEFAULT_BATTLE_DURATION }}
          </span>
          <span class="text-lg text-gray-400">sec</span>
        </div>
      </div>

      <!-- Cooldown Between Actions -->
      <div class="text-center">
        <div class="flex items-center justify-center gap-2 text-gray-400 text-base mb-1">
          <span class="text-xl">⏳</span>
          <span>Cooldown entre actions</span>
        </div>
        <div class="flex items-center justify-center gap-2">
          <span class="text-3xl font-bold text-player-magenta">
            {{ props.config?.cooldownBetweenActions ?? DEFAULT_COOLDOWN }}
          </span>
          <span class="text-lg text-gray-400">sec</span>
        </div>
      </div>
    </div>
  </Card>
</template>
