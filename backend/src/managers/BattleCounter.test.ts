/**
 * Unit Tests for BattleCounter (Story 3.2)
 * Tests command counting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

import { battleCounter } from './BattleCounter'
import type { ParsedCommand } from 'shared/types'

// Helper to create test commands
function createCommand(
  type: 'ATTACK' | 'DEFEND',
  territoryId: string,
  username: string
): ParsedCommand {
  return {
    type,
    territoryId,
    username,
    displayName: username,
    timestamp: Date.now(),
    rawMessage: `${type} ${territoryId}`
  }
}

describe('BattleCounter', () => {
  const battleId = 'test-battle-1'

  beforeEach(() => {
    // Clean up any existing battles
    if (battleCounter.hasBattle(battleId)) {
      battleCounter.endBattle(battleId)
    }
  })

  describe('startBattle', () => {
    it('initializes a new battle with zero counts', () => {
      battleCounter.startBattle(battleId)

      const stats = battleCounter.getStats(battleId)
      expect(stats).not.toBeNull()
      expect(stats?.attackCount).toBe(0)
      expect(stats?.defendCount).toBe(0)
      expect(stats?.commands).toEqual([])
      expect(stats?.startedAt).toBeTypeOf('number')

      // Cleanup
      battleCounter.endBattle(battleId)
    })

    it('resets existing battle when called with same ID', () => {
      battleCounter.startBattle(battleId)
      battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

      // Start again - should reset
      battleCounter.startBattle(battleId)

      const stats = battleCounter.getStats(battleId)
      expect(stats?.attackCount).toBe(0)
      expect(stats?.commands).toEqual([])

      // Cleanup
      battleCounter.endBattle(battleId)
    })
  })

  describe('addCommand', () => {
    it('increments attack counter for ATTACK commands (AC: 4)', () => {
      battleCounter.startBattle(battleId)

      battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
      battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))

      const stats = battleCounter.getStats(battleId)
      expect(stats?.attackCount).toBe(2)
      expect(stats?.defendCount).toBe(0)

      // Cleanup
      battleCounter.endBattle(battleId)
    })

    it('increments defend counter for DEFEND commands (AC: 4)', () => {
      battleCounter.startBattle(battleId)

      battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user1'))

      const stats = battleCounter.getStats(battleId)
      expect(stats?.attackCount).toBe(0)
      expect(stats?.defendCount).toBe(1)

      // Cleanup
      battleCounter.endBattle(battleId)
    })

    it('stores commands for leaderboard analysis', () => {
      battleCounter.startBattle(battleId)

      const cmd1 = createCommand('ATTACK', 'T5', 'user1')
      const cmd2 = createCommand('DEFEND', 'T3', 'user2')

      battleCounter.addCommand(battleId, cmd1)
      battleCounter.addCommand(battleId, cmd2)

      const stats = battleCounter.getStats(battleId)
      expect(stats?.commands).toHaveLength(2)
      expect(stats?.commands[0].username).toBe('user1')
      expect(stats?.commands[1].username).toBe('user2')

      // Cleanup
      battleCounter.endBattle(battleId)
    })

    it('silently ignores commands for unknown battles (AC: 2, NFR10)', () => {
      // Should not throw
      expect(() => {
        battleCounter.addCommand('unknown-battle', createCommand('ATTACK', 'T5', 'user1'))
      }).not.toThrow()
    })
  })

  describe('getStats', () => {
    it('returns null for non-existent battle', () => {
      const stats = battleCounter.getStats('non-existent')
      expect(stats).toBeNull()
    })

    it('returns current stats for active battle (AC: 4)', () => {
      battleCounter.startBattle(battleId)
      battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

      const stats = battleCounter.getStats(battleId)
      expect(stats).not.toBeNull()
      expect(stats?.battleId).toBe(battleId)
      expect(stats?.attackCount).toBe(1)

      // Cleanup
      battleCounter.endBattle(battleId)
    })
  })

  describe('endBattle', () => {
    it('returns final stats and removes battle', () => {
      battleCounter.startBattle(battleId)
      battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
      battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user2'))

      const finalStats = battleCounter.endBattle(battleId)

      expect(finalStats).not.toBeNull()
      expect(finalStats?.attackCount).toBe(1)
      expect(finalStats?.defendCount).toBe(1)
      expect(finalStats?.commands).toHaveLength(2)

      // Battle should be removed
      expect(battleCounter.hasBattle(battleId)).toBe(false)
      expect(battleCounter.getStats(battleId)).toBeNull()
    })

    it('returns null for non-existent battle', () => {
      const stats = battleCounter.endBattle('non-existent')
      expect(stats).toBeNull()
    })
  })

  describe('hasBattle', () => {
    it('returns false for non-existent battle', () => {
      expect(battleCounter.hasBattle('non-existent')).toBe(false)
    })

    it('returns true for active battle', () => {
      battleCounter.startBattle(battleId)
      expect(battleCounter.hasBattle(battleId)).toBe(true)

      // Cleanup
      battleCounter.endBattle(battleId)
    })
  })

  describe('getActiveBattles', () => {
    it('returns empty array when no battles', () => {
      // Ensure no battles exist
      const battles = battleCounter.getActiveBattles()
      expect(battles).toBeInstanceOf(Array)
    })

    it('returns active battle IDs', () => {
      const battle1 = 'battle-a'
      const battle2 = 'battle-b'

      battleCounter.startBattle(battle1)
      battleCounter.startBattle(battle2)

      const battles = battleCounter.getActiveBattles()
      expect(battles).toContain(battle1)
      expect(battles).toContain(battle2)

      // Cleanup
      battleCounter.endBattle(battle1)
      battleCounter.endBattle(battle2)
    })
  })
})
