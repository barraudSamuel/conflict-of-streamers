<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import LobbyDeckMap from '@/components/maps/LobbyDeckMap.vue'
import { createGameSocket, sendSocketMessage, type SocketMessage } from '@/services/socket'
import { getGame, leaveGame as leaveGameRequest } from '@/services/api'
import { clearPlayerContext, loadPlayerContext, type PlayerContext } from '@/lib/playerStorage'
import {
  Crown,
  Gamepad2,
  LogOut,
  Shield,
  SignalHigh,
  SignalLow,
  Swords,
  Users,
  PlusCircle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const game = ref<any>(null)
const loading = ref(true)
const error = ref('')
const socket = ref<WebSocket | null>(null)
const socketError = ref('')
const realtimeConnected = ref(false)
const playerConnections = ref<Record<string, boolean>>({})
const playerContext = ref<PlayerContext | null>(null)
const leavingGame = ref(false)
const leaveError = ref('')

let reconnectTimer: number | null = null
let manualDisconnect = false

const currentPlayerId = computed(() => playerContext.value?.playerId ?? '')

interface PlayerSummary {
  id: string
  twitchUsername: string
  color: string | null
  score: number
  territories: number
  isCurrent: boolean
  isAdmin: boolean
  connected: boolean
}

const territoryCounts = computed<Record<string, number>>(() => {
  if (!game.value?.territories) return {}
  const territories: any[] = Array.isArray(game.value.territories) ? game.value.territories : []
  return territories.reduce((acc: Record<string, number>, territory: any) => {
    if (territory.ownerId) {
      acc[territory.ownerId] = (acc[territory.ownerId] ?? 0) + 1
    }
    return acc
  }, {})
})

const playersSummary = computed<PlayerSummary[]>(() => {
  if (!game.value?.players) return []
  const counts = territoryCounts.value
  const source = Array.isArray(game.value.players) ? game.value.players : []

  const summaries: PlayerSummary[] = source.map((player: any): PlayerSummary => ({
    id: player.id,
    twitchUsername: player.twitchUsername ?? 'Joueur',
    color: player.color ?? null,
    score: typeof player.score === 'number' ? player.score : 0,
    territories: counts[player.id] ?? 0,
    isCurrent: player.id === currentPlayerId.value,
    isAdmin: player.id === game.value?.adminId,
    connected: playerConnections.value[player.id] === true
  }))

  return summaries.sort((a: PlayerSummary, b: PlayerSummary) => {
    if (b.territories !== a.territories) return b.territories - a.territories
    if (b.score !== a.score) return b.score - a.score
    return a.twitchUsername.localeCompare(b.twitchUsername)
  })
})

const startedAtLabel = computed(() => {
  if (!game.value?.startedAt) return 'Préparation'
  try {
    const date = new Date(game.value.startedAt)
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return 'En cours'
  }
})

const statusLabel = computed(() => {
  switch (game.value?.status) {
    case 'playing':
      return 'Partie en cours'
    case 'finished':
      return 'Partie terminée'
    case 'lobby':
    default:
      return 'Préparation'
  }
})

const connectionStatusLabel = computed(() =>
  realtimeConnected.value ? 'Connecté au serveur temps réel' : 'Reconnexion...'
)

const connectedPlayerCount = computed(() =>
  Object.values(playerConnections.value).filter(Boolean).length
)

const adminLabel = computed(() => game.value?.adminTwitchUsername ?? 'Admin')

const clearReconnectTimer = () => {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const setPlayerConnection = (playerId: string, connected: boolean) => {
  playerConnections.value = {
    ...playerConnections.value,
    [playerId]: connected
  }
}

const removePlayerConnection = (playerId: string) => {
  const { [playerId]: _removed, ...rest } = playerConnections.value
  playerConnections.value = rest
}

const ensurePlayerConnections = (players: any[]) => {
  const next: Record<string, boolean> = { ...playerConnections.value }
  const ids = new Set<string>()

  players.forEach((player: any) => {
    ids.add(player.id)
    if (!(player.id in next)) {
      next[player.id] = false
    }
  })

  Object.keys(next).forEach((id) => {
    if (!ids.has(id)) {
      delete next[id]
    }
  })

  playerConnections.value = next
}

const scheduleReconnect = () => {
  if (manualDisconnect || reconnectTimer !== null) return

  socketError.value = 'Connexion temps réel perdue. Tentative de reconnexion...'
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    setupSocket()
  }, 2000)
}

