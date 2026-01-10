/**
 * RoomManager - In-memory room state management
 * Handles room creation, retrieval, player management, and TTL cleanup
 */

import type { Room, CreateRoomRequest, GameConfig, Creator, PlayerInRoom, RoomState, ConfigUpdateEvent, Territory } from 'shared/types'
import { GameConfigSchema, ConfigUpdateEventSchema } from 'shared/schemas'
import { getInitialTerritories } from 'shared/data'
import { GameError, NotFoundError } from 'shared/errors'
import { generateRoomCode } from '../utils/codeGenerator'
import { generateDefaultAvatar, getPlayerColor } from '../utils/avatarGenerator'
import { getTwitchAvatar } from '../utils/twitchAvatar'
import { logger } from '../utils/logger'
import { randomUUID } from 'crypto'
import { twitchManager } from './TwitchManager'

const MAX_PLAYERS = 10
const MIN_PLAYERS = 2

interface TerritorySelection {
  playerId: string
  territoryId: string
  color: string
}

interface GameState {
  territories: Territory[]
  startedAt: string
}

interface RoomWithMeta {
  room: Room
  lastActivity: Date
  players: PlayerInRoom[]
  territorySelections: Map<string, TerritorySelection> // playerId -> selection
  gameState: GameState | null // Only populated when game starts (Story 4.1)
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
  private isCleaningUp = false // Prevent concurrent cleanup runs (MEDIUM-2 fix)

