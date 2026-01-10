# Story 2.3: Real-Time Lobby Synchronization

Status: done

## Story

As a **streamer in the lobby**,
I want **to see other players join in real-time with their Twitch avatars**,
So that **I know who is participating before the game starts (FR7)**.

## Acceptance Criteria

1. **Given** I am in a game lobby (as creator OR joiner)
   **When** another player joins the game
   **Then** I see their Twitch avatar and username appear in the lobby immediately via WebSocket
   **And** the player list updates in real-time without page refresh (FR7, NFR1 < 200ms)

2. **Given** I am in a game lobby
   **When** a player leaves the lobby
   **Then** their avatar disappears from the lobby in real-time
   **And** all connected clients see the update simultaneously

3. **Given** I am in a game lobby
   **When** the WebSocket connection is established
   **Then** the connection maintains latency < 200ms (NFR1)
   **And** the connection state is visually indicated to the user

4. **Given** I am in a game lobby
   **When** my WebSocket connection drops
   **Then** the system attempts automatic reconnection with exponential backoff
   **And** I see a visual indicator that reconnection is in progress
   **And** I am resynchronized with current lobby state when reconnected

5. **Given** I am the room creator
   **When** I create the room via REST and enter the lobby
   **Then** I automatically connect to WebSocket and join the lobby channel
   **And** my player list shows myself

6. **Given** I join an existing room via REST
   **When** my WebSocket connection is established
   **Then** I receive the current lobby state with all players
   **And** I appear in other players' lobby views

7. **Given** my WebSocket lobby:join validation fails
   **When** the server responds with an error event
   **Then** I see an error message and am redirected to the appropriate page

## Tasks / Subtasks

- [x] Task 1: Create WebSocket event types AND schemas in shared package (AC: 1, 2)
  - [x] Create `shared/src/types/events.ts` with event interfaces
  - [x] Create `shared/src/schemas/events.ts` with Zod schemas for validation
  - [x] Define `LobbyJoinEventSchema` (roomCode, playerId)
  - [x] Define `LobbyLeaveEventSchema` (empty object)
  - [x] Define `LobbySyncEventSchema` (players array, config)
  - [x] Define `LobbyPlayerJoinedEventSchema` (full PlayerInRoom data)
  - [x] Define `LobbyPlayerLeftEventSchema` (playerId, reason)
  - [x] Export types via `shared/src/types/index.ts`
  - [x] Export schemas via `shared/src/schemas/index.ts`

- [x] Task 2: Implement WebSocket connection manager on backend (AC: 3, 4)
  - [x] Create `backend/src/websocket/ConnectionManager.ts`
  - [x] Import correct WebSocket type from `ws` package
  - [x] Store socket-to-player mapping (connectionId -> { socket, roomCode, playerId })
  - [x] Store room-to-connections mapping (roomCode -> Set<connectionId>)
  - [x] Implement `addConnection(connectionId, socket, roomCode, playerId)`
  - [x] Implement `removeConnection(connectionId)` returning removed connection info
  - [x] Implement `getConnectionsByRoom(roomCode)` for broadcasting
  - [x] Add Pino logging for connection lifecycle

- [x] Task 3: Create broadcast utility on backend (AC: 1, 2)
  - [x] Create `backend/src/websocket/broadcast.ts`
  - [x] Implement `broadcastToRoom(roomCode, event, data, excludeConnectionId?)`
  - [x] Use ConnectionManager to get room connections
  - [x] Handle send errors gracefully (log and remove dead connections)
  - [x] Add logging for broadcast events

- [x] Task 4: Implement WebSocket event handlers on backend (AC: 1, 2, 5, 6, 7)
  - [x] Update `backend/src/server.ts` WebSocket handler (REPLACE echo handler)
  - [x] Parse incoming messages with Zod validation using event schemas
  - [x] Handle `lobby:join` event:
    - Validate with LobbyJoinEventSchema.parse()
    - Validate player exists in room (from RoomManager)
    - If validation fails, send `error` event and return
    - Get roomState with null check before proceeding
    - Add connection to ConnectionManager
    - Send `lobby:sync` to joining player with current state
    - Broadcast `lobby:playerJoined` to other room players
  - [x] Handle `lobby:leave` event:
    - Remove connection from ConnectionManager
    - Broadcast `lobby:playerLeft` to remaining room players
  - [x] Handle socket close:
    - Remove connection from ConnectionManager
    - Broadcast `lobby:playerLeft` with reason 'disconnected'

