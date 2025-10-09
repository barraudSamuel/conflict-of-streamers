<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Button} from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {Kbd} from '@/components/ui/kbd'
import {ScrollArea} from '@/components/ui/scroll-area'
import LobbyDeckMap from '@/components/maps/LobbyDeckMap.vue'
import {createGameSocket, sendSocketMessage, type SocketMessage} from '@/services/socket'
import {getGame, leaveGame as leaveGameRequest, validateAttack} from '@/services/api'
import {clearPlayerContext, loadPlayerContext, type PlayerContext} from '@/lib/playerStorage'
import {
  LogOut,
  SignalHigh,
  SignalLow,
  Swords,
  Users,
  OctagonMinus
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
const scoreboardVisible = ref(false)
const selectedOwnedTerritoryId = ref<string | null>(null)
const targetTerritoryId = ref<string | null>(null)
const attackError = ref('')
const attackLoading = ref(false)
const lastAttackResult = ref<{ attack: any; outcome: 'win' | 'loss' | 'draw' } | null>(null)

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

const connectionStatusLabel = computed(() =>
    realtimeConnected.value ? 'Connecté au serveur temps réel' : 'Reconnexion...'
)

const connectedPlayerCount = computed(() =>
    Object.values(playerConnections.value).filter(Boolean).length
)

const adminLabel = computed(() => game.value?.adminTwitchUsername ?? 'Admin')

const gameStatusLabel = computed(() => {
  const status = game.value?.status
  if (!status || typeof status !== 'string') return 'Inconnu'
  const map: Record<string, string> = {
    lobby: 'Lobby',
    'in-progress': 'En cours',
    finished: 'Terminé'
  }
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
})

const gameInfoItems = computed(() => {
  const items: { label: string; value: string }[] = []
  const name = typeof game.value?.name === 'string' ? game.value.name.trim() : ''
  if (name) {
    items.push({ label: 'Partie', value: name })
  }
  items.push(
      { label: 'Host', value: adminLabel.value },
      { label: 'Statut', value: gameStatusLabel.value },
      {
        label: 'Connectés',
        value: `${connectedPlayerCount.value}/${playersSummary.value.length}`
      }
  )
  const roundNumber = game.value?.roundNumber
  if (typeof roundNumber === 'number') {
    items.push({ label: 'Manche', value: `#${roundNumber}` })
  }
  const phase = typeof game.value?.phase === 'string' ? game.value.phase.trim() : ''
  if (phase) {
    items.push({ label: 'Phase', value: phase })
  }
  return items
})

const playersById = computed(() => {
  const registry = new Map<string, any>()
  if (!Array.isArray(game.value?.players)) {
    return registry
  }

  game.value.players.forEach((player: any) => {
    if (player?.id) {
      registry.set(player.id, player)
    }
  })

  return registry
})

const territoriesById = computed(() => {
  const registry = new Map<string, any>()
  if (!Array.isArray(game.value?.territories)) {
    return registry
  }

  game.value.territories.forEach((territory: any) => {
    if (territory?.id) {
      registry.set(territory.id, territory)
    }
  })

  return registry
})

const getTerritory = (territoryId: string | null | undefined) => {
  if (!territoryId) return null
  return territoriesById.value.get(territoryId) ?? null
}

const currentPlayerColor = computed(() => {
  const player = playersById.value.get(currentPlayerId.value)
  if (player && typeof player.color === 'string' && player.color.trim() !== '') {
    return player.color
  }
  return '#22c55e'
})

const otherPlayerLegendEntries = computed(() => {
  const seenColors = new Set<string>()
  const entries: Array<{ id: string; label: string; color: string }> = []

  playersSummary.value.forEach((player) => {
    if (player.isCurrent) return
    const color = typeof player.color === 'string' && player.color.trim() !== '' ? player.color : '#94a3b8'
    if (seenColors.has(color)) return
    seenColors.add(color)
    entries.push({
      id: player.id,
      label: player.twitchUsername ?? 'Joueur',
      color
    })
  })

  if (entries.length === 0) {
    entries.push({
      id: 'others',
      label: 'Autres joueurs',
      color: '#64748b'
    })
  }

  return entries
})

const BOT_LEGEND_COLOR = '#64748b'

const selectedOwnedTerritory = computed(() => getTerritory(selectedOwnedTerritoryId.value))
const targetTerritory = computed(() => getTerritory(targetTerritoryId.value))

const selectedOwnedNeighbors = computed<any[]>(() => {
  const selected = selectedOwnedTerritory.value
  if (!selected || !Array.isArray(selected.neighbors)) return []
  return selected.neighbors
    .map((id: string) => getTerritory(id))
    .filter((item): item is any => item !== null)
})

const potentialTargets = computed(() =>
  selectedOwnedNeighbors.value.filter(
    (territory) => territory.ownerId !== currentPlayerId.value
  )
)

const targetOwner = computed(() =>
  targetTerritory.value?.ownerId ? playersById.value.get(targetTerritory.value.ownerId) ?? null : null
)

const activeAttacks = computed<any[]>(() =>
  Array.isArray(game.value?.activeAttacks) ? game.value.activeAttacks : []
)

const currentAttack = computed<any | null>(() =>
  activeAttacks.value.find((attack) => attack.attackerId === currentPlayerId.value) ?? null
)

const defendingAttack = computed<any | null>(() =>
  activeAttacks.value.find((attack) => attack.defenderId === currentPlayerId.value) ?? null
)

const attackSettings = computed(() => game.value?.settings ?? {})
const attackDurationSeconds = computed(
  () => Number(attackSettings.value?.attackDuration) || 0
)

const attackCommandLabel = computed(() => {
  const name = currentAttack.value?.toTerritoryName ?? targetTerritory.value?.name
  if (!name || typeof name !== 'string') return ''
  return `!attaque ${name}`
})

const defenseCommandLabel = computed(() => {
  const name = defendingAttack.value?.toTerritoryName ?? targetTerritory.value?.name
  if (!name || typeof name !== 'string') return ''
  return `!defend ${name}`
})

const canLaunchAttack = computed(() => {
  if (!playerContext.value?.playerId) return false
  if (currentAttack.value) return false
  const origin = selectedOwnedTerritory.value
  const target = targetTerritory.value
  if (!origin || !target) return false
  if (target.ownerId === currentPlayerId.value) return false
  if (target.isUnderAttack) return false

  const neighbors = Array.isArray(origin.neighbors) ? origin.neighbors : []
  return neighbors.includes(target.id)
})

const attackCTAEnabled = computed(() => canLaunchAttack.value && !attackLoading.value)

const currentAttackStats = computed(() => {
  const attack = currentAttack.value
  if (!attack) return null

  const attackerCount =
    typeof attack.participantCount?.attackers === 'number'
      ? attack.participantCount.attackers
      : Array.isArray(attack.participantAttackers)
        ? attack.participantAttackers.length
        : 0

  return {
    attack,
    remaining: Number(attack.remainingTime) || 0,
    messages: Number(attack.attackMessages) || 0,
    participants: attackerCount,
    attackPoints: Number(attack.attackPoints) || 0,
    defensePoints: Number(attack.defensePoints) || 0,
    baseDefense: Number(attack.baseDefense) || 0
  }
})

const currentAttackProgress = computed(() => {
  const stats = currentAttackStats.value
  if (!stats) return 0
  const denominator = Math.max(1, stats.defensePoints || stats.baseDefense || 1)
  return Math.max(0, Math.min(100, Math.round((stats.attackPoints / denominator) * 100)))
})

const defendingAttackStats = computed(() => {
  const attack = defendingAttack.value
  if (!attack) return null

  const defenderCount =
    typeof attack.participantCount?.defenders === 'number'
      ? attack.participantCount.defenders
      : Array.isArray(attack.participantDefenders)
        ? attack.participantDefenders.length
        : 0

  return {
    attack,
    remaining: Number(attack.remainingTime) || 0,
    messages: Number(attack.defenseMessages) || 0,
    participants: defenderCount,
    attackPoints: Number(attack.attackPoints) || 0,
    defensePoints: Number(attack.defensePoints) || 0,
    baseDefense: Number(attack.baseDefense) || 0
  }
})

const defendingAttackProgress = computed(() => {
  const stats = defendingAttackStats.value
  if (!stats) return 0
  const denominator = Math.max(1, stats.defensePoints || stats.baseDefense || 1)
  return Math.max(0, Math.min(100, Math.round((stats.defensePoints / denominator) * 100)))
})

const currentAttackEncouragement = computed(() => {
  if (!currentAttack.value) return ''
  const territoryName =
    currentAttack.value.toTerritoryName ?? currentAttack.value.toTerritory ?? 'le territoire'
  return `Tapez ${attackCommandLabel.value} dans le chat pour booster l'attaque sur ${territoryName} !`
})

const defendingEncouragement = computed(() => {
  if (!defendingAttack.value) return ''
  const territoryName =
    defendingAttack.value.toTerritoryName ?? defendingAttack.value.toTerritory ?? 'ce territoire'
  return `Tapez ${defenseCommandLabel.value} dans le chat pour défendre ${territoryName} !`
})

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
  const {[playerId]: _removed, ...rest} = playerConnections.value
  playerConnections.value = rest
}

