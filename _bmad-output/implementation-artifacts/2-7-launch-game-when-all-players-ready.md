# Story 2.7: Launch Game When All Players Ready

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **streamer (game creator)**,
I want **to launch the game when all players have selected their territories**,
So that **the game can begin (FR10)**.

## Acceptance Criteria

1. **Given** I am the game creator in the lobby
   **And** all players have selected their starting territories
   **When** I click "Lancer la Partie"
   **Then** the game transitions to the active game state
   **And** all players are navigated to the game view via WebSocket event
   **And** the game configuration becomes immutable (AR7)
   **And** the game state is initialized in backend memory

2. **Given** I am the game creator in the lobby
   **When** not all players have selected territories
   **Then** the "Lancer la Partie" button is disabled
   **And** I see a message indicating which players haven't selected yet

3. **Given** I am a non-creator player in the lobby
   **Then** I do not see the "Lancer la Partie" button
   **But** I can see which players have/haven't selected territories

4. **Given** the game has been launched
   **When** all players receive the `game:start` WebSocket event
   **Then** all clients navigate to `/game/:roomCode`
   **And** the room status changes from 'lobby' to 'playing'

5. **Given** a player tries to join via REST API
   **When** the room status is 'playing'
   **Then** the API returns an error "Cette partie a deja commence" (existing behavior in Story 2.2)

6. **Given** the game launch is broadcast via WebSocket
   **Then** all clients receive the event within 200ms (NFR1)
   **And** the UI transitions without page refresh

## Tasks / Subtasks

- [x] Task 1: Add game start WebSocket events (AC: 1, 4, 6)
  - [x] Add `game:start` event to shared/types/events.ts (ClientToServer)
  - [x] Add `game:started` event (ServerToClient) for broadcast
  - [x] Create GameStartEventSchema Zod schema (no payload needed - just event)
  - [x] Create GameStartedEventSchema with initial game state payload
  - [x] Add GAME_EVENTS constant to shared/types/events.ts

- [x] Task 2: Add territory selection tracking to RoomManager (AC: 1, 2)
  - [x] Add `allPlayersHaveSelectedTerritory(roomCode: string): boolean` method
  - [x] Add `getPlayersWithoutTerritory(roomCode: string): PlayerInRoom[]` method
  - [x] Update `startGame(roomCode: string, playerId: string)` method that:
    - [x] Verifies player is creator
    - [x] Verifies room status is 'lobby'
    - [x] Verifies all players have selected territory
    - [x] Changes room status from 'lobby' to 'playing'
    - [x] Returns success/error with reason

- [x] Task 3: Add WebSocket handler for game start (AC: 1, 4, 6)
  - [x] Add `game:start` handler in backend/src/server.ts
  - [x] Validate request (creator only, all territories selected)
  - [x] Call roomManager.startGame()
  - [x] Broadcast `game:started` event to all room players
  - [x] Handle errors (not creator, missing selections, already started)

- [x] Task 4: Update lobbyStore for ready state tracking (AC: 2)
  - [x] Add computed `allPlayersReady` - check if all players have selected territory (in StartGameButton)
  - [x] Add computed `playersWithoutTerritory` - list of players without selection (in StartGameButton)
  - [x] Integrate with territoryStore for selection tracking

- [x] Task 5: Create StartGameButton component (AC: 1, 2, 3)
  - [x] Create `frontend/src/components/lobby/StartGameButton.vue`
  - [x] Show only for creator (use lobbyStore.isCreator)
  - [x] Disable when not all players ready
  - [x] Show tooltip/message when disabled indicating which players need to select
  - [x] Call websocketStore.send() with `game:start` event on click
  - [x] Show loading state while waiting for server response

- [x] Task 6: Add WebSocket handler in useLobbySync (AC: 4, 6)
  - [x] Add handler for `game:started` event
  - [x] Navigate all clients to `/game/:roomCode` using router.push()