- [x] Task 5: Extend RoomManager for player removal and state retrieval (AC: 2)
  - [x] Add `getRoomState(roomCode): RoomState | null` method
  - [x] Add `removePlayer(roomCode, playerId): boolean` method
  - [x] Both methods use immutable updates
  - [x] Add logging for state changes

- [x] Task 6: Extend websocketStore for event handling (AC: 1, 2, 4)
  - [x] Expose `ws` ref for direct event listener access
  - [x] Add `connectionStatus` ref: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  - [x] Update `connect()` to set status appropriately
  - [x] Ensure `onopen` callback is accessible for event-driven connection handling

- [x] Task 7: Create useLobbySync composable (AC: 1, 2, 5, 6, 7)
  - [x] Create `frontend/src/composables/useLobbySync.ts`
  - [x] Use event-driven connection pattern (onopen callback, NOT polling)
  - [x] On WebSocket open: send `lobby:join` and register message handler
  - [x] Handle `lobby:sync` event to set initial player list
  - [x] Handle `lobby:playerJoined` event to add player (with toast notification)
  - [x] Handle `lobby:playerLeft` event to remove player (with toast notification)
  - [x] Handle `error` event to redirect user with error message
  - [x] Update lobbyStore with immutable updates
  - [x] Return `{ isConnected, connectionStatus, retryCount }` for UI
  - [x] Clean up handlers and disconnect on unmount

- [x] Task 8: Extend lobbyStore with sync actions (AC: 1, 2)
  - [x] Add `addPlayer(player: PlayerInRoom)` action (with duplicate check)
  - [x] Add `removePlayer(playerId: string)` action
  - [x] Add `syncPlayers(players: PlayerInRoom[])` action
  - [x] Add `currentPlayerId` computed getter for easy access
  - [x] All updates use spread operator (immutable)

- [x] Task 9: Update LobbyView for real-time player list (AC: 1, 2, 3, 4, 5, 6)
  - [x] Import and use `useLobbySync(roomCode, currentPlayerId)`
  - [x] Works for BOTH creator and joiner (same flow)
  - [x] Display player list from lobbyStore.players
  - [x] Show each player with avatar, pseudo, color border
  - [x] Show player count (e.g., "2/10 joueurs")
  - [x] Show connection status indicator (connected/reconnecting/disconnected)
  - [x] Add player join/leave animations (fade in/out with CSS transitions)

- [x] Task 10: Handle player leave on navigation (AC: 2)
  - [x] In LobbyView onBeforeUnmount: send `lobby:leave`
  - [x] Call lobbyStore.exitLobby()
  - [x] Disconnect WebSocket via websocketStore.disconnect()

## Dev Notes

### Critical Architecture Requirements

**FR7 - Real-time lobby synchronization:**
- Players see others join/leave immediately via WebSocket
- Updates must be < 200ms (NFR1)
- No page refresh required
- Works for BOTH room creators AND joiners

**NFR1 - WebSocket latency < 200ms:**
- Use native WebSocket (`ws://` protocol) - NOT Socket.io
- Fastify + @fastify/websocket on backend
- Native WebSocket API on frontend via websocketStore

**NFR6 - Detect disconnection < 5 seconds:**
- WebSocket close event triggers immediately
- Backend removes connection from manager
- Broadcasts `lobby:playerLeft` to remaining players

### WebSocket Event Format (CRITICAL)

**MUST use `namespace:action` format with `{ event, data }` structure:**

