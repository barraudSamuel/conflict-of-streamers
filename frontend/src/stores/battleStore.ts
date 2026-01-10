import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useWebSocketStore } from './websocketStore'
import type { BattleStartEvent, AttackFailedEvent, AttackActionEvent } from 'shared/types'
import { BATTLE_EVENTS } from 'shared/types'

/**
 * Story 4.2: Active battle state for real-time battle tracking
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
}

export const useBattleStore = defineStore('battle', () => {
  const wsStore = useWebSocketStore()

  // =====================
  // State
  // =====================

  /** Map of active battles by battleId */
  const activeBattles = ref<Map<string, ActiveBattle>>(new Map())

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

  // =====================
  // Actions
  // =====================

  /**
   * Initiate an attack on adjacent territory (Story 4.2)
   * Sends attack event to server
   */
  function initiateAttack(fromTerritoryId: string, toTerritoryId: string): boolean {
    if (isAttacking.value) {
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

    // Create active battle entry
    const battle: ActiveBattle = {
      ...event,
      remainingTime,
      timerId: null
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
   * Handle battle end (remove from active battles)
   * Called when battle completes or is cancelled
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
   */
  function reset(): void {
    // Clear all battle timers
    for (const battle of activeBattles.value.values()) {
      if (battle.timerId) {
        clearInterval(battle.timerId)
      }
    }

    activeBattles.value = new Map()
    lastError.value = null
    selectedSourceTerritory.value = null
    selectedTargetTerritory.value = null
    isAttacking.value = false
  }

  return {
    // State
    activeBattles,
    lastError,
    selectedSourceTerritory,
    selectedTargetTerritory,
    isAttacking,

    // Getters
    hasActiveBattle,
    allActiveBattles,
    getBattleByTerritory,
    isTerritoryInBattle,

    // Actions
    initiateAttack,
    handleBattleStart,
    handleBattleEnd,
    handleAttackFailed,
    clearError,
    setSelectedSource,
    setSelectedTarget,
    reset
  }
})
