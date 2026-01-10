# Story 3.4: Automatic IRC Reconnection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system (backend)**,
I want **to automatically reconnect to Twitch IRC if the connection drops**,
So that **the game remains functional even with network issues (FR16, NFR9)**.

## Acceptance Criteria

1. **Given** the system is connected to Twitch IRC
   **When** the connection drops unexpectedly
   **Then** the system detects the disconnection within 5 seconds
   **And** the system attempts to reconnect every 10 seconds (NFR9)
   **And** the reconnection attempts are logged via Pino

2. **Given** a reconnection attempt is in progress
   **When** reconnection succeeds
   **Then** the system resumes listening to chat messages
   **And** a success message is logged with connection details
   **And** the reconnection state is reset (attempt counter cleared)

3. **Given** a reconnection attempt fails
   **When** the maximum attempt limit is not reached
   **Then** the system continues retrying every 10 seconds
   **And** each attempt is logged with attempt number

4. **Given** reconnection fails after 3 consecutive attempts
   **When** the system is still retrying
   **Then** the streamer sees a visual indicator that chat integration is temporarily unavailable (via WebSocket event)
   **And** the game continues to function (battles may proceed without viewer input)
   **And** the system CONTINUES retrying every 10 seconds indefinitely

5. **Given** a room's Twitch connection is disconnected
   **When** the room is cleaned up (game ends or all players leave)
   **Then** any pending reconnection timers are cancelled
   **And** no memory leaks occur from orphaned timers

6. **Given** the system tracks connection state
   **When** connection status changes (connecting/connected/disconnected/error)
   **Then** the state is accessible via `getConnectionState(roomCode)`
   **And** clients can be notified of state changes

## Tasks / Subtasks

- [x] Task 1: Add reconnection state tracking (AC: 6)
  - [x] Add `connectionState: Map<string, TwitchConnectionState>` to TwitchManager
  - [x] Create `TwitchConnectionState` interface with: status, lastError, attemptCount, lastAttemptAt
  - [x] Add `getConnectionState(roomCode: string): TwitchConnectionState | null` method
  - [x] Update state on connect/disconnect/error events

- [x] Task 2: Implement reconnection timer mechanism (AC: 1, 3, 5)
  - [x] Add `reconnectionTimers: Map<string, NodeJS.Timeout>` to TwitchManager
  - [x] Create `scheduleReconnect(roomCode: string, channelName: string, attemptNumber: number)` private method
  - [x] Implement 10-second interval between attempts (NFR9)
  - [x] Add `cancelReconnect(roomCode: string)` to cancel pending timers
  - [x] Call cancelReconnect in `disconnect()` method to prevent orphaned timers

- [x] Task 3: Update connect() with reconnection configuration (AC: 2)
  - [x] Modify tmi.js client configuration to NOT use built-in reconnect
  - [x] Keep `reconnect: false` to use our custom reconnection logic
  - [x] Handle 'disconnected' event to trigger manual reconnection
  - [x] Log reconnection success with connection details

- [x] Task 4: Implement reconnection logic in 'disconnected' handler (AC: 1, 2, 3)
  - [x] Update 'disconnected' event handler to start reconnection process
  - [x] Check if room still exists before attempting reconnect
  - [x] Increment attempt counter on each retry
  - [x] Reset attempt counter on successful reconnection
  - [x] Log each attempt with roomCode, channelName, attemptNumber

- [x] Task 5: Add WebSocket notification for connection issues (AC: 4)
  - [x] Create `TWITCH_EVENTS.CONNECTION_STATUS` event type
  - [x] Add `TwitchConnectionStatusEvent` schema to shared types
  - [x] Emit WebSocket event after 3 failed attempts
  - [x] Include status, attemptCount, lastError in event payload
  - [x] Ensure game continues functioning even without Twitch connection

- [x] Task 6: Update disconnect() to cleanup reconnection state (AC: 5)
  - [x] Cancel any pending reconnection timers
  - [x] Remove connection state from Map
  - [x] Log cleanup activity
  - [x] Prevent reconnection attempts for intentionally disconnected rooms

