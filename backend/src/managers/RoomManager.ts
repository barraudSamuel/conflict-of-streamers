/**
 * RoomManager - In-memory room state management
 * Handles room creation, retrieval, player management, and TTL cleanup
 */

import type { Room, CreateRoomRequest, GameConfig, Creator, PlayerInRoom, RoomState } from 'shared/types'
import { GameConfigSchema } from 'shared/schemas'
import { GameError, NotFoundError } from 'shared/errors'
import { generateRoomCode } from '../utils/codeGenerator'
import { generateDefaultAvatar, getPlayerColor } from '../utils/avatarGenerator'
import { logger } from '../utils/logger'
import { randomUUID } from 'crypto'

const MAX_PLAYERS = 10

interface TerritorySelection {
  playerId: string
  territoryId: string
  color: string
}

interface RoomWithMeta {
  room: Room
  lastActivity: Date
  players: PlayerInRoom[]
  territorySelections: Map<string, TerritorySelection> // playerId -> selection
}

interface CreateRoomResult {
  room: Room
  creator: Creator
}

interface AddPlayerResult {
  player: PlayerInRoom
  roomState: RoomState
}

const ROOM_TTL_EMPTY_MS = 30 * 60 * 1000 // 30 minutes for empty rooms
const ROOM_TTL_ACTIVE_MS = 2 * 60 * 60 * 1000 // 2 hours for rooms with players (abandoned games)