const handleSocketMessage = (message: SocketMessage) => {
  switch (message.type) {
    case 'registered':
      realtimeConnected.value = true
      socketError.value = ''
      if (Array.isArray(message.connectedPlayerIds)) {
        const next = { ...playerConnections.value }
        message.connectedPlayerIds.forEach((id: string) => {
          next[id] = true
        })
        playerConnections.value = next
      } else if (currentPlayerId.value) {
        setPlayerConnection(currentPlayerId.value, true)
      }
      sendSocketMessage(socket.value, 'game:update', { gameId })
      break
    case 'game:state':
    case 'game:started':
    case 'attack:started':
    case 'attack:updated':
    case 'attack:finished':
    case 'player:left':
    case 'player:ready':
    case 'player:kicked':
    case 'territory:assigned':
    case 'game:finished':
      if (message.game) {
        game.value = message.game
        ensurePlayerConnections(message.game.players ?? [])
        if (message.type === 'player:kicked' && message.playerId) {
          removePlayerConnection(message.playerId)
        }
      }
      break
    case 'player:connected':
      if (message.playerId) {
        setPlayerConnection(message.playerId, true)
      }
      break
    case 'player:disconnected':
      if (message.playerId) {
        setPlayerConnection(message.playerId, false)
      }
      break
    case 'player:kick-notice':
      manualDisconnect = true
      clearReconnectTimer()
      if (socket.value) {
        socket.value.close()
        socket.value = null
      }
      clearPlayerContext()
      error.value = 'Vous avez été expulsé de la partie.'
      router.replace('/')
      break
    case 'error':
      if (typeof message.error === 'string') {
        socketError.value = message.error
      }
      break
    default:
      break
  }
}

const setupSocket = () => {
  if (!playerContext.value?.playerId) return

  manualDisconnect = false
  clearReconnectTimer()

  const ws = createGameSocket({
    onOpen: () => {
      realtimeConnected.value = true
      socketError.value = ''
      const context = playerContext.value
      if (context) {
        sendSocketMessage(socket.value, 'register', {
          playerId: context.playerId,
          gameId: context.gameId
        })
      }
    },
    onMessage: handleSocketMessage,
    onError: () => {
      socketError.value = 'Erreur de connexion temps réel.'
    },
    onClose: () => {
      realtimeConnected.value = false
      socket.value = null
      if (!manualDisconnect) {
        scheduleReconnect()
      }
    }
  })

  if (ws) {
    socket.value = ws
  }
}

const fetchGame = async () => {
  try {
    loading.value = true
    const response = await getGame(gameId)
    game.value = response.game
    ensurePlayerConnections(response.game?.players ?? [])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de la partie'
  } finally {
    loading.value = false
  }
}

const handleLeaveGame = async () => {
  if (leavingGame.value || !game.value?.id) return

  leaveError.value = ''
  leavingGame.value = true

  try {
    const playerId = playerContext.value?.playerId
    if (playerId) {
      await leaveGameRequest(game.value.id, playerId)
      manualDisconnect = true
      clearReconnectTimer()
      if (socket.value) {
        socket.value.close()
        socket.value = null
      }
      clearPlayerContext()
      await router.push('/')
    }
  } catch (err) {
    leaveError.value =
      err instanceof Error ? err.message : 'Impossible de quitter la partie pour le moment.'
  } finally {
    leavingGame.value = false
  }
}

watch(
  () => game.value?.status,
  (status) => {
    if (!status || !game.value?.id) return
    if (status === 'lobby') {
      router.replace(`/lobby/${game.value.id}`)
    }
  }
)

onMounted(async () => {
  const storedContext = loadPlayerContext()

  if (!storedContext || storedContext.gameId !== gameId) {
    error.value = 'Impossible de retrouver votre session. Veuillez rejoindre la partie.'
    loading.value = false
    await router.replace('/')
    return
  }

  playerContext.value = storedContext
  await fetchGame()

  if (game.value?.status === 'lobby') {
    await router.replace(`/lobby/${game.value.id}`)
    return
  }

  setupSocket()
})

onBeforeUnmount(() => {
  manualDisconnect = true
  clearReconnectTimer()
  if (socket.value) {
    socket.value.close()
    socket.value = null
  }
})
</script>

