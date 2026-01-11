/**
 * RoomManager Tests - Story 4.7: Territory Transfer
 * Tests the territory ownership transfer functionality
 */

import { describe, it, expect } from 'vitest'
import { roomManager } from './RoomManager.js'
import type { CreateRoomRequest } from 'shared/types'

describe('RoomManager - Territory Transfer (Story 4.7)', () => {

  async function createTestRoom() {
    const createRoomRequest: CreateRoomRequest = {
      creatorPseudo: 'testhost_' + Math.random().toString(36).substring(7),
      config: {}
    }
    return await roomManager.createRoom(createRoomRequest)
  }

  describe('updateTerritoryOwner', () => {
    it('should return success=false when room does not exist', () => {
      const result = roomManager.updateTerritoryOwner(
        'NONEXISTENT',
        'T1',
        'player1',
        '#FF0000'
      )

      expect(result.success).toBe(false)
      expect(result.previousOwnerId).toBeNull()
    })

    it('should return success=false when territory does not exist', async () => {
      const room = await createTestRoom()
      roomManager.startGame(room.room.code, room.creator.id)

      const result = roomManager.updateTerritoryOwner(
        room.room.code,
        'NONEXISTENT_TERRITORY',
        'player1',
        '#FF0000'
      )

      expect(result.success).toBe(false)
      expect(result.previousOwnerId).toBeNull()
    })

    it('should successfully transfer territory from BOT (null) to player', async () => {
      const room = await createTestRoom()
      roomManager.startGame(room.room.code, room.creator.id)

      const gameState = roomManager.getGameState(room.room.code)
      const botTerritory = gameState?.territories.find(t => t.ownerId === null)

      if (!botTerritory) {
        // All territories are assigned to the creator, skip test
        return
      }

      const result = roomManager.updateTerritoryOwner(
        room.room.code,
        botTerritory.id,
        'attackerPlayer',
        '#FF0000'
      )

      expect(result.success).toBe(true)
      expect(result.previousOwnerId).toBeNull() // Was BOT

      const updatedGameState = roomManager.getGameState(room.room.code)
      const updatedTerritory = updatedGameState?.territories.find(t => t.id === botTerritory.id)
      expect(updatedTerritory?.ownerId).toBe('attackerPlayer')
      expect(updatedTerritory?.color).toBe('#FF0000')
    })

    it('should return success=false when game state does not exist', async () => {
      const room = await createTestRoom()
      // Don't start game - no game state exists

      const result = roomManager.updateTerritoryOwner(
        room.room.code,
        'T1',
        'player1',
        '#FF0000'
      )

      expect(result.success).toBe(false)
      expect(result.previousOwnerId).toBeNull()
    })

    it('should handle case-insensitive room codes', async () => {
      const room = await createTestRoom()
      roomManager.startGame(room.room.code, room.creator.id)

      const gameState = roomManager.getGameState(room.room.code)
      const territory = gameState?.territories[0]

      if (!territory) return

      const result = roomManager.updateTerritoryOwner(
        room.room.code.toLowerCase(),
        territory.id,
        'player1',
        '#FF0000'
      )

      expect(result.success).toBe(true)
    })
  })

  describe('Territory Transfer Edge Cases (Story 4.7 AC)', () => {
    it('AC1: Attacker wins - territory should transfer with correct color', async () => {
      const room = await createTestRoom()
      roomManager.startGame(room.room.code, room.creator.id)

      const gameState = roomManager.getGameState(room.room.code)
      const territory = gameState?.territories.find(t => t.ownerId === null)

      if (!territory) return

      const attackerColor = '#FF5733'
      const result = roomManager.updateTerritoryOwner(
        room.room.code,
        territory.id,
        'attackerPlayerId',
        attackerColor
      )

      expect(result.success).toBe(true)

      const updated = roomManager.getGameState(room.room.code)
      const updatedTerritory = updated?.territories.find(t => t.id === territory.id)
      expect(updatedTerritory?.color).toBe(attackerColor)
      expect(updatedTerritory?.ownerId).toBe('attackerPlayerId')
    })

    it('AC4: BOT territory capture - ownerId changes from null to playerId', async () => {
      const room = await createTestRoom()
      roomManager.startGame(room.room.code, room.creator.id)

      const gameState = roomManager.getGameState(room.room.code)
      const botTerritory = gameState?.territories.find(t => t.ownerId === null)

      if (!botTerritory) return

      expect(botTerritory.ownerId).toBeNull()

      const result = roomManager.updateTerritoryOwner(
        room.room.code,
        botTerritory.id,
        'conquerorId',
        '#123456'
      )

      expect(result.success).toBe(true)
      expect(result.previousOwnerId).toBeNull()

      const updated = roomManager.getGameState(room.room.code)
      const captured = updated?.territories.find(t => t.id === botTerritory.id)
      expect(captured?.ownerId).toBe('conquerorId')
      expect(captured?.ownerId).not.toBeNull()
    })

    it('should preserve previousOwnerId for player-owned territories', async () => {
      const room = await createTestRoom()
      roomManager.startGame(room.room.code, room.creator.id)

      const gameState = roomManager.getGameState(room.room.code)
      const playerTerritory = gameState?.territories.find(t => t.ownerId !== null)

      if (!playerTerritory) return

      const originalOwnerId = playerTerritory.ownerId

      const result = roomManager.updateTerritoryOwner(
        room.room.code,
        playerTerritory.id,
        'newAttackerId',
        '#AABBCC'
      )

      expect(result.success).toBe(true)
      expect(result.previousOwnerId).toBe(originalOwnerId)
    })
  })
})