const ensurePlayerConnections = (players: any[]) => {
  const next: Record<string, boolean> = {...playerConnections.value}
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

const applyAttackUpdate = (attackPayload: any, territoryId: string) => {
  if (!game.value) return

  const current = game.value
  const incoming = { territoryId, ...attackPayload }

  const activeAttacks = Array.isArray(current.activeAttacks) ? [...current.activeAttacks] : []
  const index = activeAttacks.findIndex((entry: any) => entry.territoryId === territoryId)

  if (index >= 0) {
    activeAttacks[index] = { ...activeAttacks[index], ...incoming }
  } else {
    activeAttacks.push(incoming)
  }

  const territories = Array.isArray(current.territories)
    ? current.territories.map((territory: any) =>
        territory.id === territoryId ? { ...territory, isUnderAttack: true } : territory
      )
    : current.territories

  game.value = {
    ...current,
    activeAttacks,
    territories
  }
}

const removeAttackFromState = (territoryId: string) => {
  if (!game.value) return
  const current = game.value

  const activeAttacks = Array.isArray(current.activeAttacks)
    ? current.activeAttacks.filter((entry: any) => entry.territoryId !== territoryId)
    : current.activeAttacks

  const territories = Array.isArray(current.territories)
    ? current.territories.map((territory: any) =>
        territory.id === territoryId ? { ...territory, isUnderAttack: false } : territory
      )
    : current.territories

  game.value = {
    ...current,
    activeAttacks,
    territories
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

const handleSocketMessage = (message: SocketMessage) => {
  switch (message.type) {
    case 'registered':
      realtimeConnected.value = true
      socketError.value = ''
      if (Array.isArray(message.connectedPlayerIds)) {
        const next = {...playerConnections.value}
        message.connectedPlayerIds.forEach((id: string) => {
          next[id] = true
        })
        playerConnections.value = next
      } else if (currentPlayerId.value) {
        setPlayerConnection(currentPlayerId.value, true)
      }
      sendSocketMessage(socket.value, 'game:update', {gameId})
      break
    case 'attack:started':
      if (message.attack && message.territoryId) {
        applyAttackUpdate(message.attack, message.territoryId)
        if (message.attack.attackerId === currentPlayerId.value) {
          selectedOwnedTerritoryId.value = null
          targetTerritoryId.value = null
          lastAttackResult.value = null
        }
      }
      if (message.game) {
        game.value = message.game
        ensurePlayerConnections(message.game.players ?? [])
      }
      break
    case 'attack:update':
      if (message.attack && message.territoryId) {
        applyAttackUpdate(message.attack, message.territoryId)
      }
      if (message.game) {
        game.value = message.game
        ensurePlayerConnections(message.game.players ?? [])
      }
      break
    case 'attack:finished':
      if (message.attack && message.territoryId) {
        removeAttackFromState(message.territoryId)
      }
      if (message.game) {
        game.value = message.game
        ensurePlayerConnections(message.game.players ?? [])
      }
      if (message.attack) {
        const isAttacker = message.attack.attackerId === currentPlayerId.value
        const isDefender = message.attack.defenderId === currentPlayerId.value

        if (isAttacker || isDefender) {
          let outcome: 'win' | 'loss' | 'draw' = 'draw'
          if (message.attack.winner === currentPlayerId.value) {
            outcome = 'win'
          } else if (message.attack.winner && message.attack.winner !== currentPlayerId.value) {
            outcome = 'loss'
          }
          lastAttackResult.value = {
            attack: message.attack,
            outcome
          }
        }
      }
      break
    case 'game:state':
    case 'game:started':
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

const cancelSelection = () => {
  selectedOwnedTerritoryId.value = null
  targetTerritoryId.value = null
  attackError.value = ''
}

const handleTerritorySelect = (territoryId: string) => {
  attackError.value = ''

  const territory = getTerritory(territoryId)
  if (!territory) return

  if (territory.ownerId === currentPlayerId.value) {
    selectedOwnedTerritoryId.value = territoryId

    if (
      targetTerritoryId.value &&
      (!Array.isArray(territory.neighbors) ||
        !territory.neighbors.includes(targetTerritoryId.value))
    ) {
      targetTerritoryId.value = null
    }
    return
  }

  if (!selectedOwnedTerritoryId.value) {
    attackError.value = 'Sélectionnez d\'abord un de vos territoires.'
    return
  }

  const origin = getTerritory(selectedOwnedTerritoryId.value)
  if (!origin) {
    cancelSelection()
    return
  }

  if (territory.ownerId === currentPlayerId.value) {
    attackError.value = 'Ce territoire vous appartient déjà.'
    return
  }

  const neighbors = Array.isArray(origin.neighbors) ? origin.neighbors : []
  if (!neighbors.includes(territoryId)) {
    attackError.value = 'Vous ne pouvez attaquer que des territoires limitrophes.'
    return
  }

  if (territory.isUnderAttack) {
    attackError.value = 'Ce territoire est déjà sous attaque.'
    return
  }

  targetTerritoryId.value = territoryId
}

const selectTargetFromList = (territoryId: string) => {
  handleTerritorySelect(territoryId)
}

const getPlayerUsername = (playerId?: string | null) => {
  if (!playerId) return null
  if (typeof playerId === 'string' && playerId.startsWith('bot:')) {
    return 'Faction IA'
  }
  const player = playersById.value.get(playerId)
  return player?.twitchUsername ?? null
}

const launchAttack = async () => {
  if (!canLaunchAttack.value || !playerContext.value?.playerId) {
    return
  }

  const originId = selectedOwnedTerritoryId.value
  const targetId = targetTerritoryId.value

  if (!originId || !targetId) return

  attackError.value = ''
  attackLoading.value = true

  try {
    await validateAttack(gameId, playerContext.value.playerId, originId, targetId)
    sendSocketMessage(socket.value, 'attack:start', {
      attackerId: playerContext.value.playerId,
      fromTerritory: originId,
      toTerritory: targetId
    })
  } catch (err) {
    attackError.value =
      err instanceof Error ? err.message : 'Impossible de lancer l\'attaque pour le moment.'
  } finally {
    attackLoading.value = false
  }
}

const handleTabKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return
  event.preventDefault()
  if (!scoreboardVisible.value) {
    scoreboardVisible.value = true
  }
}

const handleTabKeyUp = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return
  event.preventDefault()
  scoreboardVisible.value = false
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

watch(selectedOwnedTerritory, (territory) => {
  if (!territory || territory.ownerId !== currentPlayerId.value) {
    cancelSelection()
  }
})

watch(
  [selectedOwnedTerritory, targetTerritory],
  ([origin, target]) => {
    if (!origin) {
      targetTerritoryId.value = null
      return
    }

    if (!target) return

    const neighbors = Array.isArray(origin.neighbors) ? origin.neighbors : []
    if (!neighbors.includes(target.id)) {
      targetTerritoryId.value = null
    }
  }
)

watch(currentAttack, (attack) => {
  if (attack) {
    cancelSelection()
  }
})

const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const attackWindowLabel = computed(() => formatDuration(attackDurationSeconds.value))

onMounted(async () => {
  window.addEventListener('keydown', handleTabKeyDown)
  window.addEventListener('keyup', handleTabKeyUp)

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
  scoreboardVisible.value = false
  window.removeEventListener('keydown', handleTabKeyDown)
  window.removeEventListener('keyup', handleTabKeyUp)

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
            :disable-interaction="false"
            @select="handleTerritorySelect"
        />
      </div>

      <div
          v-if="scoreboardVisible"
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
                  <p class="mt-1 text-base font-semibold ">{{ item.value }}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card class="backdrop-blur">
            <CardHeader class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle class="flex items-center gap-2">
                <Users class="size-4 text-emerald-300"/>
                <span>Joueurs</span>
              </CardTitle>
              <CardDescription class="text-xs">
                {{ connectedPlayerCount }}/{{ playersSummary.length }} connectés
              </CardDescription>
            </CardHeader>
            <CardContent class="pt-0">
              <ScrollArea class="max-h-[360px] pr-4">
                <ul class="space-y-3 p-1">
                  <li
                      v-for="player in playersSummary"
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
        </div>
      </div>

      <div class="pointer-events-none absolute inset-0 flex flex-col px-4 z-30">
        <div class="pointer-events-none flex flex-wrap items-center justify-between gap-3 pt-4">
          <div
              class="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-card/70 px-4 py-2 text-xs ring-2 ring-white/10 shadow-lg backdrop-blur">
            <component :is="realtimeConnected ? SignalHigh : SignalLow" class="size-4 text-emerald-300"/>
            <span class="font-medium text-slate-200">{{ connectionStatusLabel }}</span>
            <span class="hidden sm:inline text-slate-600">•</span>
            <span class="hidden sm:flex items-center gap-2">
              <Users class="size-3 text-emerald-300"/>
              <span>{{ connectedPlayerCount }}/{{ playersSummary.length }} connectés</span>
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
                @click="handleLeaveGame"
                :disabled="leavingGame"
            >
              <LogOut class="size-4"/>
              <span v-if="!leavingGame">Quitter</span>
              <span v-else>Déconnexion...</span>
            </Button>
          </div>
        </div>

        <div class="w-fit mt-4">
          <div class="px-4 py-3 text-xs text-card-foreground rounded-xl border bg-card/70 backdrop-blur shadow-xl ring-1 ring-white/10">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Légende</p>
            <ul class="space-y-2 text-slate-200">
              <li class="flex items-center gap-3">
              <span
                  class="inline-flex size-3 rounded-full"
                  :style="{ backgroundColor: currentPlayerColor }"
              ></span>
                <span>Vos territoires</span>
              </li>
              <li class="flex items-center gap-3">
              <span
                  class="inline-flex size-3 rounded-full"
                  :style="{ backgroundColor: BOT_LEGEND_COLOR }"
              ></span>
                <span>Contrôle IA</span>
              </li>
              <li
                  v-for="entry in otherPlayerLegendEntries"
                  :key="entry.id"
                  class="flex items-center gap-3"
              >
              <span
                  class="inline-flex size-3 rounded-full"
                  :style="{ backgroundColor: entry.color }"
              ></span>
                <span>{{ entry.label }}</span>
              </li>
            </ul>
          </div>
        </div>

        <main class="relative flex flex-1">
          <section class="pointer-events-none flex flex-1 flex-col items-center justify-end">
            <Card
                class="pointer-events-auto mx-auto mb-4 w-full max-w-4xl bg-card/70 ring-1 ring-white/10 backdrop-blur">
              <CardHeader>
                <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                  <CardTitle class="flex items-center gap-2 font-semibold uppercase tracking-wide text-slate-200">
                    <Swords class="size-5 text-primary"/>
                    <span v-if="currentAttackStats">Attaque en cours</span>
                    <span v-else-if="defendingAttackStats">Défense en direct</span>
                    <span v-else>Commandes de jeu</span>
                  </CardTitle>
                  <CardDescription class="text-xs text-slate-400">
                    <span v-if="currentAttackStats">Fenêtre d'action : {{ attackWindowLabel }}</span>
                    <span v-else-if="defendingAttackStats">Mobilisez votre communauté pour tenir la ligne.</span>
                    <span v-else>Sélectionnez un territoire pour lancer l'offensive.</span>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent class="space-y-4">
                <div v-if="currentAttackStats" class="space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p class="text-xs uppercase tracking-wide text-slate-500">Cible</p>
                      <p class="text-lg font-semibold text-slate-100">
                        {{ currentAttack?.toTerritoryName ?? currentAttack?.toTerritory }}
                      </p>
                      <p class="text-xs text-slate-500" v-if="currentAttack?.defenderId">
                        Défenseur :
                        <span class="font-medium text-slate-200">
                          {{ getPlayerUsername(currentAttack?.defenderId) ?? 'Inconnu' }}
                        </span>
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-xs uppercase tracking-wide text-slate-500">Temps restant</p>
                      <p class="text-2xl font-semibold text-primary">
                        {{ formatDuration(currentAttackStats.remaining) }}
                      </p>
                    </div>
                  </div>

                  <div class="space-y-3 rounded-xl border border-white/10 bg-accent/60 p-4">
                    <p class="text-sm font-medium text-emerald-300">
                      {{ currentAttackEncouragement }}
                    </p>
                    <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                      <span>Messages
                        <span class="font-semibold text-slate-100">{{ currentAttackStats.messages }}</span>
                      </span>
                      <span>Participants
                        <span class="font-semibold text-slate-100">{{ currentAttackStats.participants }}</span>
                      </span>
                      <span>Puissance
                        <span class="font-semibold text-slate-100">{{ currentAttackStats.attackPoints }}</span>
                      </span>
                      <span>Défense estimée
                        <span class="font-semibold text-slate-100">{{ currentAttackStats.defensePoints }}</span>
                      </span>
                    </div>
                    <div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                          class="h-full bg-primary transition-all duration-500"
                          :style="{ width: `${currentAttackProgress}%` }"
                      ></div>
                    </div>
                    <p class="text-xs text-slate-500">
                      Base de défense : {{ currentAttackStats.baseDefense }}
                    </p>
                  </div>
                </div>

                <div v-else-if="defendingAttackStats" class="space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p class="text-xs uppercase tracking-wide text-slate-500">Territoire à défendre</p>
                      <p class="text-lg font-semibold text-slate-100">
                        {{ defendingAttack?.toTerritoryName ?? defendingAttack?.toTerritory }}
                      </p>
                      <p class="text-xs text-slate-500">
                        Attaquant :
                        <span class="font-medium text-slate-200">
                          {{ getPlayerUsername(defendingAttack?.attackerId) ?? 'Inconnu' }}
                        </span>
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-xs uppercase tracking-wide text-slate-500">Temps restant</p>
                      <p class="text-2xl font-semibold text-amber-300">
                        {{ formatDuration(defendingAttackStats.remaining) }}
                      </p>
                    </div>
                  </div>

                  <div class="space-y-3 rounded-xl border border-white/10 bg-accent/60 p-4">
                    <p class="text-sm font-medium text-amber-200">
                      {{ defendingEncouragement }}
                    </p>
                    <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                      <span>Messages
                        <span class="font-semibold text-slate-100">{{ defendingAttackStats.messages }}</span>
                      </span>
                      <span>Défense
                        <span class="font-semibold text-slate-100">{{ defendingAttackStats.defensePoints }}</span>
                      </span>
                      <span>Puissance adverse
                        <span class="font-semibold text-slate-100">{{ defendingAttackStats.attackPoints }}</span>
                      </span>
                    </div>
                    <div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                          class="h-full bg-amber-400 transition-all duration-500"
                          :style="{ width: `${defendingAttackProgress}%` }"
                      ></div>
                    </div>
                    <p class="text-xs text-slate-500">
                      Base de défense : {{ defendingAttackStats.baseDefense }}
                    </p>
                  </div>
                </div>

                <div v-else class="space-y-4">
                  <div v-if="lastAttackResult" class="rounded-lg border border-white/10 bg-slate-900/50 p-4">
                    <p
                        class="text-sm font-semibold"
                        :class="{
                          'text-emerald-300': lastAttackResult.outcome === 'win',
                          'text-red-300': lastAttackResult.outcome === 'loss',
                          'text-slate-300': lastAttackResult.outcome === 'draw'
                        }"
                    >
                      <template v-if="lastAttackResult.outcome === 'win'">Victoire !</template>
                      <template v-else-if="lastAttackResult.outcome === 'loss'">Défaite…</template>
                      <template v-else>Égalité</template>
                      <span class="ml-2 text-xs text-slate-400">
                        {{ lastAttackResult.attack.attackPoints }} vs {{ lastAttackResult.attack.defensePoints }}
                      </span>
                    </p>
                  </div>

                  <div class="space-y-3 rounded-xl border border-white/10 bg-accent/60 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
                      <div>
                        <p class="text-xs uppercase tracking-wide text-slate-500">Territoire source</p>
                        <p class="text-sm font-semibold text-slate-100">
                          {{ selectedOwnedTerritory?.name ?? 'Non sélectionné' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs uppercase tracking-wide text-slate-500">Cible</p>
                        <p class="text-sm font-semibold text-slate-100">
                          {{ targetTerritory?.name ?? 'Non sélectionnée' }}
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs uppercase tracking-wide text-slate-500">Fenêtre d'action</p>
                        <p class="text-sm font-semibold text-slate-100">{{ attackWindowLabel }}</p>
                      </div>
                    </div>

                    <p v-if="attackError" class="text-xs font-medium text-red-300">{{ attackError }}</p>

                    <div v-if="selectedOwnedTerritory && !targetTerritory" class="space-y-2">
                      <p class="text-xs text-slate-400">
                        Choisissez une cible limitrophe à partir de {{ selectedOwnedTerritory.name }} :
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <Button
                            v-for="territory in potentialTargets"
                            :key="territory.id"
                            size="sm"
                            variant="secondary"
                            class="pointer-events-auto"
                            @click="selectTargetFromList(territory.id)"
                        >
                          {{ territory.name }}
                          <span class="ml-2 text-xs text-slate-400" v-if="territory.defensePower">
                            🛡 {{ territory.defensePower }}
                          </span>
                        </Button>
                      </div>
                      <p v-if="potentialTargets.length === 0" class="text-xs text-slate-500">
                        Aucun territoire adverse adjacent.
                      </p>
                    </div>

                    <div v-if="selectedOwnedTerritory && targetTerritory" class="space-y-2 text-xs text-slate-300">
                      <p>
                        Objectif :
                        <span class="font-semibold text-slate-100">{{ targetTerritory.name }}</span>
                        <span class="text-slate-400">
                          (défense {{ targetTerritory.defensePower ?? 0 }})
                        </span>
                      </p>
                      <p>
                        Commande Twitch :
                        <span class="font-mono text-primary">
                          {{ attackCommandLabel || '!attaque <pays>' }}
                        </span>
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <Button
                          variant="outline"
                          size="sm"
                          class="pointer-events-auto"
                          @click="cancelSelection"
                          :disabled="!selectedOwnedTerritory && !targetTerritory"
                      >
                        <OctagonMinus class="size-4"/>
                        Réinitialiser
                      </Button>
                      <Button
                          variant="default"
                          size="lg"
                          class="pointer-events-auto"
                          :disabled="!attackCTAEnabled"
                          @click="launchAttack"
                      >
                        <Swords class="size-5"/>
                        <span v-if="attackLoading">Préparation...</span>
                        <span v-else>Lancer l'attaque</span>
                      </Button>
                    </div>

                    <p class="text-xs text-slate-500">
                      Sélectionnez un territoire que vous contrôlez puis une cible limitrophe à attaquer.
                      Pendant {{ attackWindowLabel }}, vos viewers doivent spammer
                      <span class="font-mono">{{ attackCommandLabel || '!attaque &lt;pays&gt;' }}</span>
                      sur Twitch pour augmenter la puissance d'attaque.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>
