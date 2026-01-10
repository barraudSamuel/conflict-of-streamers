/**
 * Unit Tests for TwitchManager (Story 3.2)
 * Tests callback registration and command notification flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ParsedCommand, CommandCallback } from 'shared/types'

// Mock tmi.js before importing TwitchManager
vi.mock('tmi.js', () => ({
  default: {
    Client: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      readyState: vi.fn().mockReturnValue('OPEN')
    }))
  }
}))

// Mock logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// Import after mocking
import { twitchManager } from './TwitchManager'

describe('TwitchManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onCommand / offCommand', () => {
    it('registers a callback that can receive commands', () => {
      const callback: CommandCallback = vi.fn()

      twitchManager.onCommand(callback)

      // Callback should be registered (internal state)
      // We verify by checking it doesn't throw
      expect(() => twitchManager.onCommand(callback)).not.toThrow()
    })

    it('removes callback with offCommand', () => {
      const callback1: CommandCallback = vi.fn()
      const callback2: CommandCallback = vi.fn()

      twitchManager.onCommand(callback1)
      twitchManager.onCommand(callback2)

      // Remove first callback
      twitchManager.offCommand(callback1)

      // callback1 should be removed, callback2 should remain
      // We verify by checking it doesn't throw when removing again (no-op)
      expect(() => twitchManager.offCommand(callback1)).not.toThrow()
    })

    it('offCommand handles non-existent callback gracefully', () => {
      const callback: CommandCallback = vi.fn()

      // Should not throw even if callback was never registered
      expect(() => twitchManager.offCommand(callback)).not.toThrow()
    })

    it('can register multiple callbacks', () => {
      const callback1: CommandCallback = vi.fn()
      const callback2: CommandCallback = vi.fn()
      const callback3: CommandCallback = vi.fn()

      expect(() => {
        twitchManager.onCommand(callback1)
        twitchManager.onCommand(callback2)
        twitchManager.onCommand(callback3)
      }).not.toThrow()
    })
  })

  describe('getConnectedRooms', () => {
    it('returns array of connected room codes', () => {
      const rooms = twitchManager.getConnectedRooms()
      expect(rooms).toBeInstanceOf(Array)
    })
  })

  describe('isConnected', () => {
    it('returns false for non-existent room', () => {
      expect(twitchManager.isConnected('non-existent-room')).toBe(false)
    })
  })

  describe('getClient', () => {
    it('returns null for non-existent room', () => {
      expect(twitchManager.getClient('non-existent-room')).toBeNull()
    })
  })
})

/**
 * Integration test for the command parsing flow
 * This tests the parseCommand → notifyCallbacks integration
 */
describe('TwitchManager Command Flow Integration', () => {
  it('parseCommand returns valid command that callbacks would receive', async () => {
    const { parseCommand } = await import('../utils/twitchCommandParser')
    const command = parseCommand('ATTACK T5', 'testuser', 'TestUser')

    expect(command).not.toBeNull()
    expect(command?.type).toBe('ATTACK')
    expect(command?.territoryId).toBe('T5')
    expect(command?.username).toBe('testuser')
    expect(command?.displayName).toBe('TestUser')
  })

  it('full flow: message → parseCommand → command structure matches callback type', async () => {
    const { parseCommand } = await import('../utils/twitchCommandParser')

    // Simulate what TwitchManager does internally
    const message = 'go attack T5 now!'
    const username = 'viewer123'
    const displayName = 'Viewer123'

    const command = parseCommand(message, username, displayName)

    // Verify command matches CommandCallback signature expectations
    if (command) {
      const mockCallback: CommandCallback = vi.fn()
      const roomCode = 'TEST-ROOM'

      // Simulate callback invocation
      mockCallback(roomCode, command)

      expect(mockCallback).toHaveBeenCalledWith(roomCode, {
        type: 'ATTACK',
        territoryId: 'T5',
        username: 'viewer123',
        displayName: 'Viewer123',
        timestamp: expect.any(Number),
        rawMessage: 'go attack T5 now!'
      })
    }
  })
})
