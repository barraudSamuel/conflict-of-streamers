/**
 * TwitchManager - Twitch IRC connection management via tmi.js
 * Handles anonymous mode connections to Twitch chat channels per room
 *
 * Story 3.1: Basic connection
 * Story 3.2: Command parsing and callbacks
 * Story 3.4: Automatic reconnection with state tracking
 */

import tmi from 'tmi.js'
import { logger } from '../utils/logger'
import { parseCommand } from '../utils/twitchCommandParser'
import type { ParsedCommand, CommandCallback, TwitchConnectionState, TwitchConnectionStatus } from 'shared/types'

// Story 3.4: Configuration constants

/** Reconnection interval in milliseconds - 10 seconds per NFR9 requirement */
const RECONNECT_INTERVAL_MS = 10000

/**
 * Number of failed attempts before notifying clients (AC #4)
 * After this many failures, clients receive a WebSocket event indicating
 * Twitch chat integration is temporarily unavailable
 */
const NOTIFY_AFTER_ATTEMPTS = 3

/** Callback type for connection status change notifications */
type ConnectionStatusCallback = (roomCode: string, state: TwitchConnectionState) => void

class TwitchManagerClass {
  private clients = new Map<string, tmi.Client>()
  private commandCallbacks: CommandCallback[] = []

  // Story 3.4: Connection state and reconnection management
  private connectionStates = new Map<string, TwitchConnectionState>()
  private reconnectionTimers = new Map<string, NodeJS.Timeout>()
  private channelNames = new Map<string, string>() // roomCode -> channelName
  private connectionStatusCallbacks: ConnectionStatusCallback[] = []

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

  // =====================
  // Story 3.4: Connection State Management
  // =====================

  /**
   * Get connection state for a room (AC: 6)
   * @param roomCode - The game room code
   */
  getConnectionState(roomCode: string): TwitchConnectionState | null {
    return this.connectionStates.get(roomCode) ?? null
  }

  /**
   * Register callback for connection status changes (AC: 4, 6)
   * Used by server.ts to broadcast WebSocket events
   * @param callback - Function to call when connection status changes
   */
  onConnectionStatusChange(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks.push(callback)
  }

  /**
   * Remove a connection status callback
   * @param callback - Function to remove from callbacks
   */
  offConnectionStatusChange(callback: ConnectionStatusCallback): void {
    const index = this.connectionStatusCallbacks.indexOf(callback)
    if (index > -1) {
      this.connectionStatusCallbacks.splice(index, 1)
    }
  }

  /**
   * Update connection state and log the change
   * @param roomCode - The game room code
   * @param status - New connection status
   * @param updates - Partial state updates
   */
  private updateConnectionState(
    roomCode: string,
    status: TwitchConnectionStatus,
    updates: Partial<TwitchConnectionState> = {}
  ): void {
    const currentState = this.connectionStates.get(roomCode)
    const channelName = this.channelNames.get(roomCode) || currentState?.channelName || 'unknown'

    const newState: TwitchConnectionState = {
      status,
      channelName,
      attemptCount: currentState?.attemptCount ?? 0,
      lastAttemptAt: currentState?.lastAttemptAt ?? null,
      lastError: currentState?.lastError ?? null,
      connectedAt: currentState?.connectedAt ?? null,
      ...updates
    }

    this.connectionStates.set(roomCode, newState)

    logger.debug({
      roomCode,
      status,
      attemptCount: newState.attemptCount,
      channelName
    }, 'Twitch connection state updated')
  }