- [x] Task 7: Build verification and testing
  - [x] Run `npm run build:shared` - verify no TypeScript errors
  - [x] Run `npm run build:backend` - verify no TypeScript errors
  - [x] Unit tests for reconnection timer scheduling/cancellation
  - [x] Unit tests for connection state tracking
  - [x] Unit tests for cleanup on intentional disconnect

## Dev Notes

### Critical Architecture Requirements

**FR16 - Maintenir connexion + reconnexion auto:**
- La connexion Twitch IRC doit persister pendant toute la duree du jeu
- En cas de deconnexion, tenter de reconnecter automatiquement
- Le jeu doit continuer meme si Twitch est temporairement indisponible

**NFR9 - Reconnexion IRC toutes les 10 sec:**
- Detection deconnexion rapide (< 5 sec via tmi.js 'disconnected' event)
- Intervalle de reconnexion: 10 secondes
- Tentatives infinies (le jeu peut durer longtemps)
- Notification utilisateur apres 3 echecs consecutifs

**AD-3 - Dual Counting Pattern:**
- Meme si Twitch est deconnecte, le jeu continue
- Les batailles peuvent se derouler sans participation des viewers
- A la reconnexion, les messages sont a nouveau comptes

### tmi.js Reconnection Best Practices

Selon la [documentation tmi.js](https://tmijs.com/) et les [discussions GitHub](https://github.com/tmijs/tmi.js/):

**Configuration native tmi.js (NON UTILISEE - nous implementons notre propre logique):**
```typescript
// tmi.js supporte reconnect: true nativement mais nous preferons
// notre propre logique pour:
// 1. Controler precisement l'intervalle (10 sec vs exponential backoff)
// 2. Envoyer des events WebSocket a nos clients
// 3. Tracker l'etat de connexion par room

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: false // On gere nous-memes
  },
  channels: [channelName]
})
```

**Notre implementation custom:**
```typescript
// Avantages de notre approche:
// - Intervalle fixe de 10 sec (NFR9 requirement)
// - Notification WebSocket aux clients apres 3 echecs
// - Tracking d'etat per-room accessible
// - Cleanup propre quand la room est supprimee
```

### Connection State Type

```typescript
// shared/src/types/twitch.ts - ADD to existing file

export type TwitchConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

export interface TwitchConnectionState {
  status: TwitchConnectionStatus
  channelName: string
  attemptCount: number
  lastAttemptAt: number | null
  lastError: string | null
  connectedAt: number | null
}
```

### WebSocket Event for Connection Status

```typescript
// shared/src/types/events.ts - ADD to existing file

export interface TwitchConnectionStatusEvent {
  status: TwitchConnectionStatus
  channelName: string
  attemptCount: number
  lastError: string | null
  isTemporarilyUnavailable: boolean // true after 3 failed attempts
}

export const TWITCH_EVENTS = {
  ERROR: 'twitch:error',
  CONNECTION_STATUS: 'twitch:connectionStatus' // NEW
} as const
```

### TwitchManager Implementation Updates

```typescript
// backend/src/managers/TwitchManager.ts - MODIFY existing class

import tmi from 'tmi.js'
import { logger } from '../utils/logger'
import { parseCommand } from '../utils/twitchCommandParser'
import type { ParsedCommand, CommandCallback, TwitchConnectionState, TwitchConnectionStatus } from 'shared/types'

// Configuration constants
const RECONNECT_INTERVAL_MS = 10000 // 10 seconds (NFR9)
const NOTIFY_AFTER_ATTEMPTS = 3 // Notify clients after 3 failed attempts

class TwitchManagerClass {
  private clients = new Map<string, tmi.Client>()
  private commandCallbacks: CommandCallback[] = []

  // Story 3.4: Connection state and reconnection management
  private connectionStates = new Map<string, TwitchConnectionState>()
  private reconnectionTimers = new Map<string, NodeJS.Timeout>()
  private channelNames = new Map<string, string>() // roomCode -> channelName

  /**
   * Get connection state for a room
   */
  getConnectionState(roomCode: string): TwitchConnectionState | null {
    return this.connectionStates.get(roomCode) ?? null
  }

  /**
   * Update connection state and optionally notify via callback
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
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(roomCode: string, channelName: string, attemptNumber: number): void {
    // Cancel any existing timer
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

        // Notify clients after 3 failed attempts (only once)
        if (attemptNumber === NOTIFY_AFTER_ATTEMPTS) {
          this.notifyConnectionUnavailable(roomCode)
        }

        // Schedule next attempt (infinite retries)
        this.scheduleReconnect(roomCode, channelName, attemptNumber + 1)
      }
    }, RECONNECT_INTERVAL_MS)

    this.reconnectionTimers.set(roomCode, timer)
  }

  /**
   * Cancel pending reconnection for a room
   */
  private cancelReconnect(roomCode: string): void {
    const timer = this.reconnectionTimers.get(roomCode)
    if (timer) {
      clearTimeout(timer)
      this.reconnectionTimers.delete(roomCode)
      logger.debug({ roomCode }, 'Cancelled pending Twitch reconnection')
    }
  }

  /**
   * Notify clients that Twitch connection is temporarily unavailable
   * This will be called via a callback registered by server.ts
   */
  private connectionStatusCallbacks: Array<(roomCode: string, state: TwitchConnectionState) => void> = []

  onConnectionStatusChange(callback: (roomCode: string, state: TwitchConnectionState) => void): void {
    this.connectionStatusCallbacks.push(callback)
  }

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
  }

  /**
   * Internal connect method that handles both initial connect and reconnect
   */
  private async connectInternal(roomCode: string, channelName: string, attemptNumber: number = 0): Promise<void> {
    // Remove any existing client for this room
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
      channels: [channelName]
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

      // Reset connection state on successful connect
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

      // Only start reconnection if this room should still be connected
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
      if (self) return

      const username = tags.username || 'anonymous'
      const displayName = tags['display-name'] || username

      logger.debug({
        roomCode,
        channel,
        username: displayName,
        message: message.substring(0, 100),
        timestamp: Date.now()
      }, 'Twitch message received')

      const command = parseCommand(message, username, displayName)

      if (command) {
        logger.debug({
          roomCode,
          channel,
          command: command.type,
          territory: command.territoryId,
          username: command.displayName
        }, 'Valid Twitch command parsed')

        this.notifyCommandCallbacks(roomCode, command)
      }
    })

    // Handle tmi.js errors
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
   * Disconnect from a Twitch channel (public API)
   */
  async disconnect(roomCode: string): Promise<void> {
    // Cancel any pending reconnection FIRST
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

  // ... existing methods (onCommand, offCommand, isConnected, getClient, getConnectedRooms)
}
```

### Server Integration for WebSocket Notifications

```typescript
// In server.ts - register callback for connection status changes

import { twitchManager } from './managers/TwitchManager'
import { TWITCH_EVENTS } from 'shared/types'

// Register callback to broadcast connection status to clients
twitchManager.onConnectionStatusChange((roomCode, state) => {
  // Only notify if connection has been unavailable for 3+ attempts
  if (state.attemptCount >= 3) {
    broadcastToRoom(roomCode, TWITCH_EVENTS.CONNECTION_STATUS, {
      status: state.status,
      channelName: state.channelName,
      attemptCount: state.attemptCount,
      lastError: state.lastError,
      isTemporarilyUnavailable: true
    })

    fastify.log.warn({
      roomCode,
      attemptCount: state.attemptCount
    }, 'Twitch connection temporarily unavailable, notified clients')
  }
})
```

### Project Structure Notes

**MODIFY:**
```
shared/src/types/twitch.ts (add TwitchConnectionState, extend TwitchConnectionStatus)
shared/src/types/events.ts (add TwitchConnectionStatusEvent, TWITCH_EVENTS.CONNECTION_STATUS)
shared/src/schemas/events.ts (add TwitchConnectionStatusEventSchema)
shared/src/types/index.ts (export new types)
shared/src/schemas/index.ts (export new schema)
backend/src/managers/TwitchManager.ts (add reconnection logic, state tracking)
backend/src/server.ts (register connection status callback for WebSocket broadcast)
```

**NO NEW FILES - This story modifies existing files only**

### Testing Checklist

**Unit Tests for TwitchManager Reconnection:**
```typescript
describe('TwitchManager reconnection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules reconnection after disconnection', async () => {
    // Mock tmi.js client
    const mockClient = createMockTmiClient()

    await twitchManager.connect('room-1', 'channel')

    // Simulate disconnection
    mockClient.emit('disconnected', 'Connection lost')

    expect(twitchManager.getConnectionState('room-1')?.status).toBe('disconnected')

    // Advance timer by 10 seconds
    vi.advanceTimersByTime(10000)

    // Should have attempted reconnection
    expect(mockClient.connect).toHaveBeenCalledTimes(2) // Initial + reconnect
  })

  it('cancels reconnection on intentional disconnect', async () => {
    const mockClient = createMockTmiClient()

    await twitchManager.connect('room-1', 'channel')
    mockClient.emit('disconnected', 'Connection lost')

    // Disconnect intentionally before reconnection timer fires
    await twitchManager.disconnect('room-1')

    // Advance timer - should NOT attempt reconnection
    vi.advanceTimersByTime(15000)

    expect(mockClient.connect).toHaveBeenCalledTimes(1) // Only initial
  })

  it('tracks attempt count across reconnection failures', async () => {
    const mockClient = createMockTmiClient()
    mockClient.connect.mockRejectedValue(new Error('Failed'))

    await twitchManager.connect('room-1', 'channel').catch(() => {})

    // Simulate multiple failed reconnection attempts
    for (let i = 1; i <= 5; i++) {
      vi.advanceTimersByTime(10000)
      await Promise.resolve() // Let promises resolve
    }

    const state = twitchManager.getConnectionState('room-1')
    expect(state?.attemptCount).toBeGreaterThanOrEqual(3)
  })

  it('notifies callback after 3 failed attempts', async () => {
    const mockCallback = vi.fn()
    twitchManager.onConnectionStatusChange(mockCallback)

    const mockClient = createMockTmiClient()
    mockClient.connect.mockRejectedValue(new Error('Failed'))

    await twitchManager.connect('room-1', 'channel').catch(() => {})

    // Advance through 3 failed attempts
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(10000)
      await Promise.resolve()
    }

    expect(mockCallback).toHaveBeenCalledWith('room-1', expect.objectContaining({
      attemptCount: 3
    }))
  })

  it('resets attempt count on successful reconnection', async () => {
    const mockClient = createMockTmiClient()

    await twitchManager.connect('room-1', 'channel')
    mockClient.emit('disconnected', 'Connection lost')

    // First reconnection fails
    mockClient.connect.mockRejectedValueOnce(new Error('Failed'))
    vi.advanceTimersByTime(10000)
    await Promise.resolve()

    expect(twitchManager.getConnectionState('room-1')?.attemptCount).toBe(1)

    // Second reconnection succeeds
    mockClient.connect.mockResolvedValueOnce(['channel'])
    vi.advanceTimersByTime(10000)
    mockClient.emit('connected', 'irc.chat.twitch.tv', 6697)

    expect(twitchManager.getConnectionState('room-1')?.attemptCount).toBe(0)
    expect(twitchManager.getConnectionState('room-1')?.status).toBe('connected')
  })
})
```

**Manual Testing:** (Requires real Twitch connection - deferred to integration testing)
- [ ] Start game, verify Twitch connection established
- [ ] Simulate network interruption → verify reconnection logs appear
- [ ] Verify 10-second interval between reconnection attempts
- [ ] After 3 failed attempts → verify WebSocket event sent to clients
- [ ] Room cleanup → verify no orphaned timers (check logs)
- [ ] Reconnection success → verify messages are received again

### Edge Cases to Handle

**Room deleted during reconnection:**
- Check `channelNames.has(roomCode)` before attempting reconnect
- If room no longer exists, skip reconnection silently

**Multiple rapid disconnections:**
- Cancel existing timer before scheduling new one
- Prevents timer accumulation

**Connection succeeds during pending reconnect:**
- Cancel timer on 'connected' event
- This can happen if network recovers before timer fires

**Intentional disconnect vs network drop:**
- `disconnect()` method removes from channelNames Map
- 'disconnected' handler checks channelNames before scheduling reconnect

### Performance Considerations

**Timer Management:**
- Using single timer per room (not interval) to avoid timer drift
- Timers properly cleaned up on disconnect
- No timer leaks even with many rooms

**Memory Usage:**
- ConnectionState is small (~100 bytes per room)
- Timers are native Node.js objects (minimal overhead)
- Cleanup on disconnect prevents memory growth

**CPU Usage:**
- Reconnection is async, non-blocking
- 10-second interval prevents CPU thrashing on rapid failures

### Dependencies on Other Stories

**Depends on:**
- Story 3.1: TwitchManager exists with connect/disconnect (DONE)
- Story 3.2: Command parsing and callbacks (DONE)
- Story 3.3: Unique user tracking (DONE)

**Provides to:**
- Story 4.4: Stable Twitch connection for dual counting system
- All game functionality: Reliable chat integration during battles

### Previous Story Learnings (3-1, 3-2, 3-3)

**From Story 3.1:**
- TwitchManager singleton pattern established
- Pino logging with structured context
- 'error' event needs type assertion due to @types/tmi.js limitation

**From Story 3.2:**
- Callback pattern for command notifications works well
- BattleCounter integration via callbacks
- Vitest is configured and working

**From Story 3.3:**
- State tracking patterns (Maps for per-room data)
- Cleanup is critical to prevent memory leaks
- Export types from shared/types/index.ts

**Code Review Patterns to Apply:**
- Always log with roomCode context
- Cancel timers before setting new ones
- Check room existence before async operations
- Comprehensive error handling in callbacks

### References

- [FR16] Maintenir connexion + reconnexion auto - epics.md#Epic-3
- [NFR9] Reconnexion IRC toutes les 10 sec si echec - architecture.md#NFR9
- [AD-3] Dual Counting for Twitch Delay Compensation - architecture.md#AD-3
- [tmi.js Documentation](https://tmijs.com/) - Official tmi.js docs
- [tmi.js GitHub](https://github.com/tmijs/tmi.js/) - Source and issues
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.4]
- [Source: _bmad-output/project-context.md]
- [Source: backend/src/managers/TwitchManager.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build shared: SUCCESS
- Build backend: SUCCESS
- Tests: 87 passed (4 test files)

### Completion Notes List

- Implemented complete reconnection logic with 10-second intervals (NFR9)
- Added TwitchConnectionState interface for per-room state tracking
- Created connectionStatusCallbacks for WebSocket notification integration
- All existing tests pass (83 original + 4 new Story 3.4 tests = 87 total)
- Server integration callback ready for broadcast (server.ts update deferred to future story)

### Change Log

- 2026-01-10: Story created with comprehensive implementation context
- 2026-01-10: Implementation complete - all 7 tasks done
- 2026-01-10: Code review fixes - Added server.ts integration, updated JSDoc comments

### File List

**Modified:**
- `shared/src/types/twitch.ts` - Added TwitchConnectionState interface, extended TwitchConnectionStatus
- `shared/src/types/events.ts` - Added TwitchConnectionStatusEvent type, TWITCH_EVENTS.CONNECTION_STATUS
- `shared/src/types/index.ts` - Exported new types
- `shared/src/schemas/events.ts` - Added TwitchConnectionStatusEventSchema
- `shared/src/schemas/index.ts` - Exported new schema
- `backend/src/managers/TwitchManager.ts` - Complete reconnection logic implementation
- `backend/src/managers/TwitchManager.test.ts` - Added Story 3.4 unit tests
- `backend/src/server.ts` - Registered onConnectionStatusChange callback for WebSocket broadcast

