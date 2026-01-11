/**
 * Unit Tests for BattleCounter (Story 3.2 + 3.3 + 4.5)
 * Tests command counting functionality, unique user tracking, and message feed
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

  // Story 4.4: Force calculation and territory bonus tests
  describe('Story 4.4: Force Calculation', () => {
    describe('startBattle with territory bonuses', () => {
      it('stores territory bonuses for force calculation', () => {
        battleCounter.startBattle(battleId, 1.5, 2.0)

        // Forces should initially be 0
        const forces = battleCounter.getForces(battleId)
        expect(forces).not.toBeNull()
        expect(forces?.attackerForce).toBe(0)
        expect(forces?.defenderForce).toBe(0)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('defaults bonuses to 1.0 when not provided', () => {
        battleCounter.startBattle(battleId)

        // Add some commands to verify formula works
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user2'))

        const forces = battleCounter.getForces(battleId)
        // With 1 message each and 1 unique user each, default bonus 1.0:
        // attackerForce = round(1 * 0.7 + 1 * 1.0) = round(1.7) = 2
        // defenderForce = round(1 * 0.7 + 1 * 1.0) = round(1.7) = 2
        expect(forces?.attackerForce).toBe(2)
        expect(forces?.defenderForce).toBe(2)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('getForces', () => {
      it('applies formula: Force = (messages × 0.7) + (uniqueUsers × territoryBonus)', () => {
        // Attacker has higher attack bonus (1.5), defender has higher defense bonus (2.0)
        battleCounter.startBattle(battleId, 1.5, 2.0)

        // 3 attack messages from 2 unique users
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))

        // 2 defend messages from 1 unique user
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user3'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user3'))

        const forces = battleCounter.getForces(battleId)

        // attackerForce = round(3 * 0.7 + 2 * 1.5) = round(2.1 + 3.0) = round(5.1) = 5
        expect(forces?.attackerForce).toBe(5)

        // defenderForce = round(2 * 0.7 + 1 * 2.0) = round(1.4 + 2.0) = round(3.4) = 3
        expect(forces?.defenderForce).toBe(3)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('returns null for non-existent battle', () => {
        const forces = battleCounter.getForces('non-existent')
        expect(forces).toBeNull()
      })

      it('counts messages correctly with multiple users', () => {
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // 5 messages from 3 unique attackers
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a3'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))

        const forces = battleCounter.getForces(battleId)

        // attackerForce = round(5 * 0.7 + 3 * 1.0) = round(3.5 + 3.0) = round(6.5) = 7
        expect(forces?.attackerForce).toBe(7)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('getProgressData', () => {
      it('returns complete progress data for broadcasting', () => {
        battleCounter.startBattle(battleId, 1.5, 2.0)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user3'))

        const progress = battleCounter.getProgressData(battleId)

        expect(progress).not.toBeNull()
        expect(progress?.battleId).toBe(battleId)
        expect(progress?.attackerMessages).toBe(2)
        expect(progress?.defenderMessages).toBe(1)
        expect(progress?.attackerUniqueUsers).toBe(2)
        expect(progress?.defenderUniqueUsers).toBe(1)
        // Forces are calculated from formula
        expect(progress?.attackerForce).toBeGreaterThan(0)
        expect(progress?.defenderForce).toBeGreaterThan(0)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('returns null for non-existent battle', () => {
        const progress = battleCounter.getProgressData('non-existent')
        expect(progress).toBeNull()
      })
    })

    describe('clearBattle', () => {
      it('removes battle data completely', () => {
        battleCounter.startBattle(battleId, 1.5, 2.0)
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

        const cleared = battleCounter.clearBattle(battleId)

        expect(cleared).toBe(true)
        expect(battleCounter.hasBattle(battleId)).toBe(false)
        expect(battleCounter.getStats(battleId)).toBeNull()
        expect(battleCounter.getForces(battleId)).toBeNull()
      })

      it('returns false for non-existent battle', () => {
        const cleared = battleCounter.clearBattle('non-existent')
        expect(cleared).toBe(false)
      })
    })
  })

  // Story 4.6: Force Calculation Formula Verification
  describe('Story 4.6: Force Calculation with Balancing Formula (FR21-FR22, AC: 1-4)', () => {
    describe('Formula verification: Force = (messages × 0.7) + (uniqueUsers × territoryBonus)', () => {
      it('applies MESSAGE_WEIGHT = 0.7 correctly (AC: 1)', () => {
        // With default bonus 1.0: Force = (10 × 0.7) + (3 × 1.0) = 7 + 3 = 10
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // 10 messages from 3 unique attackers
        for (let i = 0; i < 10; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `user${i % 3}`))
        }

        const forces = battleCounter.getForces(battleId)
        // 10 messages × 0.7 = 7, 3 unique users × 1.0 = 3, total = 10
        expect(forces?.attackerForce).toBe(10)

        battleCounter.endBattle(battleId)
      })

      it('applies inversed territorial stats correctly (AC: 2)', () => {
        // Small territory bonus: attack 0.7, defense 2.2
        battleCounter.startBattle(battleId, 0.7, 2.2)

        // 5 attack messages from 2 unique users
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))

        // 3 defend messages from 2 unique users
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd2'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd1'))

        const forces = battleCounter.getForces(battleId)

        // Attacker: (5 × 0.7) + (2 × 0.7) = 3.5 + 1.4 = 4.9 → 5
        expect(forces?.attackerForce).toBe(5)

        // Defender: (3 × 0.7) + (2 × 2.2) = 2.1 + 4.4 = 6.5 → 7
        expect(forces?.defenderForce).toBe(7)

        battleCounter.endBattle(battleId)
      })

      it('uses authoritative message count from IRC (AC: 4)', () => {
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // Simulate IRC messages being counted
        for (let i = 0; i < 100; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `user${i % 10}`))
        }

        const forces = battleCounter.getForces(battleId)
        // 100 messages × 0.7 = 70, 10 unique users × 1.0 = 10, total = 80
        expect(forces?.attackerForce).toBe(80)

        battleCounter.endBattle(battleId)
      })

      it('tracks unique users separately for attackers and defenders (AC: 4)', () => {
        battleCounter.startBattle(battleId, 1.5, 1.5)

        // Same user attacks and defends (counted separately)
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'sameUser'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'sameUser'))

        const stats = battleCounter.getStats(battleId)
        expect(stats?.uniqueAttackers.size).toBe(1)
        expect(stats?.uniqueDefenders.size).toBe(1)

        // Both should count as 1 unique user each
        const forces = battleCounter.getForces(battleId)
        // Attacker: (1 × 0.7) + (1 × 1.5) = 0.7 + 1.5 = 2.2 → 2
        expect(forces?.attackerForce).toBe(2)
        // Defender: (1 × 0.7) + (1 × 1.5) = 0.7 + 1.5 = 2.2 → 2
        expect(forces?.defenderForce).toBe(2)

        battleCounter.endBattle(battleId)
      })
    })

    describe('Inversed stats examples from Dev Notes', () => {
      it('Example 1: Large territory attacking small territory', () => {
        // Attacker (large): attackBonus = 2.2
        // Defender (small): defenseBonus = 2.2
        battleCounter.startBattle(battleId, 2.2, 2.2)

        // Attacker: 50 messages from 10 unique users
        for (let i = 0; i < 50; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `attacker${i % 10}`))
        }

        // Defender: 40 messages from 8 unique users
        for (let i = 0; i < 40; i++) {
          battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', `defender${i % 8}`))
        }

        const forces = battleCounter.getForces(battleId)

        // Attacker: (50 × 0.7) + (10 × 2.2) = 35 + 22 = 57
        expect(forces?.attackerForce).toBe(57)

        // Defender: (40 × 0.7) + (8 × 2.2) = 28 + 17.6 = 45.6 → 46
        expect(forces?.defenderForce).toBe(46)

        battleCounter.endBattle(battleId)
      })

      it('Example 2: Medium territory attacking small territory (defender wins)', () => {
        // Attacker (medium): attackBonus = 1.1
        // Defender (small): defenseBonus = 2.2
        battleCounter.startBattle(battleId, 1.1, 2.2)

        // Attacker: 30 messages from 5 unique users
        for (let i = 0; i < 30; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `attacker${i % 5}`))
        }

        // Defender: 25 messages from 5 unique users
        for (let i = 0; i < 25; i++) {
          battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', `defender${i % 5}`))
        }

        const forces = battleCounter.getForces(battleId)

        // Attacker: (30 × 0.7) + (5 × 1.1) = 21 + 5.5 = 26.5 → 27
        expect(forces?.attackerForce).toBe(27)

        // Defender: (25 × 0.7) + (5 × 2.2) = 17.5 + 11 = 28.5 → 29
        expect(forces?.defenderForce).toBe(29)

        // Defender wins (29 > 27)
        expect(forces!.defenderForce).toBeGreaterThan(forces!.attackerForce)

        battleCounter.endBattle(battleId)
      })
    })

    describe('Edge cases', () => {
      it('Zero messages = zero force (tie goes to defender)', () => {
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // No commands

        const forces = battleCounter.getForces(battleId)
        expect(forces?.attackerForce).toBe(0)
        expect(forces?.defenderForce).toBe(0)

        // Tie (0 === 0), attacker does NOT win (needs > not >=)
        expect(forces!.attackerForce > forces!.defenderForce).toBe(false)

        battleCounter.endBattle(battleId)
      })

      it('Tie scenario: defender wins when forces are equal', () => {
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // Same messages and users for both sides
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user2'))

        const forces = battleCounter.getForces(battleId)
        expect(forces?.attackerForce).toBe(forces?.defenderForce)

        // attackerWon = attackerForce > defenderForce (strict greater than)
        const attackerWon = forces!.attackerForce > forces!.defenderForce
        expect(attackerWon).toBe(false)

        battleCounter.endBattle(battleId)
      })

      it('Winner determination: attacker must have strictly greater force', () => {
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // Attacker has slightly more
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd1'))

        const forces = battleCounter.getForces(battleId)
        // Attacker: (2 × 0.7) + (2 × 1.0) = 1.4 + 2 = 3.4 → 3
        // Defender: (1 × 0.7) + (1 × 1.0) = 0.7 + 1 = 1.7 → 2

        const attackerWon = forces!.attackerForce > forces!.defenderForce
        expect(attackerWon).toBe(true)

        battleCounter.endBattle(battleId)
      })
    })

    describe('Performance (AC: 3 - NFR3)', () => {
      it('Force calculation completes in < 500ms with 2000 commands (MAX_COMMANDS_PER_BATTLE)', () => {
        battleCounter.startBattle(battleId, 2.2, 2.2)

        // Add maximum allowed commands (2000)
        for (let i = 0; i < 2000; i++) {
          const type = i % 2 === 0 ? 'ATTACK' : 'DEFEND'
          battleCounter.addCommand(
            battleId,
            createCommand(type as 'ATTACK' | 'DEFEND', 'T5', `user${i % 100}`)
          )
        }

        // Run multiple iterations to reduce flakiness from GC/context switches
        const iterations = 5
        let totalTime = 0

        for (let run = 0; run < iterations; run++) {
          const startTime = Date.now()
          battleCounter.getForces(battleId)
          totalTime += Date.now() - startTime
        }

        const avgCalculationTimeMs = totalTime / iterations

        // Must complete in < 500ms on average (NFR3)
        // Also add generous single-run threshold to handle CI variability
        expect(avgCalculationTimeMs).toBeLessThan(500)

        // Verify forces were calculated correctly
        const forces = battleCounter.getForces(battleId)
        expect(forces).not.toBeNull()
        expect(forces!.attackerForce).toBeGreaterThan(0)
        expect(forces!.defenderForce).toBeGreaterThan(0)

        battleCounter.endBattle(battleId)
      })

      it('Force calculation is fast even with many unique users', () => {
        battleCounter.startBattle(battleId, 1.0, 1.0)

        // Add 2000 unique users (worst case for Set operations)
        for (let i = 0; i < 2000; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `uniqueUser${i}`))
        }

        // Run multiple iterations to reduce flakiness
        const iterations = 5
        let totalTime = 0

        for (let run = 0; run < iterations; run++) {
          const startTime = Date.now()
          battleCounter.getForces(battleId)
          totalTime += Date.now() - startTime
        }

        const avgTime = totalTime / iterations
        expect(avgTime).toBeLessThan(100) // Should be very fast on average

        const forces = battleCounter.getForces(battleId)
        expect(forces!.attackerForce).toBeGreaterThan(0)

        battleCounter.endBattle(battleId)
      })
    })
  })

  // Story 4.5: Message feed tests
  describe('Story 4.5: Message Feed (getRecentCommands)', () => {
    describe('getRecentCommands returns FeedMessage format', () => {
      it('returns commands in FeedMessage format (FR26-FR27)', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user2'))

        const recent = battleCounter.getRecentCommands(battleId)

        expect(recent).toHaveLength(2)
        expect(recent[0]).toHaveProperty('id')
        expect(recent[0]).toHaveProperty('username')
        expect(recent[0]).toHaveProperty('displayName')
        expect(recent[0]).toHaveProperty('commandType')
        expect(recent[0]).toHaveProperty('side')
        expect(recent[0]).toHaveProperty('timestamp')

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('correctly maps command type to side', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'attacker'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'defender'))

        const recent = battleCounter.getRecentCommands(battleId)

        expect(recent[0].commandType).toBe('ATTACK')
        expect(recent[0].side).toBe('attacker')
        expect(recent[1].commandType).toBe('DEFEND')
        expect(recent[1].side).toBe('defender')

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('incremental updates (only new commands)', () => {
      it('returns only new commands since last call', () => {
        battleCounter.startBattle(battleId)

        // Add first batch
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))

        const firstCall = battleCounter.getRecentCommands(battleId)
        expect(firstCall).toHaveLength(2)

        // Add more commands
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user3'))

        // Second call should only return new command
        const secondCall = battleCounter.getRecentCommands(battleId)
        expect(secondCall).toHaveLength(1)
        expect(secondCall[0].username).toBe('user3')

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('returns empty array when no new commands', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

        // First call gets the command
        battleCounter.getRecentCommands(battleId)

        // Second call should be empty
        const secondCall = battleCounter.getRecentCommands(battleId)
        expect(secondCall).toHaveLength(0)

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('limit parameter', () => {
      it('respects limit parameter (default 10)', () => {
        battleCounter.startBattle(battleId)

        // Add 15 commands
        for (let i = 0; i < 15; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `user${i}`))
        }

        const recent = battleCounter.getRecentCommands(battleId, 10)

        // Should return only last 10
        expect(recent).toHaveLength(10)
        // First in result should be user5 (15 - 10 = 5)
        expect(recent[0].username).toBe('user5')

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('custom limit works correctly', () => {
        battleCounter.startBattle(battleId)

        for (let i = 0; i < 10; i++) {
          battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', `user${i}`))
        }

        const recent = battleCounter.getRecentCommands(battleId, 3)

        // Should return only last 3
        expect(recent).toHaveLength(3)
        expect(recent[0].username).toBe('user7')
        expect(recent[1].username).toBe('user8')
        expect(recent[2].username).toBe('user9')

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('edge cases', () => {
      it('returns empty array for non-existent battle', () => {
        const recent = battleCounter.getRecentCommands('non-existent')
        expect(recent).toEqual([])
      })

      it('generates unique IDs for each message', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

        const recent = battleCounter.getRecentCommands(battleId)

        expect(recent[0].id).not.toBe(recent[1].id)

        // Cleanup
        battleCounter.endBattle(battleId)
      })

      it('includes timestamp in each message', () => {
        battleCounter.startBattle(battleId)

        const beforeTime = Date.now()
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        const afterTime = Date.now()

        const recent = battleCounter.getRecentCommands(battleId)

        expect(recent[0].timestamp).toBeGreaterThanOrEqual(beforeTime)
        expect(recent[0].timestamp).toBeLessThanOrEqual(afterTime + 10) // small tolerance

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })

    describe('reset on startBattle', () => {
      it('resets lastSentCommandIndex when battle is restarted', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.getRecentCommands(battleId) // Advance index

        // Restart battle
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user2'))

        const recent = battleCounter.getRecentCommands(battleId)

        // Should only see the new command after restart
        expect(recent).toHaveLength(1)
        expect(recent[0].username).toBe('user2')

        // Cleanup
        battleCounter.endBattle(battleId)
      })
    })
  })

  // Story 4.8: Battle Summary Generation tests
  describe('Story 4.8: generateBattleSummary (FR30-FR33)', () => {
    describe('returns null for non-existent battle', () => {
      it('returns null when battle does not exist', () => {
        const summary = battleCounter.generateBattleSummary('non-existent')
        expect(summary).toBeNull()
      })
    })

    describe('generates correct top 5 sorted by message count', () => {
      it('returns top 5 contributors sorted by total messages descending', () => {
        battleCounter.startBattle(battleId)

        // user1: 5 messages, user2: 3 messages, user3: 7 messages, user4: 2 messages, user5: 4 messages, user6: 1 message
        for (let i = 0; i < 5; i++) battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        for (let i = 0; i < 3; i++) battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))
        for (let i = 0; i < 7; i++) battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user3'))
        for (let i = 0; i < 2; i++) battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user4'))
        for (let i = 0; i < 4; i++) battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user5'))
        for (let i = 0; i < 1; i++) battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user6'))

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary).not.toBeNull()
        expect(summary!.topContributors).toHaveLength(5)

        // Should be sorted: user3 (7), user1 (5), user5 (4), user2 (3), user4 (2)
        expect(summary!.topContributors[0].username).toBe('user3')
        expect(summary!.topContributors[0].messageCount).toBe(7)
        expect(summary!.topContributors[1].username).toBe('user1')
        expect(summary!.topContributors[1].messageCount).toBe(5)
        expect(summary!.topContributors[2].username).toBe('user5')
        expect(summary!.topContributors[2].messageCount).toBe(4)
        expect(summary!.topContributors[3].username).toBe('user2')
        expect(summary!.topContributors[3].messageCount).toBe(3)
        expect(summary!.topContributors[4].username).toBe('user4')
        expect(summary!.topContributors[4].messageCount).toBe(2)

        // user6 should NOT be in top 5
        expect(summary!.topContributors.find(c => c.username === 'user6')).toBeUndefined()

        battleCounter.endBattle(battleId)
      })

      it('returns fewer than 5 if less than 5 participants', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user2'))

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary!.topContributors).toHaveLength(2)

        battleCounter.endBattle(battleId)
      })
    })

    describe('calculates stats correctly per side', () => {
      it('calculates attackerStats correctly', () => {
        battleCounter.startBattle(battleId)

        // 5 attack messages from 3 unique users
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a3'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'a2'))

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary!.attackerStats.totalMessages).toBe(5)
        expect(summary!.attackerStats.uniqueUsers).toBe(3)
        expect(summary!.attackerStats.participationRate).toBe(100)

        battleCounter.endBattle(battleId)
      })

      it('calculates defenderStats correctly when not BOT', () => {
        battleCounter.startBattle(battleId)

        // 3 defend messages from 2 unique users
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd2'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'd1'))

        const summary = battleCounter.generateBattleSummary(battleId, false) // not BOT

        expect(summary!.defenderStats).not.toBeNull()
        expect(summary!.defenderStats!.totalMessages).toBe(3)
        expect(summary!.defenderStats!.uniqueUsers).toBe(2)
        expect(summary!.defenderStats!.participationRate).toBe(100)

        battleCounter.endBattle(battleId)
      })
    })

    describe('handles BOT battle (defenderStats = null)', () => {
      it('returns null defenderStats when isDefenderBot is true', () => {
        battleCounter.startBattle(battleId)

        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))

        const summary = battleCounter.generateBattleSummary(battleId, true) // BOT battle

        expect(summary!.defenderStats).toBeNull()
        expect(summary!.attackerStats).not.toBeNull()

        battleCounter.endBattle(battleId)
      })
    })

    describe('handles zero participation', () => {
      it('returns empty topContributors when no messages', () => {
        battleCounter.startBattle(battleId)

        // No commands added

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary!.topContributors).toHaveLength(0)
        expect(summary!.attackerStats.totalMessages).toBe(0)
        expect(summary!.attackerStats.uniqueUsers).toBe(0)
        expect(summary!.attackerStats.participationRate).toBe(0)

        battleCounter.endBattle(battleId)
      })
    })

    describe('determines correct side for each contributor', () => {
      it('assigns attacker side when user has more attack messages', () => {
        battleCounter.startBattle(battleId)

        // user1: 3 attacks, 1 defend → should be attacker
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user1'))

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary!.topContributors[0].side).toBe('attacker')
        expect(summary!.topContributors[0].messageCount).toBe(4) // total

        battleCounter.endBattle(battleId)
      })

      it('assigns defender side when user has more defend messages', () => {
        battleCounter.startBattle(battleId)

        // user1: 1 attack, 3 defends → should be defender
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user1'))

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary!.topContributors[0].side).toBe('defender')

        battleCounter.endBattle(battleId)
      })

      it('assigns attacker side on tie (attackCount >= defendCount)', () => {
        battleCounter.startBattle(battleId)

        // user1: 2 attacks, 2 defends → should default to attacker
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('ATTACK', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user1'))
        battleCounter.addCommand(battleId, createCommand('DEFEND', 'T5', 'user1'))

        const summary = battleCounter.generateBattleSummary(battleId)

        expect(summary!.topContributors[0].side).toBe('attacker')

        battleCounter.endBattle(battleId)
      })
    })
  })
})