```typescript
// Client → Server
{ "event": "lobby:join", "data": { "roomCode": "VENDETTA", "playerId": "uuid" } }
{ "event": "lobby:leave", "data": {} }

// Server → Client
{ "event": "lobby:sync", "data": { "players": [...], "config": {...} } }
{ "event": "lobby:playerJoined", "data": { "id": "uuid", "pseudo": "Sam", ... } }
{ "event": "lobby:playerLeft", "data": { "playerId": "uuid", "reason": "left" | "disconnected" } }
{ "event": "error", "data": { "code": "INVALID_JOIN", "message": "..." } }
```

### WebSocket URL Configuration

```typescript
// Frontend .env
VITE_WS_URL=ws://localhost:3000  // Dev
// Production: wss://your-domain.com

// Usage in code
const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`
```

**Important:** Add `VITE_WS_URL` to `.env.example` if not present.

### Previous Story Patterns (Story 2.1 & 2.2)

**Reuse from existing code:**
- `lobbyStore.enterLobbyAsCreator()` / `enterLobbyAsJoiner()` set initial state
- `lobbyStore.players` is computed from `roomData.value.players`
- `websocketStore` has `connect()`, `send()`, `disconnect()`, `isConnected`
- `roomManager.addPlayer()` returns `{ player, roomState }`
- `PlayerInRoom` type already exists in `shared/src/types/room.ts`

### Shared Types & Schemas to CREATE

```typescript
// shared/src/types/events.ts
import type { PlayerInRoom, GameConfig } from './room'

export interface LobbyJoinEvent {
  roomCode: string
  playerId: string
}

export interface LobbyLeaveEvent {}

export interface LobbySyncEvent {
  players: PlayerInRoom[]
  config: GameConfig
}

export interface LobbyPlayerJoinedEvent extends PlayerInRoom {}

export interface LobbyPlayerLeftEvent {
  playerId: string
  reason: 'left' | 'disconnected'
}

export interface WebSocketErrorEvent {
  code: string
  message: string
}
```

```typescript
// shared/src/schemas/events.ts
import { z } from 'zod'
import { PlayerInRoomSchema, GameConfigSchema } from './room'

export const LobbyJoinEventSchema = z.object({
  roomCode: z.string().min(6).max(10),
  playerId: z.string().uuid()
})

export const LobbyLeaveEventSchema = z.object({})

export const LobbySyncEventSchema = z.object({
  players: z.array(PlayerInRoomSchema),
  config: GameConfigSchema
})

export const LobbyPlayerJoinedEventSchema = PlayerInRoomSchema

export const LobbyPlayerLeftEventSchema = z.object({
  playerId: z.string().uuid(),
  reason: z.enum(['left', 'disconnected'])
})
```

### Backend ConnectionManager (CRITICAL - Correct Types)

```typescript
// backend/src/websocket/ConnectionManager.ts
import type { WebSocket } from 'ws'  // CORRECT type from ws package
import { logger } from '../utils/logger'

interface Connection {
  socket: WebSocket
  roomCode: string
  playerId: string
}

class ConnectionManagerClass {
  private connections = new Map<string, Connection>()
  private roomConnections = new Map<string, Set<string>>()

  addConnection(connectionId: string, socket: WebSocket, roomCode: string, playerId: string) {
    this.connections.set(connectionId, { socket, roomCode, playerId })

    if (!this.roomConnections.has(roomCode)) {
      this.roomConnections.set(roomCode, new Set())
    }
    this.roomConnections.get(roomCode)!.add(connectionId)

    logger.info({ connectionId, roomCode, playerId }, 'Connection added')
  }

  removeConnection(connectionId: string): { roomCode: string; playerId: string } | null {
    const connection = this.connections.get(connectionId)
    if (!connection) return null

    const { roomCode, playerId } = connection
    this.connections.delete(connectionId)
    this.roomConnections.get(roomCode)?.delete(connectionId)

    // Clean up empty room sets
    if (this.roomConnections.get(roomCode)?.size === 0) {
      this.roomConnections.delete(roomCode)
    }

    logger.info({ connectionId, roomCode, playerId }, 'Connection removed')
    return { roomCode, playerId }
  }

  getConnectionsByRoom(roomCode: string): Connection[] {
    const connectionIds = this.roomConnections.get(roomCode)
    if (!connectionIds) return []

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((c): c is Connection => c !== undefined)
  }
}

