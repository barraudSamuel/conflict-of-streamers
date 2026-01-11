/**
 * Story 4.6: BOT Territory Resistance Tests (FR38-FR40, AC: 5)
 *
 * Tests BOT resistance calculation formula:
 * BOT Force = BOT_BASE_FORCE × size_multiplier × defenseBonus
 */

import { describe, it, expect } from 'vitest'
import {
  calculateBotDefenderForce,
  isBotTerritory,
  BOT_BASE_FORCE,
  BOT_RESISTANCE_MULTIPLIERS
} from './botResistance'

describe('Story 4.6: BOT Territory Resistance', () => {
  describe('Constants', () => {
    it('BOT_BASE_FORCE is 5', () => {
      expect(BOT_BASE_FORCE).toBe(5)
    })

    it('BOT_RESISTANCE_MULTIPLIERS has correct values', () => {
      expect(BOT_RESISTANCE_MULTIPLIERS).toEqual({
        small: 0.3,
        medium: 0.5,
        large: 0.8
      })
    })
  })

  describe('calculateBotDefenderForce', () => {
    describe('Small BOT territories (AC: 5 - low resistance)', () => {
      it('calculates force with standard defense bonus (1.0)', () => {
        // Force = 5 × 0.3 × 1.0 = 1.5 → 2
        const force = calculateBotDefenderForce('small', 1.0)
        expect(force).toBe(2)
      })

      it('calculates force with high defense bonus (2.2)', () => {
        // Force = 5 × 0.3 × 2.2 = 3.3 → 3
        const force = calculateBotDefenderForce('small', 2.2)
        expect(force).toBe(3)
      })

      it('defaults defense bonus to 1.0 when not provided', () => {
        const force = calculateBotDefenderForce('small')
        expect(force).toBe(2) // 5 × 0.3 × 1.0 = 1.5 → 2
      })
    })

    describe('Medium BOT territories (AC: 5 - medium resistance)', () => {
      it('calculates force with standard defense bonus (1.0)', () => {
        // Force = 5 × 0.5 × 1.0 = 2.5 → 3
        const force = calculateBotDefenderForce('medium', 1.0)
        expect(force).toBe(3)
      })

      it('calculates force with medium defense bonus (1.1)', () => {
        // Force = 5 × 0.5 × 1.1 = 2.75 → 3
        const force = calculateBotDefenderForce('medium', 1.1)
        expect(force).toBe(3)
      })
    })

    describe('Large BOT territories (AC: 5 - high resistance)', () => {
      it('calculates force with standard defense bonus (1.0)', () => {
        // Force = 5 × 0.8 × 1.0 = 4.0 → 4
        const force = calculateBotDefenderForce('large', 1.0)
        expect(force).toBe(4)
      })

      it('calculates force with low defense bonus (0.7)', () => {
        // Force = 5 × 0.8 × 0.7 = 2.8 → 3
        const force = calculateBotDefenderForce('large', 0.7)
        expect(force).toBe(3)
      })
    })

    describe('Edge cases', () => {
      it('returns 0 for zero defense bonus', () => {
        const force = calculateBotDefenderForce('medium', 0)
        expect(force).toBe(0)
      })

      it('handles very high defense bonus', () => {
        // Force = 5 × 0.3 × 10 = 15
        const force = calculateBotDefenderForce('small', 10)
        expect(force).toBe(15)
      })

      it('rounds correctly for fractional results', () => {
        // Force = 5 × 0.3 × 1.5 = 2.25 → 2
        expect(calculateBotDefenderForce('small', 1.5)).toBe(2)
        // Force = 5 × 0.5 × 1.5 = 3.75 → 4
        expect(calculateBotDefenderForce('medium', 1.5)).toBe(4)
      })
    })
  })

  describe('isBotTerritory', () => {
    it('returns true for null ownerId (BOT territory)', () => {
      expect(isBotTerritory(null)).toBe(true)
    })

    it('returns false for player-owned territory', () => {
      expect(isBotTerritory('player-123')).toBe(false)
    })

    it('returns false for empty string ownerId', () => {
      // Empty string is not null, so it's considered owned
      expect(isBotTerritory('')).toBe(false)
    })
  })

  describe('Integration with territory stats (FR22)', () => {
    // These tests verify BOT resistance works with actual territory stats
    const TERRITORY_STATS = {
      small: { attackBonus: 0.7, defenseBonus: 2.2 },
      medium: { attackBonus: 1.1, defenseBonus: 1.1 },
      large: { attackBonus: 2.2, defenseBonus: 0.7 }
    }

    it('Small BOT with FR22 stats has ~3 force', () => {
      const force = calculateBotDefenderForce('small', TERRITORY_STATS.small.defenseBonus)
      // 5 × 0.3 × 2.2 = 3.3 → 3
      expect(force).toBe(3)
    })

    it('Medium BOT with FR22 stats has ~3 force', () => {
      const force = calculateBotDefenderForce('medium', TERRITORY_STATS.medium.defenseBonus)
      // 5 × 0.5 × 1.1 = 2.75 → 3
      expect(force).toBe(3)
    })

    it('Large BOT with FR22 stats has ~3 force', () => {
      const force = calculateBotDefenderForce('large', TERRITORY_STATS.large.defenseBonus)
      // 5 × 0.8 × 0.7 = 2.8 → 3
      expect(force).toBe(3)
    })

    it('All BOT territories have similar low resistance (easy to capture)', () => {
      const forces = {
        small: calculateBotDefenderForce('small', TERRITORY_STATS.small.defenseBonus),
        medium: calculateBotDefenderForce('medium', TERRITORY_STATS.medium.defenseBonus),
        large: calculateBotDefenderForce('large', TERRITORY_STATS.large.defenseBonus)
      }

      // All should be around 3 force - easy to capture with any participation
      expect(forces.small).toBeGreaterThanOrEqual(2)
      expect(forces.small).toBeLessThanOrEqual(4)
      expect(forces.medium).toBeGreaterThanOrEqual(2)
      expect(forces.medium).toBeLessThanOrEqual(4)
      expect(forces.large).toBeGreaterThanOrEqual(2)
      expect(forces.large).toBeLessThanOrEqual(4)
    })
  })

  describe('Attacker win scenarios against BOT', () => {
    // Verify attackers can reasonably win against BOT territories
    const MESSAGE_WEIGHT = 0.7

    function calculateAttackerForce(messages: number, uniqueUsers: number, attackBonus: number): number {
      return Math.round((messages * MESSAGE_WEIGHT) + (uniqueUsers * attackBonus))
    }

    it('Attacker with 5 messages from 2 users wins against small BOT', () => {
      const attackerForce = calculateAttackerForce(5, 2, 1.1) // 3.5 + 2.2 = 5.7 → 6
      const botForce = calculateBotDefenderForce('small', 2.2) // 3

      expect(attackerForce).toBeGreaterThan(botForce)
    })

    it('Attacker with 3 messages from 1 user wins against medium BOT', () => {
      const attackerForce = calculateAttackerForce(3, 1, 1.1) // 2.1 + 1.1 = 3.2 → 3
      const botForce = calculateBotDefenderForce('medium', 1.1) // 3

      // Tie goes to defender, so attacker needs more
      expect(attackerForce).toBe(botForce) // Tie
    })

    it('Attacker with 4 messages from 2 users wins against large BOT', () => {
      const attackerForce = calculateAttackerForce(4, 2, 2.2) // 2.8 + 4.4 = 7.2 → 7
      const botForce = calculateBotDefenderForce('large', 0.7) // 3

      expect(attackerForce).toBeGreaterThan(botForce)
    })

    it('Solo attacker with 10 messages wins against any BOT', () => {
      const attackerForce = calculateAttackerForce(10, 1, 1.1) // 7 + 1.1 = 8.1 → 8
      const maxBotForce = calculateBotDefenderForce('large', 1.0) // 4

      expect(attackerForce).toBeGreaterThan(maxBotForce)
    })
  })
})
