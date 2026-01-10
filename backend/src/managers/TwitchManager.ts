/**
 * TwitchManager - Twitch IRC connection management via tmi.js
 * Handles anonymous mode connections to Twitch chat channels per room
 *
 * Story 3.1: Basic connection
 * Story 3.2: Command parsing and callbacks
 */

import tmi from 'tmi.js'
import { logger } from '../utils/logger'
import { parseCommand } from '../utils/twitchCommandParser'
import type { ParsedCommand, CommandCallback } from 'shared/types'

class TwitchManagerClass {
  private clients = new Map<string, tmi.Client>()
  private commandCallbacks: CommandCallback[] = []

  /**
   * Register callback for parsed commands (Story 3.2)
   * Used by Story 3.3 (unique users) and Story 4.4 (dual counting)
   * @param callback - Function to call when valid command is parsed
   */
  onCommand(callback: CommandCallback): void {
    this.commandCallbacks.push(callback)
  }

  /**
   * Remove a command callback
   * @param callback - Function to remove from callbacks
   */
  offCommand(callback: CommandCallback): void {
    const index = this.commandCallbacks.indexOf(callback)
    if (index > -1) {
      this.commandCallbacks.splice(index, 1)
    }
  }

  /**
   * Notify all registered callbacks of a parsed command
   * @param roomCode - Room the command came from
   * @param command - Parsed command to broadcast
   */
  private notifyCommandCallbacks(roomCode: string, command: ParsedCommand): void {
    this.commandCallbacks.forEach(callback => {
      try {
        callback(roomCode, command)
      } catch (error) {
        logger.error({ err: error, roomCode }, 'Command callback error')
      }
    })
  }

  /**
   * Connect to a Twitch channel in anonymous mode
   * @param roomCode - The game room code
   * @param channelName - The Twitch channel name (without #)
   */
  async connect(roomCode: string, channelName: string): Promise<void> {
    // Prevent duplicate connections
    if (this.clients.has(roomCode)) {
      logger.warn({ roomCode, channelName }, 'Twitch client already exists for room')
      return
    }

    const client = new tmi.Client({
      connection: {
        secure: true,
        reconnect: false // Manual reconnect in Story 3.4
      },
      channels: [channelName] // Channel without # prefix
    })

    // Event handlers
    client.on('connected', (addr, port) => {
      logger.info({ roomCode, channelName, addr, port }, 'Connected to Twitch IRC')
    })

    client.on('disconnected', (reason) => {
      logger.warn({ roomCode, channelName, reason }, 'Disconnected from Twitch IRC')
      // Reconnection logic in Story 3.4
    })

    client.on('message', (channel, tags, message, self) => {
      if (self) return // Ignore own messages (shouldn't happen in anonymous)

      const username = tags.username || 'anonymous'
      const displayName = tags['display-name'] || username

      logger.debug({
        roomCode,
        channel,
        username: displayName,
        message: message.substring(0, 100), // Truncate for logging
        timestamp: Date.now()
      }, 'Twitch message received')

      // Story 3.2: Parse command from message
      const command = parseCommand(message, username, displayName)

      if (command) {
        logger.debug({
          roomCode,
          channel,
          command: command.type,
          territory: command.territoryId,
          username: command.displayName
        }, 'Valid Twitch command parsed')

        // Notify all registered callbacks
        this.notifyCommandCallbacks(roomCode, command)
      }
      // Invalid commands are silently ignored (NFR10)
    })

    // Handle tmi.js errors (use type assertion for untyped 'error' event)
    // tmi.js emits 'error' events but @types/tmi.js doesn't type them
    ;(client as unknown as { on(event: 'error', listener: (err: Error) => void): void })
      .on('error', (error) => {
        logger.error({ roomCode, channelName, err: error }, 'Twitch client error')
      })

    try {
      await client.connect()
      this.clients.set(roomCode, client)
    } catch (error) {
      logger.error({ roomCode, channelName, err: error }, 'Failed to connect to Twitch IRC')
      throw error
    }
  }

  /**
   * Disconnect from a Twitch channel
   * @param roomCode - The game room code
   */
  async disconnect(roomCode: string): Promise<void> {
    const client = this.clients.get(roomCode)
    if (!client) return

    try {
      await client.disconnect()
    } catch (error) {
      logger.warn({ roomCode, err: error }, 'Error disconnecting Twitch client')
    } finally {
      this.clients.delete(roomCode)
      logger.info({ roomCode }, 'Twitch client removed')
    }
  }

  /**
   * Check if a room is connected to Twitch IRC
   * @param roomCode - The game room code
   */
  isConnected(roomCode: string): boolean {
    const client = this.clients.get(roomCode)
    return client?.readyState() === 'OPEN'
  }

  /**
   * Get the tmi.js client for a room (for Story 3.2 message processing)
   * @param roomCode - The game room code
   */
  getClient(roomCode: string): tmi.Client | null {
    return this.clients.get(roomCode) ?? null
  }

  /**
   * Get all connected rooms (for debugging/status)
   */
  getConnectedRooms(): string[] {
    return Array.from(this.clients.keys())
  }
}

// Export singleton instance
export const twitchManager = new TwitchManagerClass()