class RoomManagerClass {
  private rooms = new Map<string, RoomWithMeta>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60 * 1000) // Every minute
  }

  createRoom(request: CreateRoomRequest): CreateRoomResult {
    // Generate unique room code
    let code = generateRoomCode()
    let attempts = 0
    while (this.rooms.has(code) && attempts < 10) {
      code = generateRoomCode()
      attempts++
    }

    if (this.rooms.has(code)) {
      throw new GameError('Failed to generate unique room code after 10 attempts')
    }

    const roomId = randomUUID()
    const creatorId = randomUUID()
    const now = new Date().toISOString()

    // Merge provided config with defaults
    const defaultConfig = GameConfigSchema.parse({})
    const mergedConfig: GameConfig = {
      ...defaultConfig,
      battleDuration: request.config?.battleDuration ?? defaultConfig.battleDuration,
      cooldownBetweenActions: request.config?.cooldownBetweenActions ?? defaultConfig.cooldownBetweenActions
    }

    // Create room
    const room: Room = {
      id: roomId,
      code,
      creatorId,
      status: 'lobby',
      config: mergedConfig,
      playerIds: [creatorId],
      createdAt: now,
      updatedAt: now
    }

    // Generate creator data (first player gets color index 0)
    const colorIndex = 0
    const color = getPlayerColor(colorIndex)
    const avatarUrl = generateDefaultAvatar(request.creatorPseudo, colorIndex)

    const creator: Creator = {
      id: creatorId,
      pseudo: request.creatorPseudo,
      color,
      avatarUrl
    }

    // Create player representation for room (reuse computed values)
    const creatorPlayer: PlayerInRoom = {
      id: creatorId,
      pseudo: request.creatorPseudo,
      color,
      avatarUrl,
      isCreator: true,
      isReady: false
    }

    // Store room with players array
    this.rooms.set(code, {
      room,
      lastActivity: new Date(),
      players: [creatorPlayer],
      territorySelections: new Map()
    })

    return { room, creator }
  }

  addPlayer(roomCode: string, pseudo: string): AddPlayerResult {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)

    if (!roomData) {
      throw new NotFoundError('Partie introuvable', { roomCode: normalizedCode })
    }

    // Check room status - can only join lobby
    if (roomData.room.status !== 'lobby') {
      throw new GameError('GAME_STARTED', 'Cette partie a déjà commencé')
    }

    // Check pseudo uniqueness (case-insensitive)
    const pseudoLower = pseudo.toLowerCase()
    if (roomData.players.some(p => p.pseudo.toLowerCase() === pseudoLower)) {
      throw new GameError('PSEUDO_TAKEN', 'Ce pseudo est déjà utilisé dans cette partie')
    }

    // Check max players
    if (roomData.players.length >= MAX_PLAYERS) {
      throw new GameError('ROOM_FULL', 'La partie est complète (max 10 joueurs)')
    }

    // Assign color (cycle through 8 colors)
    const colorIndex = roomData.players.length
    const color = getPlayerColor(colorIndex)
    const avatarUrl = generateDefaultAvatar(pseudo, colorIndex)

    const player: PlayerInRoom = {
      id: randomUUID(),
      pseudo,
      color,
      avatarUrl,
      isCreator: false,
      isReady: false
    }

    // Add player to room (immutable update)
    roomData.players = [...roomData.players, player]
    roomData.room.playerIds = [...roomData.room.playerIds, player.id]
    roomData.room.updatedAt = new Date().toISOString()
    roomData.lastActivity = new Date()

    logger.info({ roomCode: normalizedCode, playerId: player.id, pseudo }, 'Player joined room')

    // Build room state for response
    const roomState: RoomState = {
      roomCode: roomData.room.code,
      roomId: roomData.room.id,
      players: roomData.players,
      config: roomData.room.config
    }

    return { player, roomState }
  }

  getRoom(code: string): Room | null {
    const roomData = this.rooms.get(code.toUpperCase())
    if (roomData) {
      roomData.lastActivity = new Date()
      return roomData.room
    }
    return null
  }

  roomExists(code: string): boolean {
    return this.rooms.has(code.toUpperCase())
  }

  /**
   * Get full room state for lobby sync
   */
  getRoomState(roomCode: string): RoomState | null {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return null

    roomData.lastActivity = new Date()

    return {
      roomCode: roomData.room.code,
      roomId: roomData.room.id,
      players: roomData.players,
      config: roomData.room.config
    }
  }

  /**
   * Remove a player from a room (for disconnection/leave handling)
   */
  removePlayer(roomCode: string, playerId: string): boolean {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return false

    const playerExists = roomData.players.some(p => p.id === playerId)
    if (!playerExists) return false

    // Immutable updates
    roomData.players = roomData.players.filter(p => p.id !== playerId)
    roomData.room.playerIds = roomData.room.playerIds.filter(id => id !== playerId)
    roomData.room.updatedAt = new Date().toISOString()
    roomData.lastActivity = new Date()

    logger.info({ roomCode: normalizedCode, playerId }, 'Player removed from room')
    return true
  }

  /**
   * Check if a player exists in a room
   */
  isPlayerInRoom(roomCode: string, playerId: string): boolean {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return false

    return roomData.room.playerIds.includes(playerId)
  }

  /**
   * Select a territory for a player
   * Returns the previous selection (if any) for broadcast, or null if failed
   */
  selectTerritory(
    roomCode: string,
    playerId: string,
    territoryId: string
  ): { success: boolean; previousTerritoryId: string | null; playerColor: string | null } {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return { success: false, previousTerritoryId: null, playerColor: null }

    // Verify player exists in room
    const player = roomData.players.find(p => p.id === playerId)
    if (!player) return { success: false, previousTerritoryId: null, playerColor: null }

    // Check if territory is already selected by another player
    for (const [otherId, selection] of roomData.territorySelections) {
      if (selection.territoryId === territoryId && otherId !== playerId) {
        // Territory already taken by someone else
        return { success: false, previousTerritoryId: null, playerColor: null }
      }
    }

    // Get previous selection for this player
    const previousSelection = roomData.territorySelections.get(playerId)
    const previousTerritoryId = previousSelection?.territoryId ?? null

    // Set new selection
    roomData.territorySelections.set(playerId, {
      playerId,
      territoryId,
      color: player.color
    })

    roomData.lastActivity = new Date()
    logger.info({ roomCode: normalizedCode, playerId, territoryId }, 'Territory selected')

    return { success: true, previousTerritoryId, playerColor: player.color }
  }

  /**
   * Clear a player's territory selection
   */
  clearTerritorySelection(roomCode: string, playerId: string): string | null {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return null

    const previousSelection = roomData.territorySelections.get(playerId)
    if (!previousSelection) return null

    roomData.territorySelections.delete(playerId)
    roomData.lastActivity = new Date()
    logger.info({ roomCode: normalizedCode, playerId }, 'Territory selection cleared')

    return previousSelection.territoryId
  }

  /**
   * Get all territory selections for a room
   */
  getTerritorySelections(roomCode: string): TerritorySelection[] {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return []

    return Array.from(roomData.territorySelections.values())
  }

  /**
   * Get a player's territory selection
   */
  getPlayerTerritorySelection(roomCode: string, playerId: string): TerritorySelection | null {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return null

    return roomData.territorySelections.get(playerId) ?? null
  }

  /**
   * Get player info by ID
   */
  getPlayer(roomCode: string, playerId: string): PlayerInRoom | null {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return null

    return roomData.players.find(p => p.id === playerId) ?? null
  }

  private cleanupStaleRooms(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [code, roomData] of this.rooms) {
      const elapsed = now - roomData.lastActivity.getTime()
      const hasPlayers = roomData.players.length > 0
      const ttl = hasPlayers ? ROOM_TTL_ACTIVE_MS : ROOM_TTL_EMPTY_MS

      if (elapsed > ttl) {
        logger.info(
          { roomCode: code, elapsed: Math.round(elapsed / 1000), playerCount: roomData.players.length },
          'Cleaning up stale room'
        )
        this.rooms.delete(code)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned, remaining: this.rooms.size }, 'Cleaned up stale rooms')
    }
  }

  // For testing/debugging
  getRoomCount(): number {
    return this.rooms.size
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.rooms.clear()
  }
}

// Export singleton instance
export const roomManager = new RoomManagerClass()
