<script setup lang="ts">
/**
 * GameView - Main game screen with real-time map rendering (Story 4.1)
 *
 * Features:
 * - Canvas 2D rendering of 20x20 territory grid
 * - Real-time updates via WebSocket (< 200ms NFR1)
 * - Territory labels and owner colors
 * - Connection status display
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Container, PageLayout, Card, Button } from '@/components/ui'
import GameMap from '@/components/game/GameMap.vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useGameSync } from '@/composables/useGameSync'

const route = useRoute()
const router = useRouter()
const lobbyStore = useLobbyStore()
const territoryStore = useTerritoryStore()

// Route params
const roomCode = computed(() => (route.params.roomCode as string).toUpperCase())
const playerId = computed(() => lobbyStore.currentPlayerId ?? '')

// Territory store state
const { territories, territoryCounts } = storeToRefs(territoryStore)

// Initialize game sync with WebSocket
const { isConnected, connectionStatus, isInitialized, connectionError } = useGameSync(
  roomCode.value,
  playerId.value
)

// Loading state
const isLoading = computed(() => !isInitialized.value && !connectionError.value)

// Player info for display
const players = computed(() => lobbyStore.players)
const currentPlayer = computed(() => players.value.find(p => p.id === playerId.value))

// Hovered territory for info display
const hoveredTerritoryId = ref<string | null>(null)
const hoveredTerritory = computed(() => {
  if (!hoveredTerritoryId.value) return null
  return territories.value.find(t => t.id === hoveredTerritoryId.value) ?? null
})

// Connection status display
const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'Connecte'
    case 'connecting':
      return 'Connexion...'
    case 'reconnecting':
      return 'Reconnexion...'
    case 'disconnected':
      return 'Deconnecte'
    default:
      return ''
  }
})

const connectionStatusClass = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'text-success'
    case 'connecting':
    case 'reconnecting':
      return 'text-warning'
    case 'disconnected':
      return 'text-danger'
    default:
      return 'text-gray-400'
  }
})

// Event handlers
function handleTerritoryClick(territoryId: string) {
  // Attack targeting will be implemented in Story 4.2
  console.log('Territory clicked:', territoryId)
}

function handleTerritoryHover(territoryId: string | null) {
  hoveredTerritoryId.value = territoryId
}

function handleLeave() {
  router.push('/')
}

// Get owner name for territory
function getTerritoryOwnerName(ownerId: string | null): string {
  if (!ownerId) return 'BOT'
  const owner = players.value.find(p => p.id === ownerId)
  return owner?.pseudo ?? 'Inconnu'
}
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="xl" class="py-4 min-h-screen">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-[60vh]">
        <Card :padding="'lg'" :glow="true" class="text-center">
          <div class="text-4xl mb-4 animate-pulse">...</div>
          <p class="text-xl text-gray-400">Chargement de la carte...</p>
          <p class="text-sm text-gray-500 mt-2">{{ connectionStatusText }}</p>
        </Card>
      </div>

      <!-- Error State -->
      <div v-else-if="connectionError" class="flex items-center justify-center min-h-[60vh]">
        <Card :padding="'lg'" :glow="true" class="w-full max-w-md text-center">
          <div class="text-6xl mb-4">X</div>
          <h2 class="text-xl text-danger mb-4">{{ connectionError }}</h2>
          <Button variant="secondary" :full-width="true" @click="handleLeave">
            Retour a l'accueil
          </Button>
        </Card>
      </div>

      <!-- Game Content -->
      <div v-else class="space-y-4">
        <!-- Header with room code and connection status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white">Partie</h1>
            <span class="text-xl text-player-cyan font-mono">{{ roomCode }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-success': connectionStatus === 'connected',
                'bg-warning animate-pulse': connectionStatus === 'connecting' || connectionStatus === 'reconnecting',
                'bg-danger': connectionStatus === 'disconnected'
              }"
            ></span>
            <span :class="connectionStatusClass">{{ connectionStatusText }}</span>
          </div>
        </div>

        <!-- Main game layout -->
        <div class="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-4">
          <!-- Map Section -->
          <Card :padding="'sm'" class="overflow-hidden">
            <div class="flex justify-center">
              <GameMap
                :interactive="true"
                @territory-click="handleTerritoryClick"
                @territory-hover="handleTerritoryHover"
              />
            </div>
          </Card>

          <!-- Sidebar -->
          <div class="space-y-4">
            <!-- Player Info -->
            <Card :padding="'md'">
              <template #header>
                <h2 class="text-lg font-semibold text-white">Vous</h2>
              </template>
              <div v-if="currentPlayer" class="flex items-center gap-3">
                <img
                  :src="currentPlayer.avatarUrl"
                  :alt="currentPlayer.pseudo"
                  class="w-12 h-12 rounded-full"
                  :style="{ borderColor: currentPlayer.color, borderWidth: '3px', borderStyle: 'solid' }"
                />
                <div>
                  <div class="font-semibold text-white">{{ currentPlayer.pseudo }}</div>
                  <div class="text-sm text-gray-400">
                    {{ territoryCounts.get(playerId) ?? 0 }} territoires
                  </div>
                </div>
              </div>
            </Card>

            <!-- Hovered Territory Info -->
            <Card v-if="hoveredTerritory" :padding="'md'" class="animate-fade-in">
              <template #header>
                <h2 class="text-lg font-semibold text-white">{{ hoveredTerritory.name }}</h2>
              </template>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">ID:</span>
                  <span class="text-white font-mono">{{ hoveredTerritory.id }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Taille:</span>
                  <span class="text-white capitalize">{{ hoveredTerritory.size }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Proprietaire:</span>
                  <span
                    class="font-semibold"
                    :style="{ color: hoveredTerritory.color ?? '#4a4a4a' }"
                  >
                    {{ getTerritoryOwnerName(hoveredTerritory.ownerId) }}
                  </span>
                </div>
                <div v-if="hoveredTerritory.stats" class="pt-2 border-t border-gray-700">
                  <div class="flex justify-between">
                    <span class="text-gray-400">Bonus attaque:</span>
                    <span class="text-player-red">x{{ hoveredTerritory.stats.attackBonus.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Bonus defense:</span>
                    <span class="text-player-cyan">x{{ hoveredTerritory.stats.defenseBonus.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </Card>

            <!-- Players List -->
            <Card :padding="'md'">
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-white">Joueurs</h2>
                  <span class="text-sm text-gray-400">{{ players.length }}</span>
                </div>
              </template>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <div
                  v-for="player in players"
                  :key="player.id"
                  class="flex items-center gap-2 p-2 rounded bg-gray-800/50"
                  :class="{ 'ring-1 ring-player-cyan/50': player.id === playerId }"
                >
                  <div
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: player.color }"
                  ></div>
                  <span class="text-sm text-white truncate flex-1">{{ player.pseudo }}</span>
                  <span class="text-xs text-gray-400">
                    {{ territoryCounts.get(player.id) ?? 0 }}
                  </span>
                </div>
                <!-- BOT territories count -->
                <div class="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                  <div class="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span class="text-sm text-gray-400 flex-1">BOT</span>
                  <span class="text-xs text-gray-400">
                    {{ territoryCounts.get('BOT') ?? territories.filter(t => !t.ownerId).length }}
                  </span>
                </div>
              </div>
            </Card>

            <!-- Leave Button -->
            <Button variant="secondary" :full-width="true" @click="handleLeave">
              Quitter la partie
            </Button>
          </div>
        </div>
      </div>
    </Container>
  </PageLayout>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