<template>
  <div class="relative min-h-screen bg-slate-950 text-slate-100">
    <div v-if="loading" class="flex min-h-screen items-center justify-center">
      <p class="text-lg text-slate-300">Chargement de la partie...</p>
    </div>

    <div v-else-if="error" class="flex min-h-screen items-center justify-center px-4">
      <div class="space-y-4 text-center">
        <p class="text-lg text-red-400">{{ error }}</p>
        <Button variant="secondary" @click="router.push('/')">Retour à l'accueil</Button>
      </div>
    </div>

    <div v-else-if="game" class="relative min-h-screen">
      <div class="absolute inset-0">
        <LobbyDeckMap
          appearance="game"
          :territories="game.territories ?? []"
          :players="game.players ?? []"
          :current-player-id="currentPlayerId"
          :disable-interaction="true"
        />
      </div>

      <div class="pointer-events-none absolute inset-0 flex flex-col">
        <header class="pointer-events-auto mx-auto mt-6 w-full max-w-5xl rounded-3xl bg-slate-900/75 px-6 py-5 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-lg font-semibold uppercase tracking-wide text-slate-200">
                <Gamepad2 class="size-5 text-primary" />
                <span>{{ statusLabel }}</span>
              </div>
              <div class="text-sm text-slate-300">
                <span class="font-semibold text-slate-100">Code:</span>
                <span class="ml-2 font-mono tracking-[0.3em] text-slate-200">{{ game.code }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <div class="flex items-center gap-2">
                  <Crown class="size-4 text-yellow-400" />
                  <span>Host: <span class="font-semibold text-slate-100">{{ adminLabel }}</span></span>
                </div>
                <div class="flex items-center gap-2">
                  <Users class="size-4 text-emerald-300" />
                  <span>{{ playersSummary.length }} joueurs ({{ connectedPlayerCount }}/{{ playersSummary.length }} connectés)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="size-2 rounded-full" :class="realtimeConnected ? 'bg-emerald-400' : 'bg-amber-300'"></span>
                  <span>{{ connectionStatusLabel }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 text-sm text-slate-300">
              <div class="flex items-center gap-2">
                <component :is="realtimeConnected ? SignalHigh : SignalLow" class="size-5" />
                <span>Début: {{ startedAtLabel }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  class="pointer-events-auto"
                  @click="handleLeaveGame"
                  :disabled="leavingGame"
                >
                  <LogOut class="size-4" />
                  <span v-if="!leavingGame">Quitter la partie</span>
                  <span v-else>Déconnexion...</span>
                </Button>
              </div>
              <p v-if="leaveError" class="text-xs text-red-400">{{ leaveError }}</p>
              <p v-else-if="socketError" class="text-xs text-amber-300">{{ socketError }}</p>
            </div>
          </div>
        </header>

        <main class="relative flex flex-1">
          <aside class="pointer-events-auto absolute left-4 right-4 top-[180px] z-10 mx-auto flex w-full max-w-md flex-col gap-4 sm:left-6 sm:right-auto sm:top-28 sm:w-80">
            <div class="rounded-3xl bg-slate-900/80 p-5 shadow-lg ring-1 ring-white/10 backdrop-blur">
              <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  <Users class="size-4 text-emerald-300" />
                  <span>Joueurs</span>
                </div>
                <span class="text-xs text-slate-400">Classement provisoire</span>
              </div>
              <ul class="space-y-3">
                <li
                  v-for="player in playersSummary"
                  :key="player.id"
                  class="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-3 ring-1 ring-white/5 transition hover:ring-white/15"
                  :class="player.isCurrent ? 'outline outline-1 outline-primary/80' : ''"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="size-3 rounded-full ring-2 ring-white/30"
                      :style="{ backgroundColor: player.color || '#94a3b8' }"
                    ></span>
                    <div class="flex flex-col leading-tight">
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
                  <span
                    class="size-2 rounded-full"
                    :class="player.connected ? 'bg-emerald-400' : 'bg-slate-500'"
                    :title="player.connected ? 'Connecté' : 'Déconnecté'"
                  ></span>
                </li>
              </ul>
            </div>
          </aside>

          <section class="pointer-events-none flex flex-1 flex-col justify-end">
            <div class="pointer-events-auto mx-auto mb-8 w-full max-w-4xl space-y-4 rounded-3xl bg-slate-900/80 px-6 py-5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
              <div class="flex items-center justify-between flex-wrap gap-3 text-sm text-slate-300">
                <div class="flex items-center gap-2 font-semibold uppercase tracking-wide text-slate-200">
                  <Swords class="size-5 text-primary" />
                  <span>Commandes de jeu</span>
                </div>
                <span class="text-xs text-slate-400">Gameplay bientôt disponible</span>
              </div>
              <div class="flex flex-wrap items-center justify-center gap-4">
                <Button variant="secondary" size="lg" disabled class="h-12 px-8 text-base opacity-70">
                  <Swords class="size-5" />
                  Attaquer
                </Button>
                <Button variant="secondary" size="lg" disabled class="h-12 px-8 text-base opacity-70">
                  <Shield class="size-5" />
                  Défendre
                </Button>
                <Button variant="secondary" size="lg" disabled class="h-12 px-8 text-base opacity-70">
                  <PlusCircle class="size-5" />
                  Renforcer
                </Button>
              </div>
              <p class="text-center text-xs text-slate-300">
                Les commandes seront activées prochainement. Préparez votre stratégie pendant la phase de pré-production.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>