  constructor() {
    // Start cleanup interval - handles async cleanup properly
    this.cleanupInterval = setInterval(() => {
      if (!this.isCleaningUp) {
        this.cleanupStaleRooms().catch(err => {
          logger.error({ err }, 'Error during room cleanup')
        })
      }
    }, 60 * 1000) // Every minute
  }

  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResult> {
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

    // FR5: Try to fetch Twitch avatar, fallback to default SVG if unavailable
    const twitchAvatar = await getTwitchAvatar(request.creatorPseudo)
    const avatarUrl = twitchAvatar ?? generateDefaultAvatar(request.creatorPseudo, colorIndex)

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
      territorySelections: new Map(),
      gameState: null
    })

    return { room, creator }
  }

  async addPlayer(roomCode: string, pseudo: string): Promise<AddPlayerResult> {
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

    // FR5: Try to fetch Twitch avatar, fallback to default SVG if unavailable
    const twitchAvatar = await getTwitchAvatar(pseudo)
    const avatarUrl = twitchAvatar ?? generateDefaultAvatar(pseudo, colorIndex)

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

  /**
   * Check if all players have selected a territory (Story 2.7)
   */
  allPlayersHaveSelectedTerritory(roomCode: string): boolean {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return false

    // Every player must have a selection in territorySelections map
    return roomData.players.every(player =>
      roomData.territorySelections.has(player.id)
    )
  }

  /**
   * Get list of players who haven't selected a territory (Story 2.7)
   */
  getPlayersWithoutTerritory(roomCode: string): PlayerInRoom[] {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData) return []

    return roomData.players.filter(player =>
      !roomData.territorySelections.has(player.id)
    )
  }

  /**
   * Start the game (creator only, all territories must be selected) (Story 2.7)
   * Returns success/error with reason
   */
  startGame(roomCode: string, playerId: string): { success: boolean; error?: string } {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)

    // Room not found
    if (!roomData) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    // Verify player is creator
    const player = roomData.players.find(p => p.id === playerId)
    if (!player || !player.isCreator) {
      logger.warn({ roomCode: normalizedCode, playerId }, 'Non-creator attempted game start')
      return { success: false, error: 'NOT_CREATOR' }
    }

    // Verify room is in lobby status
    if (roomData.room.status !== 'lobby') {
      logger.warn({ roomCode: normalizedCode, status: roomData.room.status }, 'Game start rejected - already started')
      return { success: false, error: 'GAME_STARTED' }
    }

    // Verify minimum player count (Code Review fix MEDIUM-3)
    if (roomData.players.length < MIN_PLAYERS) {
      logger.warn({ roomCode: normalizedCode, playerCount: roomData.players.length }, 'Game start rejected - not enough players')
      return { success: false, error: 'NOT_ENOUGH_PLAYERS' }
    }

    // Verify all players have selected territory
    const allReady = roomData.players.every(p => roomData.territorySelections.has(p.id))
    if (!allReady) {
      const missing = roomData.players.filter(p => !roomData.territorySelections.has(p.id))
      logger.warn({ roomCode: normalizedCode, missingPlayers: missing.map(p => p.pseudo) }, 'Game start rejected - not all ready')
      return { success: false, error: 'NOT_ALL_READY' }
    }

    // Transition room status to 'playing'
    roomData.room.status = 'playing'
    roomData.room.updatedAt = new Date().toISOString()
    roomData.lastActivity = new Date()

    // Story 4.1: Initialize game state with territories
    const territories = getInitialTerritories()

    // Apply player territory selections to territories
    for (const [pId, selection] of roomData.territorySelections) {
      const territoryIndex = territories.findIndex(t => t.id === selection.territoryId)
      if (territoryIndex !== -1) {
        territories[territoryIndex] = {
          ...territories[territoryIndex],
          ownerId: pId,
          color: selection.color
        }
      }
    }

    roomData.gameState = {
      territories,
      startedAt: new Date().toISOString()
    }

    logger.info({ roomCode: normalizedCode, playerId, playerCount: roomData.players.length }, 'Game started')

    return { success: true }
  }

  /**
   * Update game configuration (creator only, lobby status only)
   * Returns updated config on success, null on failure
   */
  updateConfig(
    roomCode: string,
    playerId: string,
    configUpdate: ConfigUpdateEvent
  ): { success: boolean; config: GameConfig | null; error?: string } {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)

    // Room not found
    if (!roomData) {
      return { success: false, config: null, error: 'ROOM_NOT_FOUND' }
    }

    // Verify player is creator
    const player = roomData.players.find(p => p.id === playerId)
    if (!player || !player.isCreator) {
      logger.warn({ roomCode: normalizedCode, playerId }, 'Non-creator attempted config update')
      return { success: false, config: null, error: 'NOT_CREATOR' }
    }

    // Verify room is in lobby status (AR7 - immutable after game start)
    if (roomData.room.status !== 'lobby') {
      logger.warn({ roomCode: normalizedCode, status: roomData.room.status }, 'Config update rejected - game already started')
      return { success: false, config: null, error: 'GAME_STARTED' }
    }

    // Validate config update with Zod (server-side security)
    const parseResult = ConfigUpdateEventSchema.safeParse(configUpdate)
    if (!parseResult.success) {
      logger.warn({ roomCode: normalizedCode, errors: parseResult.error.errors }, 'Invalid config update data')
      return { success: false, config: null, error: 'INVALID_CONFIG' }
    }

    // Immutable config update pattern
    const validatedUpdate = parseResult.data
    roomData.room.config = {
      ...roomData.room.config,
      ...(validatedUpdate.battleDuration !== undefined && { battleDuration: validatedUpdate.battleDuration }),
      ...(validatedUpdate.cooldownBetweenActions !== undefined && { cooldownBetweenActions: validatedUpdate.cooldownBetweenActions })
    }
    roomData.room.updatedAt = new Date().toISOString()
    roomData.lastActivity = new Date()

    logger.info({ roomCode: normalizedCode, playerId, config: roomData.room.config }, 'Game config updated')

    return { success: true, config: roomData.room.config }
  }

  // Story 4.1: Get game state for game:stateInit event
  getGameState(roomCode: string): GameState | null {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)
    if (!roomData || !roomData.gameState) return null

    return roomData.gameState
  }

  // Story 4.1: Update a territory's ownership (for territory:update events)
  updateTerritoryOwner(
    roomCode: string,
    territoryId: string,
    newOwnerId: string | null,
    newColor: string | null
  ): { success: boolean; previousOwnerId: string | null } {
    const normalizedCode = roomCode.toUpperCase()
    const roomData = this.rooms.get(normalizedCode)

    if (!roomData || !roomData.gameState) {
      return { success: false, previousOwnerId: null }
    }

    const territoryIndex = roomData.gameState.territories.findIndex(t => t.id === territoryId)
    if (territoryIndex === -1) {
      return { success: false, previousOwnerId: null }
    }

    const previousOwnerId = roomData.gameState.territories[territoryIndex].ownerId

    // Immutable update
    roomData.gameState.territories = roomData.gameState.territories.map((t, i) =>
      i === territoryIndex
        ? { ...t, ownerId: newOwnerId, color: newColor }
        : t
    )

    roomData.lastActivity = new Date()
    logger.info({ roomCode: normalizedCode, territoryId, previousOwnerId, newOwnerId }, 'Territory owner updated')

    return { success: true, previousOwnerId }
  }

  private async cleanupStaleRooms(): Promise<void> {
    this.isCleaningUp = true
    try {
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
          // Disconnect Twitch IRC before deleting room (Story 3.1)
          await twitchManager.disconnect(code)
          this.rooms.delete(code)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.info({ cleaned, remaining: this.rooms.size }, 'Cleaned up stale rooms')
      }
    } finally {
      this.isCleaningUp = false
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