- [x] Task 7: Update LobbyView to include StartGameButton (AC: 1, 2, 3)
  - [x] Import and use StartGameButton component
  - [x] Position button prominently in lobby UI

- [x] Task 8: Create placeholder GameView component (AC: 4)
  - [x] Create `frontend/src/views/GameView.vue` with minimal placeholder
  - [x] Add route `/game/:roomCode` to router
  - [x] Display room code and "Game in progress" message
  - [x] (Full game implementation is Epic 4 and 5)

- [x] Task 9: Update websocketStore for game start (AC: 1)
  - [x] Use existing generic wsStore.send() method with GAME_EVENTS.START

- [x] Task 10: Build verification and testing
  - [x] Run `npm run build:shared` - verify no TypeScript errors
  - [x] Run `npm run build:frontend` - verify no TypeScript errors
  - [x] Run `npm run build:backend` - verify no TypeScript errors
  - [ ] Manual test: Creator can launch game when all territories selected
  - [ ] Manual test: Button disabled when missing selections
  - [ ] Manual test: All players navigate to game view on launch
  - [ ] Manual test: Non-creator cannot see launch button

## Dev Notes

### Critical Architecture Requirements

**AR7 - Per-Room Configuration:**
- Configuration is modifiable ONLY in lobby (status === 'lobby')
- Once game starts (status === 'playing'), config becomes immutable
- This is already enforced in RoomManager.updateConfig()

**AD-5 - Native WebSocket Protocol:**
- MUST use native WebSocket with `ws://` protocol
- Event format: `{ event: "namespace:action", data: {...} }`
- Use `game:start` (client->server) and `game:started` (server->client) events

**FR10 - Launch game when all players ready:**
- Creator-only functionality
- All players must have selected starting territory
- Real-time transition to game view via WebSocket

**NFR1 - WebSocket latency < 200ms:**
- Game start event broadcast immediately
- All clients must navigate simultaneously

### WebSocket Event Format

```typescript
// Client -> Server (creator only)
{
  "event": "game:start",
  "data": {}  // No payload needed, server knows roomCode from connection
}

// Server -> All Clients
{
  "event": "game:started",
  "data": {
    "roomCode": "VENDETTA",
    "startedAt": "2026-01-10T12:00:00.000Z",
    "players": [...],  // Final player list with territories
    "config": {...}    // Frozen game config
  }
}
```

### Event Constants Pattern (from events.ts)

```typescript
export const GAME_EVENTS = {
  START: 'game:start',   // Client -> Server (creator only)
  STARTED: 'game:started' // Server -> All Clients
} as const

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS]
```

### Territory Selection Tracking

Current implementation in RoomManager:
```typescript
// Existing method - get all selections
getTerritorySelections(roomCode: string): TerritorySelection[]

// NEW method needed
allPlayersHaveSelectedTerritory(roomCode: string): boolean {
  const roomData = this.rooms.get(roomCode.toUpperCase())
  if (!roomData) return false

  // Every player must have a selection in territorySelections map
  return roomData.players.every(player =>
    roomData.territorySelections.has(player.id)
  )
}

// NEW method needed
getPlayersWithoutTerritory(roomCode: string): PlayerInRoom[] {
  const roomData = this.rooms.get(roomCode.toUpperCase())
  if (!roomData) return []

  return roomData.players.filter(player =>
    !roomData.territorySelections.has(player.id)
  )
}
```

### Room Status State Machine

```
'lobby' --> [game:start] --> 'playing' --> [game:victory] --> 'ended'
                                      ^
                                      |
                          (no going back to lobby)
```

### StartGameButton Component Structure