export const connectionManager = new ConnectionManagerClass()
```

### Backend WebSocket Handler (With Proper Validation)

```typescript
// backend/src/server.ts - REPLACE echo handler

import { randomUUID } from 'crypto'
import { connectionManager } from './websocket/ConnectionManager'
import { broadcastToRoom } from './websocket/broadcast'
import { roomManager } from './managers/RoomManager'
import { LobbyJoinEventSchema } from 'shared/schemas'

fastify.get('/ws', { websocket: true }, (socket, req) => {
  const connectionId = randomUUID()
  fastify.log.info({ connectionId }, 'WebSocket client connected')

  socket.on('message', async (message) => {
    try {
      const { event, data } = JSON.parse(message.toString())

      switch (event) {
        case 'lobby:join': {
          // Validate with Zod
          const parseResult = LobbyJoinEventSchema.safeParse(data)
          if (!parseResult.success) {
            socket.send(JSON.stringify({
              event: 'error',
              data: { code: 'VALIDATION_ERROR', message: 'Invalid join data' }
            }))
            return
          }

          const { roomCode, playerId } = parseResult.data

          // Validate player is in room
          const room = roomManager.getRoom(roomCode)
          if (!room || !room.playerIds.includes(playerId)) {
            socket.send(JSON.stringify({
              event: 'error',
              data: { code: 'INVALID_JOIN', message: 'Player not in room' }
            }))
            return
          }

          // Get room state with null check
          const roomState = roomManager.getRoomState(roomCode)
          if (!roomState) {
            socket.send(JSON.stringify({
              event: 'error',
              data: { code: 'ROOM_NOT_FOUND', message: 'Room state unavailable' }
            }))
            return
          }

          // Add connection
          connectionManager.addConnection(connectionId, socket, roomCode, playerId)

          // Send current state to joining player
          socket.send(JSON.stringify({ event: 'lobby:sync', data: roomState }))

          // Get player data for broadcast
          const player = roomState.players.find(p => p.id === playerId)
          if (player) {
            broadcastToRoom(roomCode, 'lobby:playerJoined', player, connectionId)
          }
          break
        }

        case 'lobby:leave': {
          handleDisconnect(connectionId, 'left')
          break
        }

        default:
          fastify.log.warn({ event }, 'Unknown WebSocket event')
      }
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to process WebSocket message')
      socket.send(JSON.stringify({
        event: 'error',
        data: { code: 'PARSE_ERROR', message: 'Invalid message format' }
      }))
    }
  })

  socket.on('close', () => {
    handleDisconnect(connectionId, 'disconnected')
  })

  socket.on('error', (error) => {
    fastify.log.error({ err: error, connectionId }, 'WebSocket error')
  })
})

function handleDisconnect(connectionId: string, reason: 'left' | 'disconnected') {
  const result = connectionManager.removeConnection(connectionId)
  if (!result) return

  const { roomCode, playerId } = result
  broadcastToRoom(roomCode, 'lobby:playerLeft', { playerId, reason })
  fastify.log.info({ connectionId, roomCode, playerId, reason }, 'Player left lobby')
}
```

### Frontend useLobbySync (Event-Driven Pattern)

```typescript
// frontend/src/composables/useLobbySync.ts
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useWebSocketStore } from '@/stores/websocketStore'
import type { LobbySyncEvent, LobbyPlayerJoinedEvent, LobbyPlayerLeftEvent } from 'shared/types'

