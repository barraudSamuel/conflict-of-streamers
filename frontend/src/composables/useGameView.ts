import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {createGameSocket, sendSocketMessage, type SocketMessage} from '@/services/socket'
import {
  getGame,
  leaveGame as leaveGameRequest,
  validateAttack,
  validateReinforcement
} from '@/services/api'
import {
  clearPlayerContext,
  loadPlayerContext,
  type PlayerContext
} from '@/lib/playerStorage'
import type {
  ActionLogEntry,
  ActionLogFragment,
  AttackResult,
  AttackParticipantSummary,
  BattleBalance,
  GameInfoItem,
  LegendEntry,
  PlayerSummary,
  RankingEntry,
  AttackStats,
  ReinforcementStats
} from '@/types/game'

export const BOT_LEGEND_COLOR = '#64748b'
const DEFAULT_PLAYER_LOG_COLOR = '#cbd5f5'
const MAX_ACTION_HISTORY = 15
const ACTION_HISTORY_VISIBILITY_MS = 10_000

const normalizeParticipantSummary = (entry: any): AttackParticipantSummary => {
  const id =
    typeof entry?.id === 'string' && entry.id.trim() !== '' ? entry.id.trim() : null
  const username =
    typeof entry?.username === 'string' && entry.username.trim() !== ''
      ? entry.username.trim()
      : null
  const displayName =
    typeof entry?.displayName === 'string' && entry.displayName.trim() !== ''
      ? entry.displayName.trim()
      : username ?? id
  const avatarUrl =
    typeof entry?.avatarUrl === 'string' && entry.avatarUrl.trim() !== ''
      ? entry.avatarUrl.trim()
      : null
  const messages =
    typeof entry?.messages === 'number' && Number.isFinite(entry.messages)
      ? entry.messages
      : 0

  return {
    id,
    username,
    displayName: displayName ?? 'Viewer',
    avatarUrl,
    messages
  }
}

