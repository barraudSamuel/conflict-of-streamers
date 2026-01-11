import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useWebSocketStore } from './websocketStore'
import { usePlayerStore } from './playerStore'
import { useTerritoryStore } from './territoryStore'
import type { BattleStartEvent, AttackFailedEvent, AttackActionEvent, BattleProgressEvent, FeedMessage } from 'shared/types'
import { BATTLE_EVENTS } from 'shared/types'

/**
 * Story 4.4: Battle forces from server for progress bar display
 */
interface BattleForces {
  attackerForce: number
  defenderForce: number
  attackerMessages: number
  defenderMessages: number
  attackerUniqueUsers: number
  defenderUniqueUsers: number
}

/**
 * Story 4.5: Maximum messages to display in feed (FIFO)
 */
const MAX_FEED_MESSAGES = 10

/**
 * Story 4.2: Active battle state for real-time battle tracking
 * Story 4.4: Added forces field for progress bar
 */
interface ActiveBattle {
  battleId: string
  attackerId: string
  defenderId: string | null
  attackerTerritoryId: string
  defenderTerritoryId: string
  duration: number
  startTime: string
  command: {
    attack: string
    defend: string
  }
  // Computed/local state
  remainingTime: number
  timerId: ReturnType<typeof setInterval> | null
  // Story 4.4: Force tracking for progress bar
  forces: BattleForces
}