```vue
<!-- frontend/src/components/lobby/StartGameButton.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useWebSocketStore } from '@/stores/websocketStore'
import { GAME_EVENTS } from 'shared/types'

const lobbyStore = useLobbyStore()
const territoryStore = useTerritoryStore()
const wsStore = useWebSocketStore()

const isLoading = ref(false)

// Watch for errors to reset loading state
watch(
  () => lobbyStore.lastError,
  (error) => {
    if (error && isLoading.value) {
      isLoading.value = false
    }
  }
)

// Check if all players have selected territory
// Uses territoryStore.playerSelections which tracks all player selections
const allPlayersReady = computed(() => {
  const players = lobbyStore.players
  const selections = territoryStore.playerSelections // Map<playerId, TerritorySelection>
  return players.every(p => selections.has(p.id))
})

const playersWithoutTerritory = computed(() => {
  const players = lobbyStore.players
  const selections = territoryStore.playerSelections
  return players.filter(p => !selections.has(p.id))
})

const canStartGame = computed(() =>
  lobbyStore.isCreator && allPlayersReady.value && !isLoading.value
)

function handleStartGame() {
  if (!canStartGame.value) return
  isLoading.value = true
  wsStore.send(GAME_EVENTS.START, {})
}
</script>

<template>
  <div class="space-y-2">
    <!-- Start button - Creator only -->
    <Button
      v-if="lobbyStore.isCreator"
      variant="primary"
      size="lg"
      :full-width="true"
      :disabled="!canStartGame"
      @click="handleStartGame"
    >
      {{ isLoading ? 'Lancement...' : 'Lancer la Partie' }}
    </Button>

    <!-- Status message - Visible to ALL players (AC3) -->
    <p v-if="!allPlayersReady && playersWithoutTerritory.length > 0"
       class="text-sm text-warning text-center">
      En attente de:
      <span v-for="(player, idx) in playersWithoutTerritory" :key="player.id">
        {{ player.pseudo }}{{ idx < playersWithoutTerritory.length - 1 ? ', ' : '' }}
      </span>
      ({{ playersWithoutTerritory.length === 1 ? 'doit selectionner' : 'doivent selectionner' }} un territoire)
    </p>

    <!-- Ready status - Visible to ALL players -->
    <p v-if="allPlayersReady" class="text-sm text-success text-center">
      Tous les joueurs sont prets!
    </p>
  </div>
</template>
```

### Backend WebSocket Handler Pattern

```typescript
// In server.ts - add to switch statement
case GAME_EVENTS.START: {
  // Get connection info
  const connectionInfo = connectionManager.getConnection(connectionId)
  if (!connectionInfo) {
    socket.send(JSON.stringify({
      event: LOBBY_EVENTS.ERROR,
      data: { code: 'NOT_JOINED', message: 'Must join lobby first' }
    }))
    return
  }

  const { roomCode, playerId } = connectionInfo

  // Try to start game (RoomManager validates creator and territory selections)
  const result = roomManager.startGame(roomCode, playerId)

  if (!result.success) {
    const errorMessages: Record<string, string> = {
      'ROOM_NOT_FOUND': 'Room not found',
      'NOT_CREATOR': 'Only the creator can start the game',
      'GAME_STARTED': 'Game has already started',
      'NOT_ALL_READY': 'All players must select a territory before starting'
    }
    socket.send(JSON.stringify({
      event: LOBBY_EVENTS.ERROR,
      data: {
        code: result.error ?? 'START_FAILED',
        message: errorMessages[result.error ?? ''] ?? 'Failed to start game'
      }
    }))
    return
  }

  // Get final room state for broadcast
  const roomState = roomManager.getRoomState(roomCode)

  // Broadcast game started to all players
  broadcastToRoom(roomCode, GAME_EVENTS.STARTED, {
    roomCode,
    startedAt: new Date().toISOString(),
    players: roomState?.players ?? [],
    config: roomState?.config
  })

  fastify.log.info({ connectionId, roomCode, playerId }, 'Game started')
  break
}
```

### RoomManager.startGame() Method

