import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Creator, PlayerInRoom, GameConfig } from 'shared/types'

interface RoomData {
  roomCode: string
  roomId: string
  creator?: Creator
  currentPlayer?: PlayerInRoom
  players: PlayerInRoom[]
  config?: GameConfig
}

export const useLobbyStore = defineStore('lobby', () => {
  const isInLobby = ref<boolean>(false)
  const selectedTerritoryId = ref<string | null>(null)
  const roomData = ref<RoomData | null>(null)
  const lastError = ref<{ code: string; message: string; timestamp: number } | null>(null)

  // Getters
  const hasSelectedTerritory = computed(() => selectedTerritoryId.value !== null)
  const roomCode = computed(() => roomData.value?.roomCode ?? '')
  const roomId = computed(() => roomData.value?.roomId ?? '')
  const creator = computed(() => roomData.value?.creator ?? null)
  const currentPlayer = computed(() => roomData.value?.currentPlayer ?? null)
  const currentPlayerId = computed(() => roomData.value?.currentPlayer?.id ?? null)
  const playerId = computed(() => roomData.value?.currentPlayer?.id ?? null)
  const playerColor = computed(() => roomData.value?.currentPlayer?.color ?? null)
  const players = computed(() => roomData.value?.players ?? [])
  const playerCount = computed(() => roomData.value?.players.length ?? 0)
  const config = computed(() => roomData.value?.config ?? null)
  const isCreator = computed(() => roomData.value?.currentPlayer?.isCreator ?? false)

  // Actions - for room creator
  function enterLobbyAsCreator(data: { roomCode: string; roomId: string; creator: Creator }) {
    const creatorAsPlayer: PlayerInRoom = {
      id: data.creator.id,
      pseudo: data.creator.pseudo,
      color: data.creator.color,
      avatarUrl: data.creator.avatarUrl,
      isCreator: true,
      isReady: false
    }
    roomData.value = {
      roomCode: data.roomCode,
      roomId: data.roomId,
      creator: data.creator,
      currentPlayer: creatorAsPlayer,
      players: [creatorAsPlayer]
    }
    isInLobby.value = true
  }

  // Actions - for joining players
  function enterLobbyAsJoiner(data: { roomCode: string; roomId: string; currentPlayer: PlayerInRoom; players: PlayerInRoom[]; config: GameConfig }) {
    roomData.value = {
      roomCode: data.roomCode,
      roomId: data.roomId,
      currentPlayer: data.currentPlayer,
      players: data.players,
      config: data.config
    }
    isInLobby.value = true
  }

  // Legacy support for existing code
  function enterLobby(data: { roomCode: string; roomId: string; creator: Creator }) {
    enterLobbyAsCreator(data)
  }

  function exitLobby() {
    isInLobby.value = false
    selectedTerritoryId.value = null
    roomData.value = null
  }

  // WebSocket sync actions (immutable updates)
  function addPlayer(player: PlayerInRoom) {
    if (!roomData.value) return
    // Prevent duplicates
    if (roomData.value.players.some(p => p.id === player.id)) return

    roomData.value = {
      ...roomData.value,
      players: [...roomData.value.players, player]
    }
  }

  function removePlayer(playerId: string) {
    if (!roomData.value) return

    roomData.value = {
      ...roomData.value,
      players: roomData.value.players.filter(p => p.id !== playerId)
    }
  }

  function syncPlayers(players: PlayerInRoom[]) {
    if (!roomData.value) return

    roomData.value = {
      ...roomData.value,
      players
    }
  }

  function selectTerritory(territoryId: string) {
    selectedTerritoryId.value = territoryId
  }

  function clearSelection() {
    selectedTerritoryId.value = null
  }

  // Update config (immutable pattern for reactivity)
  function updateConfig(newConfig: Partial<GameConfig>) {
    if (!roomData.value) return

    // Guard against undefined config - use empty object as fallback
    const currentConfig = roomData.value.config ?? {}

    roomData.value = {
      ...roomData.value,
      config: {
        ...currentConfig,
        ...newConfig
      } as GameConfig
    }
  }

  // Sync config from WebSocket (full replace)
  function syncConfig(config: GameConfig) {
    if (!roomData.value) return

    roomData.value = {
      ...roomData.value,
      config
    }
  }

  // Set error state (for components to react to, e.g., reset loading state)
  function setError(code: string, message: string) {
    lastError.value = { code, message, timestamp: Date.now() }
  }

  // Clear error state
  function clearError() {
    lastError.value = null
  }

  return {
    isInLobby,
    selectedTerritoryId,
    roomData,
    hasSelectedTerritory,
    roomCode,
    roomId,
    creator,
    currentPlayer,
    currentPlayerId,
    playerId,
    playerColor,
    players,
    playerCount,
    config,
    isCreator,
    enterLobby,
    enterLobbyAsCreator,
    enterLobbyAsJoiner,
    exitLobby,
    addPlayer,
    removePlayer,
    syncPlayers,
    selectTerritory,
    clearSelection,
    updateConfig,
    syncConfig,
    lastError,
    setError,
    clearError
  }
})
