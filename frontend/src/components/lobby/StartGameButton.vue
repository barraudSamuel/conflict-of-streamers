<script setup lang="ts">
/**
 * StartGameButton - Launch game button for creator only (Story 2.7)
 *
 * Visible only to the room creator.
 * Disabled until all players have selected territories.
 * Shows which players need to select when disabled.
 */
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useWebSocketStore } from '@/stores/websocketStore'
import { GAME_EVENTS } from 'shared/types'

const lobbyStore = useLobbyStore()
const territoryStore = useTerritoryStore()
const wsStore = useWebSocketStore()

const isLoading = ref(false)

// Watch for errors to reset loading state (Code Review fix HIGH-3)
watch(
  () => lobbyStore.lastError,
  (error) => {
    if (error && isLoading.value) {
      isLoading.value = false
    }
  }
)

// Check if all players have selected territory
// Uses territoryStore.playerSelections which tracks all player selections
const allPlayersReady = computed(() => {
  const players = lobbyStore.players
  const selections = territoryStore.playerSelections

  // Every player must have a selection in the map
  return players.every(p => selections.has(p.id))
})

// Get list of players who haven't selected a territory
const playersWithoutTerritory = computed(() => {
  const players = lobbyStore.players
  const selections = territoryStore.playerSelections

  return players.filter(p => !selections.has(p.id))
})

// Can start game if: creator + all players ready + not already loading
const canStartGame = computed(() =>
  lobbyStore.isCreator && allPlayersReady.value && !isLoading.value
)

function handleStartGame() {
  if (!canStartGame.value) return

  isLoading.value = true
  wsStore.send(GAME_EVENTS.START, {})
  // Loading state will be cleared when game:started event is received
  // or if an error occurs (handled by useLobbySync)
}
</script>

<template>
  <div class="space-y-2">
    <!-- Start button - Creator only -->
    <Button
      v-if="lobbyStore.isCreator"
      variant="primary"
      size="lg"
      :full-width="true"
      :disabled="!canStartGame"
      @click="handleStartGame"
    >
      {{ isLoading ? 'Lancement...' : 'Lancer la Partie' }}
    </Button>

    <!-- Status message - Visible to ALL players (AC3) -->
    <p v-if="!allPlayersReady && playersWithoutTerritory.length > 0" class="text-sm text-warning text-center">
      En attente de:
      <span v-for="(player, idx) in playersWithoutTerritory" :key="player.id">
        {{ player.pseudo }}{{ idx < playersWithoutTerritory.length - 1 ? ', ' : '' }}
      </span>
      ({{ playersWithoutTerritory.length === 1 ? 'doit selectionner' : 'doivent selectionner' }} un territoire)
    </p>

    <!-- Ready status - Visible to ALL players -->
    <p v-if="allPlayersReady" class="text-sm text-success text-center">
      Tous les joueurs sont prets!
    </p>
  </div>
</template>
