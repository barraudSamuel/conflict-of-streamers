/**
 * Story 4.6: Territory Stats Verification Tests (FR22)
 *
 * Verifies that territory stats follow the inversely proportional rule:
 * - Small territories: LOW attack bonus, HIGH defense bonus
 * - Large territories: HIGH attack bonus, LOW defense bonus
 */

import { describe, it, expect } from 'vitest'
import { TERRITORY_DATA, getInitialTerritories, GRID_SIZE, TOTAL_CELLS } from './territories'

describe('Story 4.6: Territory Stats (FR22)', () => {
  describe('Inversed territorial stats', () => {
    it('Small territories have LOW attack bonus (≈ 0.7)', () => {
      const smallTerritories = TERRITORY_DATA.filter(t => t.size === 'small')
      expect(smallTerritories.length).toBeGreaterThan(0)

      smallTerritories.forEach(t => {
        expect(t.stats?.attackBonus).toBe(0.7)
      })
    })

    it('Small territories have HIGH defense bonus (≈ 2.2)', () => {
      const smallTerritories = TERRITORY_DATA.filter(t => t.size === 'small')

      smallTerritories.forEach(t => {
        expect(t.stats?.defenseBonus).toBe(2.2)
      })
    })

    it('Medium territories have BALANCED bonuses (≈ 1.1)', () => {
      const mediumTerritories = TERRITORY_DATA.filter(t => t.size === 'medium')
      expect(mediumTerritories.length).toBeGreaterThan(0)

      mediumTerritories.forEach(t => {
        expect(t.stats?.attackBonus).toBe(1.1)
        expect(t.stats?.defenseBonus).toBe(1.1)
      })
    })

    it('Large territories have HIGH attack bonus (≈ 2.2)', () => {
      const largeTerritories = TERRITORY_DATA.filter(t => t.size === 'large')
      expect(largeTerritories.length).toBeGreaterThan(0)

      largeTerritories.forEach(t => {
        expect(t.stats?.attackBonus).toBe(2.2)
      })
    })

    it('Large territories have LOW defense bonus (≈ 0.7)', () => {
      const largeTerritories = TERRITORY_DATA.filter(t => t.size === 'large')

      largeTerritories.forEach(t => {
        expect(t.stats?.defenseBonus).toBe(0.7)
      })
    })
  })

  describe('Stats are inversely proportional', () => {
    it('Small attack < medium attack < large attack', () => {
      const smallAttack = TERRITORY_DATA.find(t => t.size === 'small')?.stats?.attackBonus ?? 0
      const mediumAttack = TERRITORY_DATA.find(t => t.size === 'medium')?.stats?.attackBonus ?? 0
      const largeAttack = TERRITORY_DATA.find(t => t.size === 'large')?.stats?.attackBonus ?? 0

      expect(smallAttack).toBeLessThan(mediumAttack)
      expect(mediumAttack).toBeLessThan(largeAttack)
    })

    it('Small defense > medium defense > large defense', () => {
      const smallDefense = TERRITORY_DATA.find(t => t.size === 'small')?.stats?.defenseBonus ?? 0
      const mediumDefense = TERRITORY_DATA.find(t => t.size === 'medium')?.stats?.defenseBonus ?? 0
      const largeDefense = TERRITORY_DATA.find(t => t.size === 'large')?.stats?.defenseBonus ?? 0

      expect(smallDefense).toBeGreaterThan(mediumDefense)
      expect(mediumDefense).toBeGreaterThan(largeDefense)
    })
  })

  describe('Grid coverage', () => {
    it('Grid is 20x20', () => {
      expect(GRID_SIZE).toBe(20)
      expect(TOTAL_CELLS).toBe(400)
    })

    it('All 20 territories exist', () => {
      expect(TERRITORY_DATA.length).toBe(20)
    })

    it('All territories have stats defined', () => {
      TERRITORY_DATA.forEach(t => {
        expect(t.stats).toBeDefined()
        expect(t.stats?.attackBonus).toBeGreaterThan(0)
        expect(t.stats?.defenseBonus).toBeGreaterThan(0)
      })
    })
  })

  describe('getInitialTerritories', () => {
    it('Returns fresh copy with all stats preserved', () => {
      const territories = getInitialTerritories()

      expect(territories.length).toBe(20)
      territories.forEach(t => {
        expect(t.stats).toBeDefined()
        expect(t.ownerId).toBeNull()
        expect(t.isAttacking).toBe(false)
        expect(t.isUnderAttack).toBe(false)
      })
    })

    it('Stats match original data', () => {
      const territories = getInitialTerritories()
      const smallT = territories.find(t => t.size === 'small')

      expect(smallT?.stats?.attackBonus).toBe(0.7)
      expect(smallT?.stats?.defenseBonus).toBe(2.2)
    })
  })
})
