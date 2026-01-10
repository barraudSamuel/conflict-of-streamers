/**
 * Unit Tests for Twitch Command Parser (Story 3.2)
 * Tests all acceptance criteria for command parsing
 */

import { describe, it, expect } from 'vitest'
import { parseCommand } from './twitchCommandParser'

describe('parseCommand', () => {
  const defaultUser = 'testuser'
  const defaultDisplayName = 'TestUser'

  describe('ATTACK command parsing (AC: 1, 3, 5)', () => {
    it('parses "ATTACK T5" correctly', () => {
      const result = parseCommand('ATTACK T5', defaultUser, defaultDisplayName)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
      expect(result?.username).toBe(defaultUser)
      expect(result?.displayName).toBe(defaultDisplayName)
      expect(result?.rawMessage).toBe('ATTACK T5')
      expect(result?.timestamp).toBeTypeOf('number')
    })

    it('handles case-insensitive "attack t5" (NFR13)', () => {
      const result = parseCommand('attack t5', defaultUser, defaultDisplayName)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5') // Normalized to uppercase
    })

    it('handles mixed case "Attack T5"', () => {
      const result = parseCommand('Attack T5', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('ATTACK')
    })

    it('handles "ATK T5" abbreviation (AC: 5)', () => {
      const result = parseCommand('ATK T5', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
    })

    it('handles French "ATTAQUE T5" (AC: 5)', () => {
      const result = parseCommand('ATTAQUE T5', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
    })

    it('handles whitespace " ATTACK T5 " (NFR13)', () => {
      const result = parseCommand(' ATTACK T5 ', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
    })

    it('handles partial match "go attack T5 now!" (AC: 5)', () => {
      const result = parseCommand('go attack T5 now!', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
    })

    it('handles emojis around command "🔥 ATTACK T5 🔥"', () => {
      const result = parseCommand('🔥 ATTACK T5 🔥', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
    })
  })

  describe('DEFEND command parsing (AC: 1, 3, 5)', () => {
    it('parses "DEFEND T3" correctly', () => {
      const result = parseCommand('DEFEND T3', defaultUser, defaultDisplayName)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('DEFEND')
      expect(result?.territoryId).toBe('T3')
    })

    it('handles case-insensitive "defend t3" (NFR13)', () => {
      const result = parseCommand('defend t3', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('DEFEND')
      expect(result?.territoryId).toBe('T3')
    })

    it('handles "DEF T3" abbreviation (AC: 5)', () => {
      const result = parseCommand('DEF T3', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('DEFEND')
      expect(result?.territoryId).toBe('T3')
    })

    it('handles "DEFENSE T3" (AC: 5)', () => {
      const result = parseCommand('DEFENSE T3', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('DEFEND')
      expect(result?.territoryId).toBe('T3')
    })

    it('handles British "DEFENCE T3"', () => {
      const result = parseCommand('DEFENCE T3', defaultUser, defaultDisplayName)

      expect(result?.type).toBe('DEFEND')
    })

    it('handles partial match "let\'s defend T3!"', () => {
      const result = parseCommand("let's defend T3!", defaultUser, defaultDisplayName)

      expect(result?.type).toBe('DEFEND')
      expect(result?.territoryId).toBe('T3')
    })
  })

  describe('Invalid command handling (AC: 2, NFR10)', () => {
    it('returns null for invalid command "hello"', () => {
      const result = parseCommand('hello', defaultUser, defaultDisplayName)

      expect(result).toBeNull()
    })

    it('returns null for command without territory "ATTACK"', () => {
      const result = parseCommand('ATTACK', defaultUser, defaultDisplayName)

      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseCommand('', defaultUser, defaultDisplayName)

      expect(result).toBeNull()
    })

    it('returns null for whitespace-only message', () => {
      const result = parseCommand('   ', defaultUser, defaultDisplayName)

      expect(result).toBeNull()
    })

    it('returns null for partial command word "at T5"', () => {
      const result = parseCommand('at T5', defaultUser, defaultDisplayName)

      expect(result).toBeNull()
    })

    it('returns null for random message with numbers', () => {
      const result = parseCommand('hello 123 world', defaultUser, defaultDisplayName)

      expect(result).toBeNull()
    })
  })

  describe('Territory identifier extraction (AC: 3)', () => {
    it('extracts alphanumeric territory ID "Territory1"', () => {
      const result = parseCommand('ATTACK Territory1', defaultUser, defaultDisplayName)

      expect(result?.territoryId).toBe('TERRITORY1') // Uppercase normalized
    })

    it('extracts territory with underscore "zone_a"', () => {
      const result = parseCommand('ATTACK zone_a', defaultUser, defaultDisplayName)

      expect(result?.territoryId).toBe('ZONE_A')
    })

    it('extracts numeric territory "5"', () => {
      const result = parseCommand('ATTACK 5', defaultUser, defaultDisplayName)

      expect(result?.territoryId).toBe('5')
    })

    it('normalizes lowercase territory to uppercase "t5" -> "T5"', () => {
      const result = parseCommand('attack t5', defaultUser, defaultDisplayName)

      expect(result?.territoryId).toBe('T5')
    })
  })

  describe('Multiple commands in one message', () => {
    it('returns first match for "ATTACK T5 DEFEND T3"', () => {
      const result = parseCommand('ATTACK T5 DEFEND T3', defaultUser, defaultDisplayName)

      // Documented behavior: first match wins
      expect(result?.type).toBe('ATTACK')
      expect(result?.territoryId).toBe('T5')
    })
  })

  describe('Edge cases', () => {
    it('handles territory name at max length (20 chars)', () => {
      const result = parseCommand(
        'ATTACK 12345678901234567890', // Exactly 20 chars
        defaultUser,
        defaultDisplayName
      )

      expect(result?.territoryId).toBe('12345678901234567890')
    })

    it('rejects territory name exceeding max length (>20 chars)', () => {
      const result = parseCommand(
        'ATTACK verylongterritoryname123', // 24 chars - too long
        defaultUser,
        defaultDisplayName
      )

      expect(result).toBeNull()
    })

    it('handles username preservation', () => {
      const result = parseCommand('ATTACK T5', 'myuser', 'MyDisplayName')

      expect(result?.username).toBe('myuser')
      expect(result?.displayName).toBe('MyDisplayName')
    })

    it('preserves raw message with original casing', () => {
      const original = '  aTTaCk T5  '
      const result = parseCommand(original, defaultUser, defaultDisplayName)

      expect(result?.rawMessage).toBe(original)
    })
  })
})
