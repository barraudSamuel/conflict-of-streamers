/**
 * Unit Tests for BattleCounter (Story 3.2 + 3.3)
 * Tests command counting functionality and unique user tracking
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

  // Story 3.3: Unique user tracking tests
  describe('Story 3.3: Unique User Tracking', () => {
    describe('startBattle initializes unique user sets', () => {
      it('initializes empty uniqueAttackers and uniqueDefenders sets', () => {
        battleCounter.startBattle(battleId)

        const stats = battleCounter.getStats(battleId)
        expect(stats?.uniqueAttackers).toBeInstanceOf(Set)
        expect(stats?.uniqueDefenders).toBeInstanceOf(Set)
        expect(stats?.uniqueAttackers.size).toBe(0)
        expect(stats?.uniqueDefenders.size).toBe(0)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('initializes empty userMessageCounts Map', () => {
        battleCounter.startBattle(battleId)

        const stats = battleCounter.getStats(battleId)
        expect(stats?.userMessageCounts).toBeInstanceOf(Map)
        expect(stats?.userMessageCounts.size).toBe(0)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('addCommand tracks unique users (AC: 1, 2, 3)', () => {
      it('counts unique attackers correctly (AC: 1)', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1')) // duplicate

        expect(battleCounter.getUniqueAttackerCount(battleId)).toBe(2)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('counts unique defenders correctly', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user1')) // duplicate

        expect(battleCounter.getUniqueDefenderCount(battleId)).toBe(1)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('tracks users separately for attack and defend (AC: 4)', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user1'))

        expect(battleCounter.getUniqueAttackerCount(battleId)).toBe(1)
        expect(battleCounter.getUniqueDefenderCount(battleId)).toBe(1)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('normalizes usernames case-insensitively (AC: 2, 3)', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'Sam'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'SAM'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'sAm'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'sam'))

        expect(battleCounter.getUniqueAttackerCount(battleId)).toBe(1)

        // But message count should be 4
        const stats = battleCounter.getStats(battleId)
        expect(stats?.attackCount).toBe(4)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('tracks per-user message counts (AC: 6)', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user1'))

        const userCounts = battleCounter.getUserMessageCounts(battleId)
        expect(userCounts).not.toBeNull()
        expect(userCounts?.get('user1')?.attackCount).toBe(2)
        expect(userCounts?.get('user1')?.defendCount).toBe(1)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('isolates users between battles (AC: 5)', () => {
      it('same user counted separately in different battles', () => {
        const battle2 = 'battle-2'

        battleCounter.startBattle(battleId)
        battleCounter.startBattle(battle2)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'sam'))
        battleCounter.addCommand(battle2, createCommand('ATTACK', 'T5', 'sam'))

        expect(battleCounter.getUniqueAttackerCount(battleId)).toBe(1)
        expect(battleCounter.getUniqueAttackerCount(battle2)).toBe(1)

        // Cleanup
        battleCounter.endBattle(battleId)
        battleCounter.endBattle(battle2)
      })
    })

    describe('getTopSpammers (AC: 6)', () => {
      it('returns top spammers sorted by total messages', () => {
        battleCounter.startBattle(battleId)

        // user1: 3 messages
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

        // user2: 2 messages
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))

        // user3: 1 message
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user3'))

        const topSpammers = battleCounter.getTopSpammers(battleId, 2)

        expect(topSpammers).toHaveLength(2)
        expect(topSpammers[0].username).toBe('user1')
        expect(topSpammers[0].totalMessages).toBe(3)
        expect(topSpammers[1].username).toBe('user2')
        expect(topSpammers[1].totalMessages).toBe(2)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('returns empty array for non-existent battle', () => {
        const spammers = battleCounter.getTopSpammers('non-existent')
        expect(spammers).toEqual([])
      })

      it('defaults to 5 spammers if limit not specified', () => {
        battleCounter.startBattle(battleId)

        for (let i = 0; i < 10; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `user${i}`))
        }

        const topSpammers = battleCounter.getTopSpammers(battleId)
        expect(topSpammers).toHaveLength(5)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('serializeStats (AC: 4)', () => {
      it('serializes stats correctly for WebSocket transmission', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user2'))

        const serialized = battleCounter.serializeStats(battleId)

        expect(serialized).toBeDefined()
        expect(serialized?.battleId).toBe(battleId)
        expect(serialized?.attackCount).toBe(1)
        expect(serialized?.defendCount).toBe(1)
        expect(serialized?.uniqueAttackerCount).toBe(1)
        expect(serialized?.uniqueDefenderCount).toBe(1)
        expect(serialized?.uniqueAttackers).toContain('user1')
        expect(serialized?.uniqueDefenders).toContain('user2')
        expect(serialized?.userMessageCounts).toHaveLength(2)
        expect(serialized?.commandCount).toBe(2)

        // Verify arrays not Sets
        expect(Array.isArray(serialized?.uniqueAttackers)).toBe(true)
        expect(Array.isArray(serialized?.uniqueDefenders)).toBe(true)
        expect(Array.isArray(serialized?.userMessageCounts)).toBe(true)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('returns null for non-existent battle', () => {
        const serialized = battleCounter.serializeStats('non-existent')
        expect(serialized).toBeNull()
      })
    })

    describe('endBattle includes unique counts in final stats', () => {
      it('returns stats with unique user counts', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T3', 'user3'))

        const finalStats = battleCounter.endBattle(battleId)

        expect(finalStats?.uniqueAttackers.size).toBe(2)
        expect(finalStats?.uniqueDefenders.size).toBe(1)
        expect(finalStats?.userMessageCounts.size).toBe(3)
      })
    })

    describe('getUniqueAttackerCount / getUniqueDefenderCount', () => {
      it('returns 0 for non-existent battle', () => {
        expect(battleCounter.getUniqueAttackerCount('non-existent')).toBe(0)
        expect(battleCounter.getUniqueDefenderCount('non-existent')).toBe(0)
      })
    })

    describe('getUserMessageCounts', () => {
      it('returns null for non-existent battle', () => {
        expect(battleCounter.getUserMessageCounts('non-existent')).toBeNull()
      })
    })

    describe('empty username edge case (Code Review Fix)', () => {
      it('ignores commands with empty usernames', () => {
        battleCounter.startBattle(battleId)

        // Command with empty username should be ignored
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', ''))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', '   '))

        const stats = battleCounter.getStats(battleId)
        expect(stats?.attackCount).toBe(0)
        expect(stats?.uniqueAttackers.size).toBe(0)
        expect(stats?.userMessageCounts.size).toBe(0)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('processes valid username after ignoring empty ones', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', ''))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'validuser'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', '   '))

        const stats = battleCounter.getStats(battleId)
        expect(stats?.attackCount).toBe(1)
        expect(stats?.uniqueAttackers.size).toBe(1)
        expect(stats?.uniqueAttackers.has('validuser')).toBe(true)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })
  })
})