export const useGameView = (gameId: string) => {
  const router = useRouter()

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
  const lossModalVisible = ref(false)
  const hasOwnedTerritory = ref(false)
  const winnerModalVisible = ref(false)
  const winnerPlayerId = ref<string | null>(null)
  const hasAnnouncedWinner = ref(false)
  const hadMultipleHumanPlayers = ref(false)
  const selectedOwnedTerritoryId = ref<string | null>(null)
  const targetTerritoryId = ref<string | null>(null)
  const lastClickedTerritoryId = ref<string | null>(null)
  const attackError = ref('')
  const attackLoading = ref(false)
  const cancelAttackLoading = ref(false)
  const reinforcementError = ref('')
  const reinforcementLoading = ref(false)
  const cancelReinforcementLoading = ref(false)
  const lastAttackResult = ref<AttackResult | null>(null)
  const actionHistory = ref<ActionLogEntry[]>([])
  const historyClock = ref(Date.now())

  let reconnectTimer: number | null = null
  let manualDisconnect = false
  let historyInterval: number | null = null

  const addActionHistoryEntry = (
    partsOrMessage: string | ActionLogFragment[],
    variant: ActionLogEntry['variant'] = 'info'
  ) => {
    const parts: ActionLogFragment[] =
      typeof partsOrMessage === 'string' ? [{ text: partsOrMessage }] : partsOrMessage
    const entry: ActionLogEntry = {
      id: `log-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      variant,
      parts
    }
    historyClock.value = Date.now()
    actionHistory.value = [entry, ...actionHistory.value].slice(0, MAX_ACTION_HISTORY)
  }

  const currentPlayerId = computed(() => playerContext.value?.playerId ?? '')

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

  const currentPlayerTerritoryCount = computed(
    () => territoryCounts.value[currentPlayerId.value] ?? 0
  )

  const playersSummary = computed<PlayerSummary[]>(() => {
    if (!game.value?.players) return []
    const counts = territoryCounts.value
    const source = Array.isArray(game.value.players) ? game.value.players : []

    const summaries: PlayerSummary[] = source.map((player: any): PlayerSummary => ({
      id: player.id,
      twitchUsername: player.twitchUsername ?? 'Joueur',
      color: player.color ?? null,
      avatarUrl: typeof player.avatarUrl === 'string' ? player.avatarUrl : null,
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

  const isBotPlayer = (playerId: string | null | undefined) =>
    typeof playerId === 'string' && playerId.startsWith('bot:')

  const humanPlayersSummary = computed<PlayerSummary[]>(() =>
    playersSummary.value.filter((player) => !isBotPlayer(player.id))
  )

  const survivingHumanPlayers = computed<PlayerSummary[]>(() =>
    humanPlayersSummary.value.filter((player) => player.territories > 0)
  )

  const rankingForDisplay = computed<RankingEntry[]>(() => {
    if (finalRanking.value.length) {
      return finalRanking.value
    }

    return playersSummary.value.map((player, index) => ({
      ...player,
      rank: index + 1
    }))
  })

  const finalRanking = ref<RankingEntry[]>([])

  const winnerSummary = computed<RankingEntry | null>(() => {
    if (!winnerPlayerId.value) return null
    return (
      rankingForDisplay.value.find((entry) => entry.id === winnerPlayerId.value) ?? null
    )
  })

  const winnerDisplayName = computed(() => {
    if (!winnerPlayerId.value) return 'Joueur'
    return (
      getPlayerUsername(winnerPlayerId.value) ??
      winnerSummary.value?.twitchUsername ??
      'Joueur'
    )
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

  const gameInfoItems = computed<GameInfoItem[]>(() => {
    const items: GameInfoItem[] = []
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

  const currentPlayerAvatar = computed(() => {
    const player = playersById.value.get(currentPlayerId.value)
    if (!player) {
      return null
    }
    const raw = typeof player.avatarUrl === 'string' ? player.avatarUrl.trim() : ''
    return raw ? raw : null
  })

  const otherPlayerLegendEntries = computed<LegendEntry[]>(() => {
    const entries: LegendEntry[] = []

    playersSummary.value.forEach((player) => {
      if (player.isCurrent) return
      if (isBotPlayer(player.id)) return
      const color =
        typeof player.color === 'string' && player.color.trim() !== '' ? player.color : '#94a3b8'
      entries.push({
        id: player.id,
        label: player.twitchUsername ?? 'Joueur',
        color,
        avatarUrl: player.avatarUrl ?? null
      })
    })

    if (entries.length === 0) {
      entries.push({
        id: 'others',
        label: 'Autres joueurs',
        color: '#64748b',
        avatarUrl: null
      })
    }

    return entries
  })

  const selectedOwnedTerritory = computed(() => getTerritory(selectedOwnedTerritoryId.value))
  const targetTerritory = computed(() => getTerritory(targetTerritoryId.value))

  const activeAttacks = computed<any[]>(() =>
    Array.isArray(game.value?.activeAttacks) ? game.value.activeAttacks : []
  )

  const activeReinforcements = computed<any[]>(() =>
    Array.isArray(game.value?.activeReinforcements) ? game.value.activeReinforcements : []
  )

  const currentAttack = computed<any | null>(() =>
    activeAttacks.value.find((attack) => attack.attackerId === currentPlayerId.value) ?? null
  )

  const defendingAttack = computed<any | null>(() =>
    activeAttacks.value.find((attack) => attack.defenderId === currentPlayerId.value) ?? null
  )

  const currentReinforcement = computed<any | null>(() =>
    activeReinforcements.value.find(
      (reinforcement) => reinforcement.initiatorId === currentPlayerId.value
    ) ?? null
  )

  const selectedReinforcement = computed<any | null>(() => {
    const territoryId = selectedOwnedTerritoryId.value
    if (!territoryId) return null
    return (
      activeReinforcements.value.find(
        (reinforcement) => reinforcement.territoryId === territoryId
      ) ?? null
    )
  })

  const lastClickedTerritory = computed(() => getTerritory(lastClickedTerritoryId.value))
  const lastClickedIsOwned = computed(
    () => lastClickedTerritory.value?.ownerId === currentPlayerId.value
  )
  const showAttackActions = computed(() => {
    const target = targetTerritory.value
    if (!target) return false
    return lastClickedTerritory.value?.id === target.id
  })
  const showReinforcementActions = computed(() => {
    if (!lastClickedIsOwned.value) return false
    const owned = selectedOwnedTerritory.value
    if (!owned) return false
    return owned.id === lastClickedTerritory.value?.id
  })

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

  const reinforcementDurationSeconds = computed(
    () => Number(attackSettings.value?.reinforcementDuration) || 0
  )

  const reinforcementCommandLabel = computed(() => {
    const name =
      selectedOwnedTerritory.value?.name ??
      currentReinforcement.value?.territoryName ??
      selectedReinforcement.value?.territoryName
    if (!name || typeof name !== 'string') return ''
    return `!renfort ${name}`
  })

  const canLaunchAttack = computed(() => {
    if (!playerContext.value?.playerId) return false
    if (currentAttack.value) return false
    const origin = selectedOwnedTerritory.value
    const target = targetTerritory.value
    if (!origin || !target) return false
    if (selectedReinforcement.value) return false
    if (target.ownerId === currentPlayerId.value) return false
    if (target.isUnderAttack) return false

    const neighbors = Array.isArray(origin.neighbors) ? origin.neighbors : []
    return neighbors.includes(target.id)
  })

  const attackCTAEnabled = computed(() => canLaunchAttack.value && !attackLoading.value)

  const attackableTerritoryIds = computed<string[]>(() => {
    const origin = selectedOwnedTerritory.value
    if (!origin) return []

    const neighbors = Array.isArray(origin.neighbors) ? origin.neighbors : []
    if (!neighbors.length) return []

    const attackable: string[] = []
    neighbors.forEach((neighborId) => {
      if (typeof neighborId !== 'string' || neighborId.trim() === '') return
      const candidate = getTerritory(neighborId)
      if (!candidate) return
      if (candidate.ownerId === currentPlayerId.value) return
      if (candidate.isUnderAttack) return
      attackable.push(candidate.id)
    })

    const target = targetTerritory.value
    if (target && attackable.includes(target.id)) {
      return [target.id]
    }

    return attackable
  })

  const attackDisabledReason = computed(() => {
    if (attackLoading.value) return 'validation'
    if (!playerContext.value?.playerId) return 'no-player'
    if (currentAttack.value) return 'attack-in-progress'
    const origin = selectedOwnedTerritory.value
    if (!origin) return 'no-origin'
    const target = targetTerritory.value
    if (!target) return 'no-target'
    if (selectedReinforcement.value) return 'origin-reinforcement'
    if (target.ownerId === currentPlayerId.value) return 'target-owned'
    if (target.isUnderAttack) return 'target-under-attack'
    const neighbors = Array.isArray(origin.neighbors) ? origin.neighbors : []
    if (!neighbors.includes(target.id)) return 'not-neighbor'
    return null
  })

  const canLaunchReinforcement = computed(() => {
    if (!playerContext.value?.playerId) return false
    const territory = selectedOwnedTerritory.value
    if (!territory) return false
    if (territory.ownerId !== currentPlayerId.value) return false
    if (territory.isUnderAttack) return false
    if (selectedReinforcement.value) return false
    if (
      currentReinforcement.value &&
      currentReinforcement.value.territoryId !== territory.id
    ) {
      return false
    }
    return true
  })

  const reinforcementCTAEnabled = computed(
    () => canLaunchReinforcement.value && !reinforcementLoading.value
  )

  const reinforcementDisabledReason = computed(() => {
    if (reinforcementLoading.value) return 'validation'
    if (!playerContext.value?.playerId) return 'no-player'
    const territory = selectedOwnedTerritory.value
    if (!territory) return 'no-territory'
    if (territory.ownerId !== currentPlayerId.value) return 'not-owner'
    if (territory.isUnderAttack) return 'under-attack'
    if (selectedReinforcement.value) return 'already-reinforcing'
    if (
      currentReinforcement.value &&
      currentReinforcement.value.territoryId !== territory.id
    ) {
      return 'other-reinforcement-active'
    }
    return null
  })

  const currentAttackStats = computed<AttackStats | null>(() => {
    const attack = currentAttack.value
    if (!attack) return null

    const attackerCount =
      typeof attack.participantCount?.attackers === 'number'
        ? attack.participantCount.attackers
        : Array.isArray(attack.participantAttackers)
          ? attack.participantAttackers.length
          : 0
    const topAttackers = Array.isArray(attack.topContributors?.attackers)
      ? attack.topContributors.attackers.map(normalizeParticipantSummary)
      : []
    const topDefenders = Array.isArray(attack.topContributors?.defenders)
      ? attack.topContributors.defenders.map(normalizeParticipantSummary)
      : []

    return {
      attack,
      remaining: Number(attack.remainingTime) || 0,
      messages: Number(attack.attackMessages) || 0,
      participants: attackerCount,
      attackPoints: Number(attack.attackPoints) || 0,
      defensePoints: Number(attack.defensePoints) || 0,
      baseDefense: Number(attack.baseDefense) || 0,
      topAttackers,
      topDefenders
    }
  })

  const currentReinforcementStats = computed<ReinforcementStats | null>(() => {
    const reinforcement = selectedReinforcement.value ?? currentReinforcement.value
    if (!reinforcement) return null

    return {
      reinforcement,
      remaining: Number(reinforcement.remainingTime) || 0,
      messages: Number(reinforcement.messageCount) || 0,
      participants: Number(reinforcement.participantCount) || 0,
      accumulatedBonus: Number(reinforcement.accumulatedBonus) || 0,
      baseDefense: Number(reinforcement.baseDefense) || 0
    }
  })

  const calculateBattleBalance = (attackPoints: number, defensePoints: number): BattleBalance => {
    const safeAttack = Number.isFinite(attackPoints) ? Math.max(0, attackPoints) : 0
    const safeDefense = Number.isFinite(defensePoints) ? Math.max(0, defensePoints) : 0
    const total = safeAttack + safeDefense
    if (total <= 0) {
      return { attackPercent: 0, defensePercent: 0 }
    }

    const attackPercent = Math.round((safeAttack / total) * 100)
    const defensePercent = Math.max(0, Math.min(100, 100 - attackPercent))
    return { attackPercent, defensePercent }
  }

  const currentAttackBalance = computed<BattleBalance>(() => {
    const stats = currentAttackStats.value
    if (!stats) {
      return { attackPercent: 0, defensePercent: 0 }
    }
    return calculateBattleBalance(stats.attackPoints, stats.defensePoints)
  })

  const defendingAttackStats = computed<AttackStats | null>(() => {
    const attack = defendingAttack.value
    if (!attack) return null

    const defenderCount =
      typeof attack.participantCount?.defenders === 'number'
        ? attack.participantCount.defenders
        : Array.isArray(attack.participantDefenders)
          ? attack.participantDefenders.length
          : 0
    const topAttackers = Array.isArray(attack.topContributors?.attackers)
      ? attack.topContributors.attackers.map(normalizeParticipantSummary)
      : []
    const topDefenders = Array.isArray(attack.topContributors?.defenders)
      ? attack.topContributors.defenders.map(normalizeParticipantSummary)
      : []

    return {
      attack,
      remaining: Number(attack.remainingTime) || 0,
      messages: Number(attack.defenseMessages) || 0,
      participants: defenderCount,
      attackPoints: Number(attack.attackPoints) || 0,
      defensePoints: Number(attack.defensePoints) || 0,
      baseDefense: Number(attack.baseDefense) || 0,
      topAttackers,
      topDefenders
    }
  })

  const defendingAttackBalance = computed<BattleBalance>(() => {
    const stats = defendingAttackStats.value
    if (!stats) {
      return { attackPercent: 0, defensePercent: 0 }
    }
    return calculateBattleBalance(stats.attackPoints, stats.defensePoints)
  })

  const currentAttackEncouragement = computed(() => {
    if (!currentAttack.value) return ''
    return `Tapez ${attackCommandLabel.value} dans le chat !`
  })

  const defendingEncouragement = computed(() => {
    if (!defendingAttack.value) return ''
    return `Tapez ${defenseCommandLabel.value} dans le chat !`
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

  const applyAttackUpdate = (attackPayload: any, territoryId: string) => {
    if (!game.value) return

    const current = game.value
    const incoming = { territoryId, ...attackPayload }

    const active = Array.isArray(current.activeAttacks) ? [...current.activeAttacks] : []
    const index = active.findIndex((entry: any) => entry.territoryId === territoryId)

    if (index >= 0) {
      active[index] = { ...active[index], ...incoming }
    } else {
      active.push(incoming)
    }

    const territories = Array.isArray(current.territories)
      ? current.territories.map((territory: any) =>
          territory.id === territoryId ? { ...territory, isUnderAttack: true } : territory
        )
      : current.territories

    game.value = {
      ...current,
      activeAttacks: active,
      territories
    }
  }

  const removeAttackFromState = (territoryId: string) => {
    if (!game.value) return
    const current = game.value

    const active = Array.isArray(current.activeAttacks)
      ? current.activeAttacks.filter((entry: any) => entry.territoryId !== territoryId)
      : current.activeAttacks

    const territories = Array.isArray(current.territories)
      ? current.territories.map((territory: any) =>
          territory.id === territoryId ? { ...territory, isUnderAttack: false } : territory
        )
      : current.territories

    game.value = {
      ...current,
      activeAttacks: active,
      territories
    }
  }

  const applyReinforcementUpdate = (reinforcementPayload: any, territoryId: string) => {
    if (!game.value) return

    const current = game.value
    const incoming = { territoryId, ...reinforcementPayload }

    const active = Array.isArray(current.activeReinforcements)
      ? [...current.activeReinforcements]
      : []

    const index = active.findIndex((entry: any) => entry.territoryId === territoryId)

    if (index >= 0) {
      active[index] = { ...active[index], ...incoming }
    } else {
      active.push(incoming)
    }

    const territories = Array.isArray(current.territories)
      ? current.territories.map((territory: any) => {
          if (territory.id !== territoryId) return territory
          const rawBonus =
            typeof incoming.accumulatedBonus === 'number'
              ? incoming.accumulatedBonus
              : typeof incoming.baseDefense === 'number'
                ? incoming.baseDefense
                : typeof territory.defensePower === 'number'
                  ? territory.defensePower
                  : 0
          const bonus = Number.isFinite(Number(rawBonus)) ? Number(rawBonus) : 0

          return {
            ...territory,
            isReinforced: true,
            reinforcementBonus: bonus,
            defensePower: bonus
          }
        })
      : current.territories

    game.value = {
      ...current,
      activeReinforcements: active,
      territories
    }
  }

  const removeReinforcementFromState = (
    territoryId: string,
    options: { keepBuff?: boolean; reinforcement?: any } = {}
  ) => {
    if (!game.value) return

    const current = game.value
    const { keepBuff = false, reinforcement = null } = options

    const active = Array.isArray(current.activeReinforcements)
      ? current.activeReinforcements.filter((entry: any) => entry.territoryId !== territoryId)
      : current.activeReinforcements

    const territories = Array.isArray(current.territories)
      ? current.territories.map((territory: any) => {
          if (territory.id !== territoryId) return territory

          const baseDefense =
            typeof reinforcement?.baseDefense === 'number'
              ? reinforcement.baseDefense
              : typeof territory.baseDefense === 'number'
                ? territory.baseDefense
                : typeof territory.defensePower === 'number'
                  ? territory.defensePower
                  : 0
          const baseDefenseValue = Number.isFinite(Number(baseDefense)) ? Number(baseDefense) : 0

          if (keepBuff && reinforcement) {
            const finalBonus =
              typeof reinforcement.accumulatedBonus === 'number'
                ? reinforcement.accumulatedBonus
                : baseDefenseValue
            const finalBonusValue = Number.isFinite(Number(finalBonus))
              ? Number(finalBonus)
              : baseDefenseValue
            return {
              ...territory,
              isReinforced: true,
              reinforcementBonus: finalBonusValue,
              defensePower: finalBonusValue
            }
          }

          return {
            ...territory,
            isReinforced: false,
            reinforcementBonus: baseDefenseValue,
            defensePower: baseDefenseValue
          }
        })
      : current.territories

    game.value = {
      ...current,
      activeReinforcements: active,
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

  const formatPlayerLabel = (playerId?: string | null) => {
    const label = getPlayerUsername(playerId) ?? 'Inconnu'
    const color = getPlayerColor(playerId)
    return { label, color }
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
      case 'attack:started':
        cancelAttackLoading.value = false
        if (message.attack && message.territoryId) {
          applyAttackUpdate(message.attack, message.territoryId)
          if (message.attack.attackerId === currentPlayerId.value) {
            selectedOwnedTerritoryId.value = null
            targetTerritoryId.value = null
            lastAttackResult.value = null
          }
          const attackerInfo = formatPlayerLabel(message.attack.attackerId)
          const territoryLabel =
            message.attack.toTerritoryName ?? message.attack.toTerritory ?? 'un territoire'
          const defenderInfo = message.attack.defenderId
            ? formatPlayerLabel(message.attack.defenderId)
            : null
          const fragments: ActionLogFragment[] = defenderInfo
            ? [
                { text: attackerInfo.label, color: attackerInfo.color },
                { text: ' attaque ' },
                { text: defenderInfo.label, color: defenderInfo.color },
                { text: ` sur ${territoryLabel}!` }
              ]
            : [
                { text: attackerInfo.label, color: attackerInfo.color },
                { text: ` attaque ${territoryLabel}!` }
              ]
          addActionHistoryEntry(fragments, 'info')
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        break
      case 'reinforcement:started':
        reinforcementLoading.value = false
        cancelReinforcementLoading.value = false
        reinforcementError.value = ''
        if (message.reinforcement && message.territoryId) {
          applyReinforcementUpdate(message.reinforcement, message.territoryId)

          const territoryLabel =
            message.reinforcement.territoryName ??
            message.reinforcement.territoryId ??
            'un territoire'
          const fragments: ActionLogFragment[] = [
            { text: 'Renfort lancé sur ' },
            { text: territoryLabel.toString(), color: DEFAULT_PLAYER_LOG_COLOR }
          ]
          addActionHistoryEntry(fragments, 'info')
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        break
      case 'reinforcement:update':
        if (message.reinforcement && message.territoryId) {
          applyReinforcementUpdate(message.reinforcement, message.territoryId)
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        break
      case 'reinforcement:finished':
        cancelReinforcementLoading.value = false
        reinforcementLoading.value = false
        if (message.territoryId) {
          removeReinforcementFromState(message.territoryId, {
            keepBuff: true,
            reinforcement: message.reinforcement ?? null
          })
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        if (message.reinforcement) {
          const territoryLabel =
            message.reinforcement.territoryName ??
            message.reinforcement.territoryId ??
            'le territoire'
          const fragments: ActionLogFragment[] = [
            { text: 'Renfort terminé sur ' },
            { text: territoryLabel.toString(), color: DEFAULT_PLAYER_LOG_COLOR }
          ]
          addActionHistoryEntry(fragments, 'success')
        }
        break
      case 'reinforcement:cancelled':
        cancelReinforcementLoading.value = false
        reinforcementLoading.value = false
        if (message.territoryId) {
          removeReinforcementFromState(message.territoryId, {
            keepBuff: false,
            reinforcement: message.reinforcement ?? null
          })
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        if (message.reinforcement) {
          const territoryLabel =
            message.reinforcement.territoryName ??
            message.reinforcement.territoryId ??
            'le territoire'
          const fragments: ActionLogFragment[] = [
            { text: 'Renfort annulé sur ' },
            { text: territoryLabel.toString(), color: DEFAULT_PLAYER_LOG_COLOR }
          ]
          addActionHistoryEntry(fragments, 'info')
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
      case 'attack:cancelled':
        cancelAttackLoading.value = false
        attackError.value = ''
        if (message.territoryId) {
          removeAttackFromState(message.territoryId)
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        if (message.attack) {
          const attackerInfo = formatPlayerLabel(message.attack.attackerId)
          const territoryLabel =
            message.attack.toTerritoryName ?? message.attack.toTerritory ?? 'le territoire'

          const fragments: ActionLogFragment[] = [
            { text: attackerInfo.label, color: attackerInfo.color },
            { text: ' annule son attaque sur ' },
            { text: `${territoryLabel}.` }
          ]

          addActionHistoryEntry(fragments, 'info')

          if (message.cancelledBy === currentPlayerId.value) {
            lastAttackResult.value = null
          }
        }
        break
      case 'attack:finished':
        cancelAttackLoading.value = false
        if (message.attack && message.territoryId) {
          removeAttackFromState(message.territoryId)
        }
        if (message.game) {
          game.value = message.game
          ensurePlayerConnections(message.game.players ?? [])
        }
        if (message.attack) {
          const attackerInfo = formatPlayerLabel(message.attack.attackerId)
          const territoryLabel =
            message.attack.toTerritoryName ?? message.attack.toTerritory ?? 'le territoire'
          let fragments: ActionLogFragment[] = []
          let logVariant: ActionLogEntry['variant'] = 'info'

          if (message.attack.winner === message.attack.attackerId) {
            fragments = [
              { text: attackerInfo.label, color: attackerInfo.color },
              { text: ` a conquis ${territoryLabel}!` }
            ]
            logVariant = 'success'
          } else if (message.attack.winner === message.attack.defenderId) {
            const defenderInfo = message.attack.defenderId
              ? formatPlayerLabel(message.attack.defenderId)
              : { label: 'sa cible', color: DEFAULT_PLAYER_LOG_COLOR }
            fragments = [
              { text: "L'attaque de " },
              { text: attackerInfo.label, color: attackerInfo.color },
              { text: ' a échoué face à ' },
              { text: defenderInfo.label, color: defenderInfo.color },
              { text: ` sur ${territoryLabel}.` }
            ]
            logVariant = 'error'
          } else {
            fragments = [{ text: `Combat indécis sur ${territoryLabel}.` }]
          }

          addActionHistoryEntry(fragments, logVariant)

          const isAttacker = message.attack.attackerId === currentPlayerId.value
          const isDefender = message.attack.defenderId === currentPlayerId.value

          if (isAttacker || isDefender) {
            let outcome: AttackResult['outcome'] = 'draw'
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
      case 'command:received':
        if (message.attack && message.territoryId) {
          applyAttackUpdate(message.attack, message.territoryId)
        }
        if (message.reinforcement && message.territoryId) {
          applyReinforcementUpdate(message.reinforcement, message.territoryId)
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
        cancelAttackLoading.value = false
        reinforcementLoading.value = false
        cancelReinforcementLoading.value = false
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
      error.value =
        err instanceof Error ? err.message : 'Erreur lors du chargement de la partie'
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
        err instanceof Error
          ? err.message
          : 'Impossible de quitter la partie pour le moment.'
    } finally {
      leavingGame.value = false
    }
  }

  const cancelSelection = () => {
    selectedOwnedTerritoryId.value = null
    targetTerritoryId.value = null
    lastClickedTerritoryId.value = null
    attackError.value = ''
    reinforcementError.value = ''
  }

  const captureFinalRanking = (): RankingEntry[] =>
    playersSummary.value.map((player, index) => ({
      ...player,
      rank: index + 1
    }))

  const resetWinnerState = () => {
    winnerModalVisible.value = false
    winnerPlayerId.value = null
    hasAnnouncedWinner.value = false
    finalRanking.value = []
  }

  const openWinnerModal = (winnerId: string) => {
    winnerPlayerId.value = winnerId
    finalRanking.value = captureFinalRanking()
    hasAnnouncedWinner.value = true
    lossModalVisible.value = false
    winnerModalVisible.value = true
  }

  const closeWinnerModal = () => {
    winnerModalVisible.value = false
  }

  const handleTerritorySelect = (territoryId: string) => {
    attackError.value = ''
    reinforcementError.value = ''

    const territory = getTerritory(territoryId)
    if (!territory) return
    lastClickedTerritoryId.value = territoryId

    if (territory.ownerId === currentPlayerId.value) {
      selectedOwnedTerritoryId.value = territoryId
      targetTerritoryId.value = null

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

  const getPlayerUsername = (playerId?: string | null) => {
    if (!playerId) return null
    if (typeof playerId === 'string' && playerId.startsWith('bot:')) {
      return 'Faction IA'
    }
    const player = playersById.value.get(playerId)
    return player?.twitchUsername ?? null
  }

  const getPlayerColor = (playerId?: string | null) => {
    if (!playerId) return DEFAULT_PLAYER_LOG_COLOR
    if (typeof playerId === 'string' && playerId.startsWith('bot:')) {
      return BOT_LEGEND_COLOR
    }
    if (playerId === currentPlayerId.value) {
      return currentPlayerColor.value
    }
    const player = playersById.value.get(playerId)
    const color =
      typeof player?.color === 'string' && player.color.trim() !== ''
        ? player.color
        : DEFAULT_PLAYER_LOG_COLOR
    return color
  }

  const formatLogTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

  const visibleActionHistory = computed(() =>
    actionHistory.value.filter(
      (entry) => historyClock.value - entry.timestamp <= ACTION_HISTORY_VISIBILITY_MS
    )
  )

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

  const cancelCurrentAttack = () => {
    const attack = currentAttack.value
    if (!attack || cancelAttackLoading.value) {
      return
    }

    if (!socket.value) {
      socketError.value = 'Connexion temps réel indisponible. Annulation impossible.'
      return
    }

    const territoryId =
      typeof attack.territoryId === 'string' && attack.territoryId.trim() !== ''
        ? attack.territoryId
        : typeof attack.toTerritory === 'string'
          ? attack.toTerritory
          : null

    if (!territoryId) {
      return
    }

    cancelAttackLoading.value = true
    attackError.value = ''

    sendSocketMessage(socket.value, 'attack:cancel', {
      territoryId,
      attackId: attack.id ?? null
    })
  }

  const launchReinforcement = async () => {
    if (!canLaunchReinforcement.value || !playerContext.value?.playerId) {
      return
    }

    const territoryId = selectedOwnedTerritoryId.value
    if (!territoryId) return

    reinforcementError.value = ''
    reinforcementLoading.value = true

    try {
      await validateReinforcement(gameId, playerContext.value.playerId, territoryId)
      sendSocketMessage(socket.value, 'reinforcement:start', {
        territoryId
      })
    } catch (err) {
      reinforcementError.value =
        err instanceof Error
          ? err.message
          : 'Impossible de lancer le renfort pour le moment.'
    } finally {
      reinforcementLoading.value = false
    }
  }

  const cancelCurrentReinforcement = () => {
    const reinforcement = currentReinforcement.value ?? selectedReinforcement.value
    if (!reinforcement || cancelReinforcementLoading.value) {
      return
    }

    if (!socket.value) {
      socketError.value = 'Connexion temps réel indisponible. Annulation impossible.'
      return
    }

    const territoryId =
      typeof reinforcement.territoryId === 'string' ? reinforcement.territoryId : null
    if (!territoryId) {
      return
    }

    cancelReinforcementLoading.value = true
    reinforcementError.value = ''

    sendSocketMessage(socket.value, 'reinforcement:cancel', {
      territoryId,
      reinforcementId: reinforcement.id ?? null
    })
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
        hasOwnedTerritory.value = false
        lossModalVisible.value = false
        hadMultipleHumanPlayers.value = false
        resetWinnerState()
        router.replace(`/lobby/${game.value.id}`)
      }
    }
  )

  watch(
    () => humanPlayersSummary.value.length,
    (count) => {
      if (count > 1) {
        hadMultipleHumanPlayers.value = true
      }
    },
    { immediate: true }
  )

  watch(
    [() => survivingHumanPlayers.value.length, () => game.value?.status],
    ([aliveCount, status], [prevAlive]) => {
      if (!status || status === 'lobby') {
        return
      }

      const previousAlive = typeof prevAlive === 'number' ? prevAlive : null

      if (aliveCount === 1 && !hasAnnouncedWinner.value) {
        const winner = survivingHumanPlayers.value[0]
        if (!winner) return

        const shouldAnnounce =
          status === 'finished' ||
          hadMultipleHumanPlayers.value ||
          (previousAlive !== null && previousAlive > 1)

        if (shouldAnnounce) {
          openWinnerModal(winner.id)
        }
      } else if (status === 'finished' && aliveCount === 0 && !hasAnnouncedWinner.value) {
        hasAnnouncedWinner.value = true
      }
    },
    { immediate: true }
  )

  watch(selectedOwnedTerritory, (territory) => {
    if (!territory || territory.ownerId !== currentPlayerId.value) {
      cancelSelection()
    }
  })

  watch(
    currentPlayerTerritoryCount,
    (count, previousCount) => {
      if (count > 0) {
        hasOwnedTerritory.value = true
        if (lossModalVisible.value) {
          lossModalVisible.value = false
        }
        return
      }

      if (
        hasOwnedTerritory.value &&
        typeof previousCount === 'number' &&
        previousCount > 0 &&
        game.value?.status !== 'lobby'
      ) {
        lossModalVisible.value = true
      }
    }
  )

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
    } else {
      cancelAttackLoading.value = false
    }
  })

  watch(currentReinforcement, (reinforcement) => {
    if (!reinforcement) {
      cancelReinforcementLoading.value = false
    }
  })

  const formatDuration = (totalSeconds: number) => {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
    const minutes = Math.floor(safe / 60)
    const seconds = safe % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const attackWindowLabel = computed(() => formatDuration(attackDurationSeconds.value))
  const reinforcementWindowLabel = computed(() => formatDuration(reinforcementDurationSeconds.value))

  onMounted(async () => {
    window.addEventListener('keydown', handleTabKeyDown)
    window.addEventListener('keyup', handleTabKeyUp)
    historyClock.value = Date.now()
    if (historyInterval !== null) {
      window.clearInterval(historyInterval)
    }
    historyInterval = window.setInterval(() => {
      historyClock.value = Date.now()
    }, 1000)

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
    if (historyInterval !== null) {
      window.clearInterval(historyInterval)
      historyInterval = null
    }

    manualDisconnect = true
    clearReconnectTimer()
    if (socket.value) {
      socket.value.close()
      socket.value = null
    }
    resetWinnerState()
    hadMultipleHumanPlayers.value = false
    lossModalVisible.value = false
  })

  return {
    game,
    loading,
    error,
    realtimeConnected,
    socketError,
    connectedPlayerCount,
    connectionStatusLabel,
    playerConnections,
    scoreboardVisible,
    handleTerritorySelect,
    currentPlayerId,
    activeAttacks,
    activeReinforcements,
    gameInfoItems,
    playersSummary,
    actionHistory,
    formatLogTimestamp,
    lossModalVisible,
    winnerModalVisible,
    winnerDisplayName,
    rankingForDisplay,
    winnerPlayerId,
    handleLeaveGame,
    leavingGame,
    leaveError,
    closeWinnerModal,
    visibleActionHistory,
    currentPlayerColor,
    currentPlayerAvatar,
    otherPlayerLegendEntries,
    selectedOwnedTerritory,
    targetTerritory,
    attackableTerritoryIds,
    attackError,
    reinforcementError,
    showAttackActions,
    showReinforcementActions,
    attackWindowLabel,
    reinforcementWindowLabel,
    currentAttackStats,
    defendingAttackStats,
    currentReinforcementStats,
    currentAttackEncouragement,
    defendingEncouragement,
    attackCommandLabel,
    defenseCommandLabel,
    reinforcementCommandLabel,
    currentAttackBalance,
    defendingAttackBalance,
    cancelAttackLoading,
    cancelReinforcementLoading,
    attackCTAEnabled,
    reinforcementCTAEnabled,
    attackDisabledReason,
    reinforcementDisabledReason,
    attackLoading,
    reinforcementLoading,
    lastAttackResult,
    selectedReinforcement,
    cancelSelection,
    launchAttack,
    cancelCurrentAttack,
    cancelCurrentReinforcement,
    launchReinforcement,
    formatDuration,
    getPlayerUsername,
    currentAttack,
    defendingAttack
  }
}