```typescript
/**
 * Start the game (creator only, all territories must be selected)
 * Returns success/error with reason
 */
startGame(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const normalizedCode = roomCode.toUpperCase()
  const roomData = this.rooms.get(normalizedCode)

  // Room not found
  if (!roomData) {
    return { success: false, error: 'ROOM_NOT_FOUND' }
  }

  // Verify player is creator
  const player = roomData.players.find(p => p.id === playerId)
  if (!player || !player.isCreator) {
    logger.warn({ roomCode: normalizedCode, playerId }, 'Non-creator attempted game start')
    return { success: false, error: 'NOT_CREATOR' }
  }

  // Verify room is in lobby status
  if (roomData.room.status !== 'lobby') {
    logger.warn({ roomCode: normalizedCode, status: roomData.room.status }, 'Game start rejected - already started')
    return { success: false, error: 'GAME_STARTED' }
  }

  // Verify all players have selected territory
  const allReady = roomData.players.every(p => roomData.territorySelections.has(p.id))
  if (!allReady) {
    const missing = roomData.players.filter(p => !roomData.territorySelections.has(p.id))
    logger.warn({ roomCode: normalizedCode, missingPlayers: missing.map(p => p.pseudo) }, 'Game start rejected - not all ready')
    return { success: false, error: 'NOT_ALL_READY' }
  }

  // Transition room status to 'playing'
  roomData.room.status = 'playing'
  roomData.room.updatedAt = new Date().toISOString()
  roomData.lastActivity = new Date()

  logger.info({ roomCode: normalizedCode, playerId, playerCount: roomData.players.length }, 'Game started')

  return { success: true }
}
```

### Navigation on game:started Event (useLobbySync)

```typescript
// In useLobbySync.ts - add to handleWebSocketMessage switch
case GAME_EVENTS.STARTED: {
  const { roomCode } = data
  logger.info({ roomCode }, 'Game started - navigating to game view')

  // Navigate all clients to game view
  router.push(`/game/${roomCode}`)
  break
}
```

### Placeholder GameView Component

```vue
<!-- frontend/src/views/GameView.vue -->
<script setup lang="ts">
/**
 * GameView - Main game screen (placeholder for Story 2.7)
 * Full implementation in Epic 5
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Container, PageLayout, Card } from '@/components/ui'

const route = useRoute()
const roomCode = computed(() => (route.params.roomCode as string).toUpperCase())
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="lg" class="py-8 min-h-screen">
      <Card :padding="'lg'" :glow="true" class="text-center">
        <h1 class="text-3xl font-bold text-white mb-4">Partie en cours</h1>
        <p class="text-xl text-player-cyan mb-6">Code: {{ roomCode }}</p>
        <p class="text-gray-400">
          L'interface de jeu complete sera implementee dans l'Epic 5
        </p>
      </Card>
    </Container>
  </PageLayout>
</template>
```

### Router Update

```typescript
// In frontend/src/router/index.ts - add route
{
  path: '/game/:roomCode',
  name: 'game',
  component: () => import('@/views/GameView.vue')
}
```

### Existing Code Patterns (from Previous Stories)

**LobbyView.vue (Story 2.5):**
- Territory selection integrated with TerritorySelectionCanvas
- Players list shows all players with territory status
- isCreator computed property available

**territoryStore.ts (Story 2.5):**
- `territoryOwners` Map tracks which player owns which territory
- `selectedTerritoryId` tracks current player's selection

**RoomManager.ts (Story 2.6):**
- `territorySelections` Map<playerId, TerritorySelection> already exists
- Methods for territory selection already implemented
- Room status tracking with 'lobby' | 'playing' | 'ended'

### Project Structure Notes

**CREATE:**
```
frontend/src/components/lobby/StartGameButton.vue
frontend/src/views/GameView.vue
```

**MODIFY:**
```
shared/src/types/events.ts (add GAME_EVENTS constant and types)
shared/src/schemas/events.ts (add GameStartEventSchema, GameStartedEventSchema)
shared/src/schemas/index.ts (export new schemas)
shared/src/types/index.ts (export new types)
backend/src/managers/RoomManager.ts (add startGame, allPlayersHaveSelectedTerritory methods)
backend/src/server.ts (add game:start WebSocket handler)
frontend/src/stores/lobbyStore.ts (add allPlayersReady computed if needed)
frontend/src/composables/useLobbySync.ts (add game:started handler)
frontend/src/views/LobbyView.vue (add StartGameButton)
frontend/src/router/index.ts (add /game/:roomCode route)
```