export function useLobbySync(roomCode: string, playerId: string) {
  const router = useRouter()
  const lobbyStore = useLobbyStore()
  const wsStore = useWebSocketStore()

  const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`
  const connectionError = ref<string | null>(null)

  function handleMessage(event: MessageEvent) {
    try {
      const { event: eventName, data } = JSON.parse(event.data)

      switch (eventName) {
        case 'lobby:sync':
          lobbyStore.syncPlayers((data as LobbySyncEvent).players)
          break

        case 'lobby:playerJoined':
          lobbyStore.addPlayer(data as LobbyPlayerJoinedEvent)
          // TODO: Show toast notification
          break

        case 'lobby:playerLeft':
          lobbyStore.removePlayer((data as LobbyPlayerLeftEvent).playerId)
          // TODO: Show toast notification
          break

        case 'error':
          connectionError.value = data.message
          // Redirect on critical errors
          if (data.code === 'INVALID_JOIN' || data.code === 'ROOM_NOT_FOUND') {
            router.push({ name: 'home', query: { error: data.code } })
          }
          break
      }
    } catch (error) {
      console.error('[Lobby] Failed to parse message:', error)
    }
  }

  onMounted(() => {
    wsStore.connect(wsUrl)

    // Event-driven: wait for onopen, then join
    const ws = wsStore.ws
    if (ws) {
      const originalOnOpen = ws.onopen
      ws.onopen = (event) => {
        if (originalOnOpen) originalOnOpen.call(ws, event)

        // Send join event
        wsStore.send('lobby:join', { roomCode, playerId })

        // Register message handler
        ws.addEventListener('message', handleMessage)
      }
    }
  })

  onBeforeUnmount(() => {
    // Send leave event before disconnecting
    if (wsStore.isConnected) {
      wsStore.send('lobby:leave', {})
    }

    // Remove message handler
    if (wsStore.ws) {
      wsStore.ws.removeEventListener('message', handleMessage)
    }

    wsStore.disconnect()
  })

  return {
    isConnected: computed(() => wsStore.isConnected),
    connectionState: computed(() => wsStore.connectionState),
    retryCount: computed(() => wsStore.retryCount),
    connectionError
  }
}
```

### lobbyStore Extensions

```typescript
// frontend/src/stores/lobbyStore.ts - ADD these

// Add computed getter for current player ID
const currentPlayerId = computed(() => roomData.value?.currentPlayer?.id ?? null)

// Add sync actions (IMMUTABLE updates)
function addPlayer(player: PlayerInRoom) {
  if (!roomData.value) return
  if (roomData.value.players.some(p => p.id === player.id)) return // Prevent duplicates

  roomData.value = {
    ...roomData.value,
    players: [...roomData.value.players, player]
  }
}

function removePlayer(playerId: string) {
  if (!roomData.value) return

  roomData.value = {
    ...roomData.value,
    players: roomData.value.players.filter(p => p.id !== playerId)
  }
}

function syncPlayers(players: PlayerInRoom[]) {
  if (!roomData.value) return

  roomData.value = {
    ...roomData.value,
    players
  }
}

// Export in return statement
return {
  // ... existing
  currentPlayerId,
  addPlayer,
  removePlayer,
  syncPlayers
}
```

### RoomManager Extensions

```typescript
// backend/src/managers/RoomManager.ts - ADD these methods

getRoomState(roomCode: string): RoomState | null {
  const normalizedCode = roomCode.toUpperCase()
  const roomData = this.rooms.get(normalizedCode)
  if (!roomData) return null

  roomData.lastActivity = new Date()

  return {
    roomCode: roomData.room.code,
    roomId: roomData.room.id,
    players: roomData.players,
    config: roomData.room.config
  }
}

removePlayer(roomCode: string, playerId: string): boolean {
  const normalizedCode = roomCode.toUpperCase()
  const roomData = this.rooms.get(normalizedCode)
  if (!roomData) return false

  const playerExists = roomData.players.some(p => p.id === playerId)
  if (!playerExists) return false

  // Immutable updates
  roomData.players = roomData.players.filter(p => p.id !== playerId)
  roomData.room.playerIds = roomData.room.playerIds.filter(id => id !== playerId)
  roomData.room.updatedAt = new Date().toISOString()
  roomData.lastActivity = new Date()

  logger.info({ roomCode: normalizedCode, playerId }, 'Player removed from room')
  return true
}
```

### Project Structure

**CREATE:**
```
backend/src/websocket/ConnectionManager.ts  # Connection state management
backend/src/websocket/broadcast.ts          # Room broadcasting utility
shared/src/types/events.ts                  # WebSocket event types
shared/src/schemas/events.ts                # WebSocket event Zod schemas
frontend/src/composables/useLobbySync.ts    # Lobby sync composable
```

**MODIFY:**
```
backend/src/server.ts                       # Replace echo handler with real events
backend/src/managers/RoomManager.ts         # Add getRoomState(), removePlayer()
frontend/src/stores/lobbyStore.ts           # Add sync actions + currentPlayerId
frontend/src/stores/websocketStore.ts       # Expose ws ref (already done)
frontend/src/views/LobbyView.vue            # Real-time player list UI
shared/src/types/index.ts                   # Export event types
shared/src/schemas/index.ts                 # Export event schemas
```

### Testing Checklist

**Basic Flows:**
- [ ] Creator creates room via REST, enters lobby, WebSocket connects and sends lobby:join
- [ ] Creator sees themselves in player list after lobby:sync
- [ ] Joiner joins room, Creator sees Joiner appear immediately (< 200ms)
- [ ] Player count updates correctly (2/10 joueurs)
- [ ] Joiner navigates away, Creator sees Joiner disappear

**Edge Cases:**
- [ ] Multiple rapid join/leave events handled correctly
- [ ] Reconnection after < 5 second disconnect restores state
- [ ] Invalid playerId in lobby:join returns error event
- [ ] Room creator's WebSocket connects successfully
- [ ] Two players join simultaneously - both appear

**Connection States:**
- [ ] Connection status indicator shows correct state (connected/reconnecting/disconnected)
- [ ] Exponential backoff works (1s, 2s, 4s, 8s...)
- [ ] Max retries reached shows appropriate message

**Build:**
- [ ] `npm run build:shared` passes
- [ ] `npm run build:backend` passes
- [ ] `npm run build:frontend` passes

### References

- [FR7] Real-time lobby player display
- [NFR1] WebSocket latency < 200ms
- [NFR6] Detect disconnection < 5 seconds
- [AD-9] Hybrid REST + WebSocket
- [Project Context] `_bmad-output/project-context.md` - WebSocket patterns, Pinia immutability
- [Previous Stories] `2-1-create-game-with-configuration.md`, `2-2-join-existing-game.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Implemented complete WebSocket real-time lobby synchronization system
- Created shared event types and Zod schemas for type-safe WebSocket communication
- Backend: ConnectionManager for socket tracking, broadcast utility, lobby:join/leave/sync handlers
- Frontend: Extended websocketStore with connectionStatus, created useLobbySync composable
- LobbyView now shows real-time player list with avatars, colors, and connection status
- Player join/leave animations with CSS transitions
- All builds pass (shared, backend, frontend)

**Code Review Fixes Applied (2026-01-10):**
- HIGH-1: Fixed race condition in useLobbySync - now uses Vue watchers for WebSocket state
- HIGH-2: Added guard against empty playerId in LobbyView and useLobbySync
- MEDIUM-1: Improved dead connection handling in broadcast.ts with better logging
- MEDIUM-2: useLobbySync now re-sends lobby:join on reconnection via connectionStatus watcher
- MEDIUM-3: ConnectionManager now normalizes roomCode to uppercase consistently
- MEDIUM-4: Created frontend/.env.example with VITE_WS_URL documentation

### Change Log

- 2026-01-09: Implemented Story 2.3 - Real-time lobby synchronization via WebSocket
- 2026-01-10: Code review fixes applied (HIGH-1, HIGH-2, MEDIUM-1 to MEDIUM-4)

### File List

**Created:**
- shared/src/types/events.ts
- shared/src/schemas/events.ts
- backend/src/websocket/ConnectionManager.ts
- backend/src/websocket/broadcast.ts
- frontend/src/composables/useLobbySync.ts
- frontend/.env.example

**Modified:**
- shared/src/types/index.ts
- shared/src/schemas/index.ts
- backend/src/server.ts
- backend/src/managers/RoomManager.ts
- frontend/src/stores/websocketStore.ts
- frontend/src/stores/lobbyStore.ts
- frontend/src/views/LobbyView.vue
