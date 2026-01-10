<script setup lang="ts">
/**
 * LobbyView - Game lobby with real-time player synchronization
 * Story 2.3 - Real-time lobby synchronization via WebSocket
 * Story 2.4 - Display Game Instructions in Lobby (FR11)
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Card, Container, PageLayout } from '@/components/ui'
import InstructionsCard from '@/components/lobby/InstructionsCard.vue'
import GameConfigCard from '@/components/lobby/GameConfigCard.vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useLobbySync } from '@/composables/useLobbySync'

const route = useRoute()
const router = useRouter()
const lobbyStore = useLobbyStore()

// Room state from route and store
const roomCode = computed(() => (route.params.roomCode as string).toUpperCase())
const players = computed(() => lobbyStore.players)
const playerCount = computed(() => lobbyStore.playerCount)
const currentPlayerId = computed(() => lobbyStore.currentPlayerId)
const gameConfig = computed(() => lobbyStore.config)
const isLoading = ref(true)
const error = ref<string | null>(null)
const copied = ref(false)

// Validate session data before initializing WebSocket (HIGH-2 fix)
const validPlayerId = computed(() => currentPlayerId.value || '')
const hasValidSession = computed(() => {
  return lobbyStore.roomCode.toUpperCase() === roomCode.value && !!currentPlayerId.value
})

// Initialize WebSocket sync only with valid data
const { isConnected, connectionStatus, retryCount, connectionError } = useLobbySync(
  roomCode.value,
  validPlayerId.value
)

onMounted(() => {
  // Validate that store data matches route and we have a valid player ID
  if (!hasValidSession.value) {
    error.value = 'Donnees de session invalides'
  }
  isLoading.value = false
})

function handleLeave() {
  // WebSocket cleanup is handled by useLobbySync onBeforeUnmount
  router.push('/')
}

function copyRoomCode() {
  navigator.clipboard.writeText(roomCode.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

// Connection status display
const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'Connecte'
    case 'connecting':
      return 'Connexion...'
    case 'reconnecting':
      return `Reconnexion (${retryCount.value})...`
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
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="lg" class="py-8 min-h-screen">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-[60vh]">
        <div class="text-xl text-gray-400">Chargement...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error || connectionError" class="flex items-center justify-center min-h-[60vh]">
        <Card :padding="'lg'" :glow="true" class="w-full max-w-md text-center">
          <div class="text-6xl mb-4">X</div>
          <h2 class="text-xl text-danger mb-4">{{ error || connectionError }}</h2>
          <Button variant="secondary" :full-width="true" @click="router.push('/')">
            Retour a l'accueil
          </Button>
        </Card>
      </div>

      <!-- Lobby Content -->
      <div v-else class="space-y-6">
        <!-- Room Code Header -->
        <Card :padding="'lg'" :glow="true" class="text-center animate-fade-in">
          <h1 class="text-lg text-gray-400 mb-2">Code de la partie</h1>
          <div class="flex items-center justify-center gap-4">
            <span class="text-4xl md:text-5xl font-bold text-player-cyan tracking-widest">
              {{ roomCode }}
            </span>
            <Button variant="ghost" size="sm" @click="copyRoomCode" aria-label="Copier le code">
              <span v-if="copied" class="text-success">OK</span>
              <span v-else>COPY</span>
            </Button>
          </div>
          <p class="text-base text-gray-400 mt-4">
            Partagez ce code avec les autres joueurs pour qu'ils puissent rejoindre
          </p>

          <!-- Connection Status -->
          <div class="mt-4 flex items-center justify-center gap-2 text-sm">
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
        </Card>

        <!-- Instructions Section (Story 2.4) -->
        <InstructionsCard />

        <!-- Players List -->
        <Card :padding="'md'" class="animate-fade-in">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-white">Joueurs</h2>
              <span class="text-sm text-gray-400">{{ playerCount }}/10</span>
            </div>
          </template>

          <div v-if="players.length === 0" class="py-8 text-center text-gray-400">
            <div class="text-4xl mb-4">...</div>
            <p>En attente de joueurs...</p>
          </div>

          <div v-else class="space-y-3">
            <TransitionGroup name="player-list">
              <div
                v-for="player in players"
                :key="player.id"
                class="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 transition-all duration-300"
                :class="{
                  'ring-2 ring-player-cyan/50': player.id === currentPlayerId
                }"
              >
                <!-- Avatar with color border -->
                <img
                  :src="player.avatarUrl"
                  :alt="player.pseudo"
                  class="w-12 h-12 rounded-full transition-transform duration-300 hover:scale-105"
                  :style="{ borderColor: player.color, borderWidth: '3px', borderStyle: 'solid' }"
                />

                <!-- Player info -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-semibold text-white">{{ player.pseudo }}</span>
                    <span
                      v-if="player.isCreator"
                      class="text-xs px-2 py-0.5 rounded-full bg-player-cyan/20 text-player-cyan"
                    >
                      Createur
                    </span>
                    <span
                      v-if="player.id === currentPlayerId"
                      class="text-xs px-2 py-0.5 rounded-full bg-gray-600 text-gray-300"
                    >
                      Vous
                    </span>
                  </div>
                </div>

                <!-- Color indicator -->
                <div
                  class="w-4 h-4 rounded-full"
                  :style="{ backgroundColor: player.color }"
                  :title="'Couleur: ' + player.color"
                ></div>
              </div>
            </TransitionGroup>
          </div>
        </Card>

        <!-- Game Configuration Section (Story 2.4) -->
        <GameConfigCard :config="gameConfig" />

        <!-- Leave Button -->
        <div class="flex justify-center">
          <Button variant="secondary" size="lg" @click="handleLeave">
            Quitter le lobby
          </Button>
        </div>
      </div>
    </Container>
  </PageLayout>
</template>

<style scoped>
/* Player list transition animations */
.player-list-enter-active {
  transition: all 0.3s ease-out;
}

.player-list-leave-active {
  transition: all 0.3s ease-in;
}

.player-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.player-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.player-list-move {
  transition: transform 0.3s ease;
}
</style>