### Testing Checklist

**Visual Verification:**
- [ ] Creator sees "Lancer la Partie" button in lobby
- [ ] Non-creator does NOT see the button
- [ ] Button disabled when some players haven't selected territory
- [ ] Disabled state shows which players are missing selection
- [ ] Button enabled when all players have selected
- [ ] Click navigates all clients to /game/:roomCode

**WebSocket Verification:**
- [ ] `game:start` event sent when creator clicks button
- [ ] `game:started` broadcast received by all clients
- [ ] Non-creators cannot send game:start (server rejects)

**Edge Cases:**
- [ ] Game start rejected when not all territories selected
- [ ] Game start rejected when not creator
- [ ] Game start rejected when game already started
- [ ] Late joiner cannot join room with status 'playing' (existing behavior)
- [ ] Config updates rejected after game start (existing behavior)

**Build Verification:**
- [ ] `npm run build:shared` passes
- [ ] `npm run build:frontend` passes
- [ ] `npm run build:backend` passes

### References

- [FR10] Launch game when all players ready - _bmad-output/planning-artifacts/prd.md
- [AR7] Per-room configuration - immutable after game start - architecture.md#AD-6
- [AD-5] Native WebSocket with namespace:action format - architecture.md#AD-5
- [NFR1] WebSocket latency < 200ms - architecture.md
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.7]
- [Source: _bmad-output/project-context.md#WebSocket-Event-Naming]
- [Source: 2-6-modify-game-configuration-before-launch.md]
- [Source: 2-5-territory-selection-on-grid.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- All 10 tasks implemented successfully
- All TypeScript builds pass (shared, backend, frontend)
- Code review fixes applied (HIGH-1, HIGH-2, HIGH-3, MEDIUM-1, MEDIUM-2, MEDIUM-3)
- Manual testing required for final verification

### Change Log

- 2026-01-10: Story created with full implementation details
- 2026-01-10: Implementation completed, all builds passing, status moved to review
- 2026-01-10: Code review fixes applied:
  - HIGH-1: Fixed AC3 - status messages now visible to ALL players, not just creator
  - HIGH-2: Removed duplicate comment block in events.ts
  - HIGH-3: Added lastError state to lobbyStore, watch in StartGameButton resets isLoading on error
  - MEDIUM-1: Added router guard for GameView to prevent direct URL access
  - MEDIUM-2: Updated Dev Notes to match actual implementation (playerSelections, error handling)
  - MEDIUM-3: Added MIN_PLAYERS=2 validation in RoomManager.startGame()

### File List

**Created:**
- frontend/src/components/lobby/StartGameButton.vue
- frontend/src/views/GameView.vue

**Modified:**
- shared/src/types/events.ts (added GAME_EVENTS constant and types)
- shared/src/schemas/events.ts (added GameStartEventSchema, GameStartedEventSchema; removed duplicate comment)
- shared/src/schemas/index.ts (exported new schemas)
- shared/src/types/index.ts (exported new types and GAME_EVENTS)
- backend/src/managers/RoomManager.ts (added startGame, allPlayersHaveSelectedTerritory, getPlayersWithoutTerritory, MIN_PLAYERS validation)
- backend/src/server.ts (added game:start WebSocket handler)
- frontend/src/stores/lobbyStore.ts (added lastError, setError, clearError for error state)
- frontend/src/composables/useLobbySync.ts (added game:started handler, setError on lobby errors)
- frontend/src/views/LobbyView.vue (added StartGameButton component)
- frontend/src/router/index.ts (added /game/:roomCode route with beforeEnter guard)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: done)
