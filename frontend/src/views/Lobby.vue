<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getGame,
  startGame as startGameRequest,
  leaveGame as leaveGameRequest,
  assignTerritory
} from '@/services/api'
import { createGameSocket, sendSocketMessage, type SocketMessage } from '@/services/socket'
import { clearPlayerContext, loadPlayerContext, type PlayerContext } from '@/lib/playerStorage'
import LobbyDeckMap from '@/components/maps/LobbyDeckMap.vue'
import {
  Gamepad2,
  Crown,
  Users,
  Settings,
  Copy,
  LogOut,
  ListTodo,
  OctagonMinus,
  Map
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const game = ref<any>(null)
const loading = ref(true)
const error = ref('')
const startingGame = ref(false)
const startError = ref('')
const leavingGame = ref(false)
const leaveError = ref('')
const playerContext = ref<PlayerContext | null>(null)
const socket = ref<WebSocket | null>(null)
const socketError = ref('')
const realtimeConnected = ref(false)
const playerConnections = ref<Record<string, boolean>>({})
const kickingPlayerId = ref<string | null>(null)

let reconnectTimer: number | null = null
let manualDisconnect = false

const clearReconnectTimer = () => {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const scheduleReconnect = () => {
  if (manualDisconnect || reconnectTimer !== null) return

  socketError.value = 'Connexion temps réel perdue. Tentative de reconnexion...'
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    setupSocket()
  }, 2000)
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
      } else if (playerContext.value?.playerId) {
        setPlayerConnection(playerContext.value.playerId, true)
      }
      sendSocketMessage(socket.value, 'game:update', { gameId })
      break
    case 'game:state':
    case 'player:left':
    case 'player:ready':
    case 'territory:assigned':
    case 'game:started':
    case 'attack:finished':
      if (message.game) {
        game.value = message.game
        ensurePlayerConnections(message.game.players ?? [])
      }
      if (message.type === 'player:left' && message.playerId) {
        removePlayerConnection(message.playerId)
        if (kickingPlayerId.value === message.playerId) {
          kickingPlayerId.value = null
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
    case 'player:kicked':
      if (message.game) {
        game.value = message.game
        ensurePlayerConnections(message.game.players ?? [])
      }
      if (message.playerId) {
        removePlayerConnection(message.playerId)
        if (kickingPlayerId.value === message.playerId) {
          kickingPlayerId.value = null
        }
        if (message.playerId === currentPlayerId.value) {
          manualDisconnect = true
          clearReconnectTimer()
          if (socket.value) {
            socket.value.close()
            socket.value = null
          }
          clearPlayerContext()
          error.value = 'Vous avez été expulsé de la partie.'
          router.replace('/')
        }
      }
      break
    case 'player:kick-notice':
      kickingPlayerId.value = null
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
      kickingPlayerId.value = null
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

const maxPlayers = computed(() => game.value?.settings?.maxPlayers ?? 8)
const playerCount = computed(() => game.value?.players?.length ?? 0)
const emptySlots = computed(() => Math.max(maxPlayers.value - playerCount.value, 0))
const territoriesByOwner = computed<Record<string, number>>(() => {
  if (!game.value?.territories) return {}
  return (game.value.territories as any[]).reduce((acc: Record<string, number>, territory: any) => {
    if (territory.ownerId) {
      acc[territory.ownerId] = (acc[territory.ownerId] ?? 0) + 1
    }
    return acc
  }, {})
})
const territoryNameByOwner = computed<Record<string, string>>(() => {
  if (!game.value?.territories) return {}
  return (game.value.territories as any[]).reduce((acc: Record<string, string>, territory: any) => {
    if (territory.ownerId) {
      acc[territory.ownerId] = territory.name || territory.id
    }
    return acc
  }, {})
})
const selectedCountriesCount = computed(() => {
  if (!game.value?.players) return 0
  return game.value.players.filter((player: any) => territoriesByOwner.value[player.id]).length
})

const minPlayersMet = computed(() => playerCount.value >= 2)
const countriesRequirementMet = computed(
  () => playerCount.value > 0 && selectedCountriesCount.value === playerCount.value
)
const meetsStartRequirements = computed(() => minPlayersMet.value && countriesRequirementMet.value)
const currentPlayerId = computed(() => playerContext.value?.playerId ?? '')
const isCurrentPlayerAdmin = computed(
  () => Boolean(game.value?.adminId) && currentPlayerId.value === game.value.adminId
)
const canStart = computed(
  () =>
    isCurrentPlayerAdmin.value && game.value?.status === 'lobby' && meetsStartRequirements.value
)

const currentPlayerTerritory = computed(() => {
  if (!game.value?.territories) return null
  return (game.value.territories as any[]).find(
    (territory: any) => territory.ownerId === currentPlayerId.value
  )
})
const currentPlayerTerritoryName = computed(() => currentPlayerTerritory.value?.name ?? '')
const canSelectTerritory = computed(
  () => game.value?.status === 'lobby' && Boolean(playerContext.value?.playerId)
)

const territorySelectionError = ref('')
const selectingTerritory = ref(false)

const source = computed(() => game.value?.code ?? '')
const { copy, copied } = useClipboard({ source })

const fetchGame = async () => {
  try {
    loading.value = true
    const response = await getGame(gameId)
    game.value = response.game
    ensurePlayerConnections(response.game?.players ?? [])
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement de la partie'
  } finally {
    loading.value = false
  }
}

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

const handleLeaveGame = async () => {
  if (leavingGame.value) return

  leaveError.value = ''
  leavingGame.value = true

  try {
    const playerId = playerContext.value?.playerId

    if (game.value?.id && playerId) {
      await leaveGameRequest(game.value.id, playerId)
      sendSocketMessage(socket.value, 'game:update', { gameId: game.value.id })
    }

    manualDisconnect = true
    clearReconnectTimer()
    if (socket.value) {
      socket.value.close()
      socket.value = null
    }
    realtimeConnected.value = false

    clearPlayerContext()
    await router.push('/')
  } catch (err) {
    leaveError.value =
      err instanceof Error ? err.message : 'Impossible de quitter la partie pour le moment.'
  } finally {
    leavingGame.value = false
  }
}

const playerHasTerritory = (playerId: string) => Boolean(territoriesByOwner.value[playerId])
const playerTerritoryName = (playerId: string) => territoryNameByOwner.value[playerId] ?? ''
const isPlayerConnected = (playerId: string) => playerConnections.value[playerId] === true
const isCurrentPlayer = (playerId: string) => playerId === currentPlayerId.value

const kickPlayer = (targetId: string) => {
  if (!isCurrentPlayerAdmin.value || !targetId || targetId === currentPlayerId.value) return
  if (!socket.value || socket.value.readyState === WebSocket.CLOSING || socket.value.readyState === WebSocket.CLOSED) {
    socketError.value = 'Connexion temps réel indisponible. Réessayez après reconnexion.'
    kickingPlayerId.value = null
    return
  }
  kickingPlayerId.value = targetId
  sendSocketMessage(socket.value, 'player:kick', { targetId })
}

const handleStartGame = async () => {
  if (!game.value || !canStart.value || startingGame.value) return

  startError.value = ''
  startingGame.value = true

  try {
    const response = await startGameRequest(game.value.id, currentPlayerId.value)
    game.value = response.game
    ensurePlayerConnections(response.game?.players ?? [])
    if (response.game?.id) {
      sendSocketMessage(socket.value, 'game:update', { gameId: response.game.id })
    }
  } catch (err) {
    startError.value =
      err instanceof Error ? err.message : 'Impossible de démarrer la partie pour le moment.'
  } finally {
    startingGame.value = false
  }
}

const handleTerritorySelect = async (territoryId: string) => {
  territorySelectionError.value = ''

  if (!game.value || !canSelectTerritory.value || selectingTerritory.value) {
    return
  }

  const playerId = playerContext.value?.playerId
  if (!playerId) {
    territorySelectionError.value = 'Session invalide. Veuillez recharger la page.'
    return
  }

  const territories: any[] = Array.isArray(game.value.territories) ? game.value.territories : []
  const targetTerritory = territories.find((territory: any) => territory.id === territoryId)

  if (!targetTerritory) {
    territorySelectionError.value = 'Territoire inconnu.'
    return
  }

  if (targetTerritory.ownerId && targetTerritory.ownerId !== playerId) {
    territorySelectionError.value = 'Ce territoire est déjà contrôlé par un autre joueur.'
    return
  }

  if (targetTerritory.ownerId === playerId) {
    return
  }

  selectingTerritory.value = true

  try {
    const response = await assignTerritory(game.value.id, playerId, territoryId)
    game.value = response.game
    ensurePlayerConnections(response.game?.players ?? [])

    if (response.game?.id) {
      sendSocketMessage(socket.value, 'game:update', { gameId: response.game.id })
    }
  } catch (err) {
    territorySelectionError.value =
      err instanceof Error ? err.message : 'Impossible de sélectionner ce territoire.'
  } finally {
    selectingTerritory.value = false
  }
}
</script>

<template>
  <div class="min-h-screen container mx-auto px-4 py-8 md:py-12">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <p class="text-lg text-slate-400">Chargement...</p>
    </div>

    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <p class="text-lg text-red-400 mb-4">{{ error }}</p>
        <Button @click="router.push('/')" variant="secondary">Retour à l'accueil</Button>
      </div>
    </div>

    <div v-else-if="game" class="max-w-[1600px] mx-auto space-y-6">
      <Card>
        <CardContent>
          <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-2xl font-bold">
                <Gamepad2 class="w-8 h-8" />
                <span>Code: {{ game.code }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <Crown class="w-4 h-4 text-yellow-500" />
                <span class="text-lg"
                  >Créée par
                  <span class="text-primary font-bold">{{
                    game.adminTwitchUsername || 'Admin'
                  }}</span></span
                >
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <span class="inline-block w-4 h-4 bg-slate-600 rounded-sm"></span>
                <span>Statut: {{ game.status === 'playing' ? '⚔️ En cours' : '😴 En attente' }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button variant="outline" @click="copy(source)">
                <Copy class="w-4 h-4 mr-2" />
                <span v-if="!copied">COPIER CODE</span>
                <span v-else>CODE COPIÉ !</span>
              </Button>
              <Button
                @click="handleLeaveGame"
                variant="destructive"
                :disabled="leavingGame"
              >
                <LogOut class="w-4 h-4 mr-2" />
                <span v-if="!leavingGame">Quitter</span>
                <span v-else>Déconnexion...</span>
              </Button>
            </div>
            <p v-if="leaveError" class="text-sm text-destructive">
              {{ leaveError }}
            </p>
            <p v-else-if="socketError" class="text-sm text-amber-400">
              {{ socketError }}
            </p>
          </div>
        </CardContent>
      </Card>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Map class="size-6" />
                Choisissez votre pays de départ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="relative rounded-lg overflow-hidden">
                <LobbyDeckMap
                  :territories="game.territories ?? []"
                  :players="game.players ?? []"
                  :current-player-id="currentPlayerId"
                  :disable-interaction="!canSelectTerritory || selectingTerritory"
                  @select="handleTerritorySelect"
                />

                <div class="pointer-events-none absolute top-4 left-4 flex">
                  <div class="pointer-events-auto flex gap-3 rounded-xl bg-slate-900/75 px-4 py-3 text-xs text-slate-300 backdrop-blur">
                    <div class="flex items-center gap-2">
                      <div class="size-3 rounded-sm bg-slate-500/70"></div>
                      <span>Disponible</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div
                        class="size-3 rounded-sm"
                        style="background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ec4899)"
                      ></div>
                      <span>Occupé</span>
                    </div>
                  </div>
                </div>

              </div>

              <div class="mt-4 space-y-2 text-sm text-muted-foreground">
                <p v-if="territorySelectionError" class="text-destructive">
                  {{ territorySelectionError }}
                </p>
                <p v-else-if="selectingTerritory" class="flex items-center gap-2 text-foreground">
                  <span class="size-4 animate-spin rounded-full border-2 border-muted/40 border-t-foreground"></span>
                  <span>Sélection du territoire en cours...</span>
                </p>
                <p v-else-if="!canSelectTerritory" class="text-muted-foreground">
                  La sélection est verrouillée pendant la partie. Patientez jusqu'à la prochaine manche.
                </p>
                <p v-else-if="currentPlayerTerritoryName">
                  🌍 Vous contrôlez actuellement <span class="font-semibold text-foreground">{{ currentPlayerTerritoryName }}</span>.
                </p>
                <p v-else>
                  ⚠️ Aucun territoire attribué pour l'instant. Sélectionnez un pays pour être prêt au lancement.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card v-if="isCurrentPlayerAdmin">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Settings class="size-6" />
                Paramètres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="text-base font-medium mb-3">Durées des Actions (secondes)</div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2"> ⚔️ Durée Attaque </label>
                    <Input
                      type="number"
                      :value="game.settings?.attackDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                      readonly
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2"> 🛡️ Durée Défense </label>
                    <Input
                      type="number"
                      :value="game.settings?.defenseDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                      readonly
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2"> 💪 Durée Renfort </label>
                    <Input
                      type="number"
                      :value="game.settings?.reinforcementDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                      readonly
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card v-else class="border-dashed">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <OctagonMinus class="size-6" />
                Paramètres verrouillés
              </CardTitle>
            </CardHeader>
            <CardContent class="text-sm text-muted-foreground">
              Seul le créateur de la partie peut consulter ou modifier les paramètres. Assurez-vous
              d'avoir sélectionné votre pays et attendez son signal pour démarrer.
            </CardContent>
          </Card>
        </div>

        <div class="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Users class="size-6" />
                Joueurs ({{ playerCount }}/{{ maxPlayers }})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <template v-for="player in game.players" :key="player.id">
                  <div
                    class="bg-accent rounded-lg p-2 border-2 transition-colors"
                    :class="isCurrentPlayer(player.id) ? 'border-primary/70 bg-primary/10' : 'border-transparent'"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        :style="{ backgroundColor: player.color }"
                      >
                        {{ (player.twitchUsername || 'P')[0].toUpperCase() }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold">{{ player.twitchUsername }}</span>
                          <Crown v-if="player.isAdmin" class="w-4 h-4 text-yellow-500" />
                          <span
                            v-if="isCurrentPlayer(player.id)"
                            class="text-xs uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold"
                          >
                            Vous
                          </span>
                        </div>
                        <div
                          class="mt-1 flex items-center gap-2 text-xs"
                          :class="isPlayerConnected(player.id) ? 'text-emerald-400' : 'text-slate-400'"
                        >
                          <span
                            class="size-2 rounded-full"
                            :class="
                              isPlayerConnected(player.id) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            "
                          ></span>
                          <span>{{ isPlayerConnected(player.id) ? 'En ligne' : 'Hors ligne' }}</span>
                        </div>
                        <div class="text-sm text-muted-foreground flex items-center gap-1">
                          <template v-if="playerHasTerritory(player.id)">
                            {{ playerTerritoryName(player.id) }}
                          </template>
                          <template v-else>⏳ Choix en cours...</template>
                        </div>
                      </div>
                      <Button
                        v-if="isCurrentPlayerAdmin && !isCurrentPlayer(player.id)"
                        variant="destructive"
                        size="sm"
                        class="shrink-0"
                        :disabled="kickingPlayerId === player.id"
                        @click="kickPlayer(player.id)"
                      >
                        <span v-if="kickingPlayerId === player.id">Expulsion...</span>
                        <span v-else>Expulser</span>
                      </Button>
                    </div>
                  </div>
                </template>

                <template v-for="_i in emptySlots" :key="`empty-${_i}`">
                  <div class="bg-accent bg-opacity-50 rounded-lg p-2 border-2 border-dashed">
                    <div class="flex items-center gap-3">
                      <div class="size-10 bg-muted-foreground rounded-full flex items-center justify-center">
                        <Users class="size-5" />
                      </div>
                      <div class="flex-1">
                        <div class="flex text-sm text-muted-foreground items-center gap-2">
                          ⏳ En attente d'un joueur...
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <ListTodo class="size-6" />
                Statut de préparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="flex items-center gap-2">
                      📍 Pays sélectionnés:
                    </span>
                    <span
                      class="font-semibold"
                      :class="countriesRequirementMet ? 'text-green-500' : 'text-destructive'"
                    >
                      {{ selectedCountriesCount }}/{{ playerCount }}
                    </span>
                  </div>
                </div>

                <Button
                  v-if="isCurrentPlayerAdmin"
                  @click="handleStartGame"
                  class="w-full"
                  size="lg"
                  :disabled="!canStart || startingGame"
                >
                  <template v-if="startingGame">🚀 Démarrage...</template>
                  <template v-else>🚀 DÉMARRER LA CONQUÊTE !</template>
                </Button>

                <div v-else class="text-sm text-muted-foreground text-left italic">
                  En attente du créateur pour le lancement.
                </div>

                <div class="space-y-2 text-sm text-muted-foreground">
                  <div v-if="playerCount < 2" class="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>au moins 2 joueurs requis</span>
                  </div>
                  <div v-if="selectedCountriesCount < playerCount" class="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>Tous les joueurs doivent choisir un pays</span>
                  </div>
                  <div v-if="startError" class="flex items-start gap-2 text-destructive">
                    <span>⚠️</span>
                    <span>{{ startError }}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