  /**
   * Notify clients that Twitch connection is temporarily unavailable (AC: 4)
   * Called after NOTIFY_AFTER_ATTEMPTS failed attempts
   * @param roomCode - The game room code
   */
  private notifyConnectionUnavailable(roomCode: string): void {
    const state = this.connectionStates.get(roomCode)
    if (!state) return

    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(roomCode, state)
      } catch (error) {
        logger.error({ err: error, roomCode }, 'Connection status callback error')
      }
    })

    logger.warn({
      roomCode,
      channelName: state.channelName,
      attemptCount: state.attemptCount
    }, 'Twitch connection temporarily unavailable, notified clients')
  }

  // =====================
  // Story 3.4: Reconnection Timer Management
  // =====================

  /**
   * Schedule a reconnection attempt (AC: 1, 3)
   * Uses setTimeout for precise 10-second intervals
   * @param roomCode - The game room code
   * @param channelName - The Twitch channel name
   * @param attemptNumber - Current attempt number
   */
  private scheduleReconnect(roomCode: string, channelName: string, attemptNumber: number): void {
    // Cancel any existing timer to prevent accumulation
    this.cancelReconnect(roomCode)

    logger.info({
      roomCode,
      channelName,
      attemptNumber,
      nextAttemptIn: RECONNECT_INTERVAL_MS / 1000
    }, 'Scheduling Twitch IRC reconnection')

    const timer = setTimeout(async () => {
      // Check if room still exists (might have been cleaned up)
      if (!this.channelNames.has(roomCode)) {
        logger.debug({ roomCode }, 'Room no longer exists, skipping reconnection')
        return
      }

      this.updateConnectionState(roomCode, 'reconnecting', {
        attemptCount: attemptNumber,
        lastAttemptAt: Date.now()
      })

      try {
        await this.connectInternal(roomCode, channelName, attemptNumber)
        // Success - state will be updated by 'connected' event handler
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        logger.warn({
          roomCode,
          channelName,
          attemptNumber,
          err: error
        }, 'Twitch IRC reconnection attempt failed')

        this.updateConnectionState(roomCode, 'disconnected', {
          lastError: errorMessage,
          attemptCount: attemptNumber
        })

        // Notify clients after 3 failed attempts (only on the 3rd attempt)
        if (attemptNumber === NOTIFY_AFTER_ATTEMPTS) {
          this.notifyConnectionUnavailable(roomCode)
        }

        // Schedule next attempt (infinite retries per NFR9)
        this.scheduleReconnect(roomCode, channelName, attemptNumber + 1)
      }
    }, RECONNECT_INTERVAL_MS)

    this.reconnectionTimers.set(roomCode, timer)
  }

  /**
   * Cancel pending reconnection for a room (AC: 5)
   * Prevents orphaned timers and memory leaks
   * @param roomCode - The game room code
   */
  private cancelReconnect(roomCode: string): void {
    const timer = this.reconnectionTimers.get(roomCode)
    if (timer) {
      clearTimeout(timer)
      this.reconnectionTimers.delete(roomCode)
      logger.debug({ roomCode }, 'Cancelled pending Twitch reconnection')
    }
  }

  // =====================
  // Connection Methods
  // =====================

  /**
   * Internal connect method that handles both initial connect and reconnect
   * @param roomCode - The game room code
   * @param channelName - The Twitch channel name
   * @param attemptNumber - Current attempt number (0 for initial)
   */
  private async connectInternal(roomCode: string, channelName: string, attemptNumber: number = 0): Promise<void> {
    // Remove any existing client for this room (for reconnection)
    const existingClient = this.clients.get(roomCode)
    if (existingClient) {
      try {
        await existingClient.disconnect()
      } catch {
        // Ignore disconnect errors during reconnection
      }
      this.clients.delete(roomCode)
    }

    const client = new tmi.Client({
      connection: {
        secure: true,
        reconnect: false // We handle reconnection manually (NFR9: 10 sec interval)
      },
      channels: [channelName] // Channel without # prefix
    })

    // Event handlers
    client.on('connected', (addr, port) => {
      logger.info({
        roomCode,
        channelName,
        addr,
        port,
        wasReconnect: attemptNumber > 0,
        attemptNumber
      }, 'Connected to Twitch IRC')

      // Reset connection state on successful connect (AC: 2)
      this.updateConnectionState(roomCode, 'connected', {
        attemptCount: 0,
        lastError: null,
        connectedAt: Date.now()
      })

      // Cancel any pending reconnection timer
      this.cancelReconnect(roomCode)
    })

    client.on('disconnected', (reason) => {
      logger.warn({ roomCode, channelName, reason }, 'Disconnected from Twitch IRC')

      // Only start reconnection if this room should still be connected (AC: 1)
      if (this.channelNames.has(roomCode)) {
        const currentState = this.connectionStates.get(roomCode)
        const nextAttempt = (currentState?.attemptCount ?? 0) + 1

        this.updateConnectionState(roomCode, 'disconnected', {
          lastError: reason || 'Connection lost',
          attemptCount: nextAttempt - 1
        })

        // Start reconnection process
        this.scheduleReconnect(roomCode, channelName, nextAttempt)
      }
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
        this.updateConnectionState(roomCode, 'error', {
          lastError: error.message
        })
      })

    // Update state to connecting
    this.updateConnectionState(roomCode, 'connecting', {
      attemptCount: attemptNumber
    })

    try {
      await client.connect()
      this.clients.set(roomCode, client)
    } catch (error) {
      this.updateConnectionState(roomCode, 'error', {
        lastError: error instanceof Error ? error.message : 'Connection failed'
      })
      throw error
    }
  }

  /**
   * Connect to a Twitch channel in anonymous mode (public API)
   * @param roomCode - The game room code
   * @param channelName - The Twitch channel name (without #)
   */
  async connect(roomCode: string, channelName: string): Promise<void> {
    // Prevent duplicate connections
    if (this.clients.has(roomCode)) {
      logger.warn({ roomCode, channelName }, 'Twitch client already exists for room')
      return
    }

    // Store channel name for reconnection
    this.channelNames.set(roomCode, channelName)

    // Initialize connection state
    this.updateConnectionState(roomCode, 'connecting', {
      channelName,
      attemptCount: 0,
      lastAttemptAt: null,
      lastError: null,
      connectedAt: null
    })

    await this.connectInternal(roomCode, channelName, 0)
  }

  /**
   * Disconnect from a Twitch channel (public API) (AC: 5, 6)
   * Properly cleans up all resources to prevent memory leaks
   * @param roomCode - The game room code
   */
  async disconnect(roomCode: string): Promise<void> {
    // Cancel any pending reconnection FIRST to prevent orphaned timers
    this.cancelReconnect(roomCode)

    // Remove from channel names to prevent reconnection attempts
    this.channelNames.delete(roomCode)

    // Disconnect client
    const client = this.clients.get(roomCode)
    if (client) {
      try {
        await client.disconnect()
      } catch (error) {
        logger.warn({ roomCode, err: error }, 'Error disconnecting Twitch client')
      } finally {
        this.clients.delete(roomCode)
      }
    }

    // Cleanup connection state
    this.connectionStates.delete(roomCode)

    logger.info({ roomCode }, 'Twitch client removed and cleanup complete')
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
