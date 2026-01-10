import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Territory, TerritorySelection, TerritoryUpdateEvent } from 'shared/types'
import { getInitialTerritories, findTerritoryByCell } from 'shared/data'

/**
 * Territory Store - Manages territory state for the game grid
 *
 * CRITICAL: Uses IMMUTABLE updates with spread operators
 * Never mutate state directly (territories.value.push() is FORBIDDEN)
 */
export const useTerritoryStore = defineStore('territory', () => {
  // =====================
  // State
  // =====================

  /** All territories in the current game */
  const territories = ref<Territory[]>([])

  /** Currently selected territory ID for the local player */
  const selectedTerritoryId = ref<string | null>(null)

  /** Currently hovered territory ID (for UI feedback) */
  const hoveredTerritoryId = ref<string | null>(null)

  /** Map of player IDs to their selected territory IDs */
  const playerSelections = ref<Map<string, string>>(new Map())

  /** Whether territory selection phase is active */
  const isSelectionPhase = ref(false)

  // =====================
  // Getters
  // =====================

  /** Get territories that are available for selection (no owner) */
  const availableTerritories = computed(() =>
    territories.value.filter(t => t.ownerId === null)
  )

  /** Get the currently selected territory object */
  const selectedTerritory = computed(() =>
    territories.value.find(t => t.id === selectedTerritoryId.value) ?? null
  )

  /** Get the currently hovered territory object */
  const hoveredTerritory = computed(() =>
    territories.value.find(t => t.id === hoveredTerritoryId.value) ?? null
  )

  /** Get a territory by ID */
  function getTerritoryById(id: string): Territory | undefined {
    return territories.value.find(t => t.id === id)
  }

  /** Get the territory selected by a specific player */
  function getPlayerTerritory(playerId: string): Territory | undefined {
    const territoryId = playerSelections.value.get(playerId)
    if (!territoryId) return undefined
    return territories.value.find(t => t.id === territoryId)
  }

  /** Find which territory contains a given cell coordinate */
  function findTerritoryAtCell(x: number, y: number): Territory | undefined {
    return findTerritoryByCell(x, y, territories.value)
  }

  /** Check if a territory is available for selection */
  function isTerritoryAvailable(territoryId: string): boolean {
    const territory = getTerritoryById(territoryId)
    return territory !== undefined && territory.ownerId === null
  }

  // =====================
  // Actions
  // =====================

  /** Initialize territories for a new game */
  function initializeTerritories(): void {
    territories.value = getInitialTerritories()
    selectedTerritoryId.value = null
    hoveredTerritoryId.value = null
    playerSelections.value = new Map()
  }

  /** Start the territory selection phase */
  function startSelectionPhase(): void {
    isSelectionPhase.value = true
  }

  /** End the territory selection phase */
  function endSelectionPhase(): void {
    isSelectionPhase.value = false
    hoveredTerritoryId.value = null
  }

  /** Set the hovered territory (for UI feedback) */
  function setHoveredTerritory(territoryId: string | null): void {
    hoveredTerritoryId.value = territoryId
  }

  /**
   * Select a territory for the local player
   * Returns true if selection was successful, false if territory unavailable
   */
  function selectTerritory(territoryId: string, playerId: string, playerColor: string): boolean {
    const territory = getTerritoryById(territoryId)

    // Can't select if territory doesn't exist or is already owned
    if (!territory || territory.ownerId !== null) {
      return false
    }

    // Clear previous selection if any
    if (selectedTerritoryId.value !== null) {
      clearSelection(playerId)
    }

    // Update territory with owner - IMMUTABLE UPDATE
    territories.value = territories.value.map(t =>
      t.id === territoryId
        ? { ...t, ownerId: playerId, color: playerColor }
        : t
    )

    // Update local selection
    selectedTerritoryId.value = territoryId

    // Update player selections map - IMMUTABLE UPDATE
    const newMap = new Map(playerSelections.value)
    newMap.set(playerId, territoryId)
    playerSelections.value = newMap

    return true
  }

  /**
   * Clear the local player's selection
   */
  function clearSelection(playerId: string): void {
    const previousTerritoryId = selectedTerritoryId.value

    if (previousTerritoryId === null) return

    // Clear territory owner - IMMUTABLE UPDATE
    territories.value = territories.value.map(t =>
      t.id === previousTerritoryId
        ? { ...t, ownerId: null, color: null }
        : t
    )

    // Clear local selection
    selectedTerritoryId.value = null

    // Update player selections map - IMMUTABLE UPDATE
    const newMap = new Map(playerSelections.value)
    newMap.delete(playerId)
    playerSelections.value = newMap
  }

  /**
   * Update a player's territory selection (from WebSocket broadcast)
   * Used when another player selects/changes territory
   */
  function updatePlayerSelection(selection: TerritorySelection): void {
    const { playerId, territoryId, color } = selection

    // First, clear any previous selection by this player
    const previousTerritoryId = playerSelections.value.get(playerId)
    if (previousTerritoryId) {
      territories.value = territories.value.map(t =>
        t.id === previousTerritoryId
          ? { ...t, ownerId: null, color: null }
          : t
      )
    }

    // Then set the new selection
    territories.value = territories.value.map(t =>
      t.id === territoryId
        ? { ...t, ownerId: playerId, color }
        : t
    )

    // Update player selections map
    const newMap = new Map(playerSelections.value)
    newMap.set(playerId, territoryId)
    playerSelections.value = newMap
  }

  /**
   * Remove a player's territory selection (from WebSocket release event)
   */
  function removePlayerSelection(playerId: string, territoryId: string): void {
    // Clear territory owner
    territories.value = territories.value.map(t =>
      t.id === territoryId && t.ownerId === playerId
        ? { ...t, ownerId: null, color: null }
        : t
    )

    // Update player selections map
    const newMap = new Map(playerSelections.value)
    newMap.delete(playerId)
    playerSelections.value = newMap
  }

  /**
   * Remove all selections for a player who left/disconnected
   */
  function removePlayerFromGame(playerId: string): void {
    const territoryId = playerSelections.value.get(playerId)

    if (territoryId) {
      territories.value = territories.value.map(t =>
        t.id === territoryId
          ? { ...t, ownerId: null, color: null }
          : t
      )
    }

    const newMap = new Map(playerSelections.value)
    newMap.delete(playerId)
    playerSelections.value = newMap
  }

  // =====================
  // Story 4.1: Game Phase Actions
  // =====================

  /**
   * Update territory owner from WebSocket event (Story 4.1)
   * IMMUTABLE UPDATE - required for Vue 3 reactivity
   */
  function updateTerritoryOwner(event: TerritoryUpdateEvent): void {
    territories.value = territories.value.map(t =>
      t.id === event.territoryId
        ? { ...t, ownerId: event.newOwnerId, color: event.newColor }
        : t
    )

    // Update player selections map if needed
    if (event.previousOwnerId) {
      const newMap = new Map(playerSelections.value)
      newMap.delete(event.previousOwnerId)
      if (event.newOwnerId) {
        newMap.set(event.newOwnerId, event.territoryId)
      }
      playerSelections.value = newMap
    } else if (event.newOwnerId) {
      const newMap = new Map(playerSelections.value)
      newMap.set(event.newOwnerId, event.territoryId)
      playerSelections.value = newMap
    }
  }

  /**
   * Set territories from server state (Story 4.1 - game:stateInit)
   */
  function setTerritories(newTerritories: Territory[]): void {
    territories.value = [...newTerritories]
    // Rebuild player selections from territories
    const newMap = new Map<string, string>()
    newTerritories.forEach(t => {
      if (t.ownerId) {
        newMap.set(t.ownerId, t.id)
      }
    })
    playerSelections.value = newMap
  }

  /**
   * Update territory battle status (Story 4.1)
   */
  function setTerritoryBattleStatus(
    territoryId: string,
    status: { isUnderAttack?: boolean; isAttacking?: boolean }
  ): void {
    territories.value = territories.value.map(t =>
      t.id === territoryId
        ? { ...t, ...status }
        : t
    )
  }

  // =====================
  // Story 4.1: Computed Getters
  // =====================

  /** Get all territories owned by a specific player */
  const getTerritoriesByOwner = computed(() => (ownerId: string) =>
    territories.value.filter(t => t.ownerId === ownerId)
  )

  /** Get adjacent territories for a given territory */
  const getAdjacentTerritories = computed(() => (territoryId: string) => {
    const territory = territories.value.find(t => t.id === territoryId)
    if (!territory) return []
    return territories.value.filter(t =>
      territory.adjacentTerritoryIds.includes(t.id)
    )
  })

  /** Get all BOT (unowned) territories */
  const botTerritories = computed(() =>
    territories.value.filter(t => t.ownerId === null)
  )

  /** Count territories by owner */
  const territoryCounts = computed(() => {
    const counts = new Map<string, number>()
    territories.value.forEach(t => {
      const owner = t.ownerId ?? 'BOT'
      counts.set(owner, (counts.get(owner) ?? 0) + 1)
    })
    return counts
  })

  return {
    // State
    territories,
    selectedTerritoryId,
    hoveredTerritoryId,
    playerSelections,
    isSelectionPhase,

    // Getters
    availableTerritories,
    selectedTerritory,
    hoveredTerritory,
    getTerritoryById,
    getPlayerTerritory,
    findTerritoryAtCell,
    isTerritoryAvailable,
    // Story 4.1 getters
    getTerritoriesByOwner,
    getAdjacentTerritories,
    botTerritories,
    territoryCounts,

    // Actions
    initializeTerritories,
    startSelectionPhase,
    endSelectionPhase,
    setHoveredTerritory,
    selectTerritory,
    clearSelection,
    updatePlayerSelection,
    removePlayerSelection,
    removePlayerFromGame,
    // Story 4.1 actions
    updateTerritoryOwner,
    setTerritories,
    setTerritoryBattleStatus
  }
})