export const useBattleStore = defineStore('battle', () => {
  const wsStore = useWebSocketStore()
  const playerStore = usePlayerStore()
  // Note: territoryStore is accessed lazily to avoid circular dependency issues
  // This works because Pinia initializes stores on first access
  const territoryStore = useTerritoryStore()

  // =====================
  // State
  // =====================

  /** Map of active battles by battleId */
  const activeBattles = ref<Map<string, ActiveBattle>>(new Map())

  /** Story 4.5: Feed messages for real-time chat display (FR26-FR27) */
  const feedMessages = ref<FeedMessage[]>([])

  /** Last attack error received */
  const lastError = ref<AttackFailedEvent | null>(null)

  /** Selected attack source territory (for UI) */
  const selectedSourceTerritory = ref<string | null>(null)

  /** Selected attack target territory (for UI) */
  const selectedTargetTerritory = ref<string | null>(null)

  /** Attack in progress flag */
  const isAttacking = ref(false)

  // =====================
  // Getters
  // =====================

  /** Check if any battle is active */
  const hasActiveBattle = computed(() => activeBattles.value.size > 0)

  /** Get all active battles as array */
  const allActiveBattles = computed(() => Array.from(activeBattles.value.values()))

  /** Get battle by territory ID (either attacker or defender) */
  const getBattleByTerritory = computed(() => (territoryId: string) => {
    for (const battle of activeBattles.value.values()) {
      if (battle.attackerTerritoryId === territoryId || battle.defenderTerritoryId === territoryId) {
        return battle
      }
    }
    return null
  })

  /** Check if a territory is currently in battle */
  const isTerritoryInBattle = computed(() => (territoryId: string) => {
    return getBattleByTerritory.value(territoryId) !== null
  })

  /**
   * Story 4.3: Get battle where current player is involved (attacker or defender)
   * Returns the first active battle where the player participates
   */
  const myBattle = computed(() => {
    const myId = playerStore.currentPlayer?.id
    if (!myId) return null

    for (const battle of activeBattles.value.values()) {
      if (battle.attackerId === myId || battle.defenderId === myId) {
        return battle
      }
    }
    return null
  })

  /**
   * Story 4.3: Check if current player is defending in active battle
   */
  const amIDefender = computed(() => {
    const myId = playerStore.currentPlayer?.id
    if (!myId || !myBattle.value) return false
    return myBattle.value.defenderId === myId
  })

  /**
   * Story 4.3: Check if current player is attacking in active battle
   */
  const amIAttacker = computed(() => {
    const myId = playerStore.currentPlayer?.id
    if (!myId || !myBattle.value) return false
    return myBattle.value.attackerId === myId
  })

  /**
   * Story 4.3: Check if current player is involved in any active battle
   */
  const amIInBattle = computed(() => myBattle.value !== null)

  // =====================
  // Actions
  // =====================

  /**
   * Initiate an attack on adjacent territory (Story 4.2)
   * Story 4.3: Added validation to block attack from territory under attack
   * Sends attack event to server
   */
  function initiateAttack(fromTerritoryId: string, toTerritoryId: string): boolean {
    if (isAttacking.value) {
      return false
    }

    // Story 4.3: Block attack from territory that is currently under attack
    const sourceTerritory = territoryStore.getTerritoryById(fromTerritoryId)
    if (sourceTerritory?.isUnderAttack) {
      lastError.value = {
        code: 'UNDER_ATTACK',
        message: 'Ce territoire est en cours de défense'
      }
      return false
    }

    // Also block if territory is already attacking
    if (sourceTerritory?.isAttacking) {
      lastError.value = {
        code: 'ALREADY_ATTACKING',
        message: 'Ce territoire attaque déjà'
      }
      return false
    }

    isAttacking.value = true
    lastError.value = null

    const success = wsStore.send<AttackActionEvent>(BATTLE_EVENTS.ATTACK, {
      fromTerritoryId,
      toTerritoryId
    })

    if (!success) {
      isAttacking.value = false
      lastError.value = {
        code: 'GAME_NOT_STARTED',
        message: 'Connexion perdue'
      }
      return false
    }

    return true
  }

  /**
   * Handle battle:start event from server
   * Called when server confirms battle has started
   */
  function handleBattleStart(event: BattleStartEvent): void {
    isAttacking.value = false

    // Calculate initial remaining time
    const startTimeMs = new Date(event.startTime).getTime()
    const now = Date.now()
    const elapsed = (now - startTimeMs) / 1000
    const remainingTime = Math.max(0, event.duration - elapsed)

    // Create active battle entry with initial zero forces
    const battle: ActiveBattle = {
      ...event,
      remainingTime,
      timerId: null,
      // Story 4.4: Initialize forces to zero
      forces: {
        attackerForce: 0,
        defenderForce: 0,
        attackerMessages: 0,
        defenderMessages: 0,
        attackerUniqueUsers: 0,
        defenderUniqueUsers: 0
      }
    }

    // Start countdown timer
    battle.timerId = setInterval(() => {
      const battleState = activeBattles.value.get(event.battleId)
      if (!battleState) return

      const newRemaining = Math.max(0, battleState.remainingTime - 1)

      // Immutable update
      activeBattles.value = new Map(activeBattles.value)
      activeBattles.value.set(event.battleId, {
        ...battleState,
        remainingTime: newRemaining
      })

      // Timer will be cleared when battle ends via server event
    }, 1000)

    // Add to active battles - IMMUTABLE UPDATE
    activeBattles.value = new Map(activeBattles.value)
    activeBattles.value.set(event.battleId, battle)

    // Clear selection state
    selectedSourceTerritory.value = null
    selectedTargetTerritory.value = null
  }

  /**
   * Story 4.4: Handle battle:progress event from server
   * Updates force values for real-time progress bar display
   * Story 4.5: Also updates feedMessages for chat display (FR26-FR27)
   */
  function handleBattleProgress(event: BattleProgressEvent): void {
    const battle = activeBattles.value.get(event.battleId)
    if (!battle) return

    // IMMUTABLE UPDATE for forces
    activeBattles.value = new Map(activeBattles.value)
    activeBattles.value.set(event.battleId, {
      ...battle,
      forces: {
        attackerForce: event.attackerForce,
        defenderForce: event.defenderForce,
        attackerMessages: event.attackerMessages,
        defenderMessages: event.defenderMessages,
        attackerUniqueUsers: event.attackerUniqueUsers,
        defenderUniqueUsers: event.defenderUniqueUsers
      }
    })

    // Story 4.5: Update feed messages (FIFO with max limit)
    if (event.recentCommands && event.recentCommands.length > 0) {
      // Filter out duplicates by ID
      const existingIds = new Set(feedMessages.value.map(m => m.id))
      const newMessages = event.recentCommands.filter(m => !existingIds.has(m.id))

      if (newMessages.length > 0) {
        // IMMUTABLE UPDATE: Combine and keep only last MAX_FEED_MESSAGES
        const combined = [...feedMessages.value, ...newMessages]
        feedMessages.value = combined.slice(-MAX_FEED_MESSAGES)
      }
    }
  }

  /**
   * Handle battle end (remove from active battles)
   * Called when battle completes or is cancelled
   * Story 4.5: Also clears feed messages
   */
  function handleBattleEnd(battleId: string): void {
    const battle = activeBattles.value.get(battleId)
    if (!battle) return

    // Clear timer
    if (battle.timerId) {
      clearInterval(battle.timerId)
    }

    // Remove from active battles - IMMUTABLE UPDATE
    const newBattles = new Map(activeBattles.value)
    newBattles.delete(battleId)
    activeBattles.value = newBattles

    // Story 4.5: Clear feed messages when battle ends
    feedMessages.value = []
  }

  /**
   * Handle attack failed event from server
   */
  function handleAttackFailed(event: AttackFailedEvent): void {
    isAttacking.value = false
    lastError.value = event
  }

  /**
   * Clear last error
   */
  function clearError(): void {
    lastError.value = null
  }

  /**
   * Set selected source territory for attack UI
   */
  function setSelectedSource(territoryId: string | null): void {
    selectedSourceTerritory.value = territoryId
    if (territoryId === null) {
      selectedTargetTerritory.value = null
    }
  }

  /**
   * Set selected target territory for attack UI
   */
  function setSelectedTarget(territoryId: string | null): void {
    selectedTargetTerritory.value = territoryId
  }

  /**
   * Reset store state (for game end or leave)
   * Story 4.5: Also clears feed messages
   */
  function reset(): void {
    // Clear all battle timers
    for (const battle of activeBattles.value.values()) {
      if (battle.timerId) {
        clearInterval(battle.timerId)
      }
    }

    activeBattles.value = new Map()
    feedMessages.value = []  // Story 4.5
    lastError.value = null
    selectedSourceTerritory.value = null
    selectedTargetTerritory.value = null
    isAttacking.value = false
  }

  return {
    // State
    activeBattles,
    feedMessages,  // Story 4.5
    lastError,
    selectedSourceTerritory,
    selectedTargetTerritory,
    isAttacking,

    // Getters
    hasActiveBattle,
    allActiveBattles,
    getBattleByTerritory,
    isTerritoryInBattle,
    myBattle,
    amIDefender,
    amIAttacker,
    amIInBattle,

    // Actions
    initiateAttack,
    handleBattleStart,
    handleBattleProgress,  // Story 4.4
    handleBattleEnd,
    handleAttackFailed,
    clearError,
    setSelectedSource,
    setSelectedTarget,
    reset
  }
})
