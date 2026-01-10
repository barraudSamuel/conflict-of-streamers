# Story 3.1: Connect to Twitch Chat via tmi.js

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system (backend)**,
I want **to connect to a streamer's Twitch chat channel using tmi.js in anonymous mode**,
So that **I can listen to chat messages without requiring OAuth authentication (FR12, NFR12)**.

## Acceptance Criteria

1. **Given** a game has been created with a streamer's Twitch username
   **When** the game initializes (game:started event is broadcast)
   **Then** the backend establishes an IRC connection to that Twitch channel using tmi.js 1.8 (AR18)
   **And** the connection is made in anonymous mode (no OAuth required - NFR12)
   **And** the connection success is logged via Pino (AR14)

2. **Given** the system attempts to connect to Twitch IRC
   **When** the connection fails (invalid channel, network error)
   **Then** the system displays a clear error message to the streamer via WebSocket (NFR9)
   **And** the error is logged with full context via Pino

3. **Given** a Twitch IRC connection is established
   **When** a message is received from the chat
   **Then** the system can receive and log the message
   **And** the message includes: channel, username, message content, timestamp

4. **Given** a game ends or all players disconnect
   **When** the room is cleaned up
   **Then** the Twitch IRC connection for that room is properly closed
   **And** resources are released (no memory leaks)

5. **Given** a Twitch channel is connected
   **When** checking the connection status
   **Then** the system can report connected/disconnected state
   **And** the state is accessible for Story 3.4 reconnection logic

## Tasks / Subtasks

- [x] Task 1: Install tmi.js dependency (AC: 1)
  - [x] Add `tmi.js@^1.8.0` to backend package.json
  - [x] Add `@types/tmi.js` to devDependencies
  - [x] Run npm install and verify no errors

- [x] Task 2: Create TwitchManager class (AC: 1, 2, 3, 4, 5)
  - [x] Create `backend/src/managers/TwitchManager.ts`
  - [x] Implement singleton pattern (one TwitchManager instance)
  - [x] Add Map<roomCode, tmi.Client> to track connections per room
  - [x] Add logger instance (Pino) for structured logging

- [x] Task 3: Implement connect() method (AC: 1, 2, 3)
  - [x] Create `connect(roomCode: string, channelName: string): Promise<void>`
  - [x] Configure tmi.js client in anonymous mode (no OAuth)
  - [x] Set up message event listener (on 'message')
  - [x] Set up connected/disconnected event listeners
  - [x] Log connection success/failure with structured data
  - [x] Handle connection errors gracefully

- [x] Task 4: Implement disconnect() method (AC: 4)
  - [x] Create `disconnect(roomCode: string): Promise<void>`
  - [x] Properly close tmi.js client
  - [x] Remove client from Map
  - [x] Log disconnection

- [x] Task 5: Implement status methods (AC: 5)
  - [x] Create `isConnected(roomCode: string): boolean`
  - [x] Create `getClient(roomCode: string): tmi.Client | null`
  - [x] Expose connection state for reconnection logic (Story 3.4)

- [x] Task 6: Integrate with game start flow (AC: 1)
  - [x] Import TwitchManager in server.ts
  - [x] Call TwitchManager.connect() when game:started is broadcast
  - [x] Pass the creator's Twitch username as channel name
  - [x] Handle connection error (send WebSocket error to clients)

- [x] Task 7: Integrate with room cleanup (AC: 4)
  - [x] Call TwitchManager.disconnect() when room is deleted
  - [x] Update RoomManager cleanup to include Twitch disconnection

- [x] Task 8: Create shared Twitch types (AC: 3)
  - [x] Add TwitchMessage type to shared/src/types/twitch.ts
  - [x] Add TwitchConnectionStatus type
  - [x] Export from shared/src/types/index.ts

- [x] Task 9: Build verification and testing
  - [x] Run `npm run build:shared` - verify no TypeScript errors
  - [x] Run `npm run build:backend` - verify no TypeScript errors
  - [ ] Manual test: Start game → verify IRC connection in logs
  - [ ] Manual test: Invalid channel → verify error handling

## Dev Notes

### Critical Architecture Requirements

**AR18 - Twitch Integration:**
- MUST use tmi.js 1.8 in anonymous mode
- Reconnection automatique toutes les 10 sec (sera dans Story 3.4)
- Pas d'OAuth requis - mode lecture seule du chat

**AD-3 - Dual Counting Pattern:**
- Cette story pose les bases pour le dual counting
- Prochaines stories: parsing commandes (3.2), comptage users (3.3)
- TwitchManager sera utilisé par GameEngine pour les compteurs

**NFR9 - Reconnexion IRC:**
- La reconnexion sera implémentée dans Story 3.4
- Cette story doit exposer l'état de connexion pour permettre la reconnexion

**NFR12 - Mode Anonyme:**
- AUCUNE authentification OAuth requise
- tmi.js peut lire les chats en mode anonyme
- Limite: pas de write, uniquement read

### tmi.js Configuration Pattern

```typescript
// backend/src/managers/TwitchManager.ts
import tmi from 'tmi.js'
import { logger } from '../utils/logger'

class TwitchManagerClass {
  private clients = new Map<string, tmi.Client>()

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

      logger.debug({
        roomCode,
        channel,
        username: tags['display-name'] || tags.username,
        message: message.substring(0, 100) // Truncate for logging
      }, 'Twitch message received')

      // Message processing in Story 3.2
    })

    try {
      await client.connect()
      this.clients.set(roomCode, client)
    } catch (error) {
      logger.error({ roomCode, channelName, err: error }, 'Failed to connect to Twitch IRC')
      throw error
    }
  }

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

  isConnected(roomCode: string): boolean {
    const client = this.clients.get(roomCode)
    return client?.readyState() === 'OPEN'
  }

  getClient(roomCode: string): tmi.Client | null {
    return this.clients.get(roomCode) ?? null
  }
}

export const twitchManager = new TwitchManagerClass()
```

### Integration avec game:started

```typescript
// Dans server.ts, après broadcast de game:started
case GAME_EVENTS.STARTED: {
  // ... existing broadcast logic ...

  // Connect to creator's Twitch chat
  const creator = roomState?.players.find(p => p.isCreator)
  if (creator) {
    try {
      await twitchManager.connect(roomCode, creator.pseudo)
    } catch (error) {
      // Log error but don't fail game start
      fastify.log.error({ roomCode, err: error }, 'Twitch IRC connection failed')

      // Optionally notify clients
      broadcastToRoom(roomCode, 'twitch:error', {
        code: 'TWITCH_CONNECTION_FAILED',
        message: 'Connexion au chat Twitch echouee'
      })
    }
  }
}
```

### Shared Types

```typescript
// shared/src/types/twitch.ts
export interface TwitchMessage {
  channel: string
  username: string
  displayName: string
  message: string
  timestamp: number
  userId?: string
}

export type TwitchConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface TwitchState {
  status: TwitchConnectionStatus
  channelName: string | null
  lastError?: string
}
```

### Cleanup Integration

```typescript
// Dans RoomManager.ts
async deleteRoom(roomCode: string): Promise<void> {
  // Existing cleanup...

  // Disconnect Twitch IRC
  await twitchManager.disconnect(roomCode)

  // Remove room from Map
  this.rooms.delete(roomCode)
}
```

### Project Structure Notes

**CREATE:**
```
backend/src/managers/TwitchManager.ts
shared/src/types/twitch.ts
```

**MODIFY:**
```
backend/package.json (add tmi.js dependency)
backend/src/server.ts (import TwitchManager, call on game:started)
backend/src/managers/RoomManager.ts (call TwitchManager.disconnect on cleanup)
shared/src/types/index.ts (export twitch types)
```

### Testing Checklist

**Verification manuelle:**
- [ ] npm install ne produit pas d'erreurs
- [ ] Build backend passe sans erreurs TypeScript
- [ ] Game start → logs montrent "Connected to Twitch IRC"
- [ ] Messages reçus → logs montrent "Twitch message received"
- [ ] Room cleanup → logs montrent "Twitch client removed"
- [ ] Invalid channel → error logged, game continues

**Edge Cases:**
- [ ] Channel inexistant → error handled gracefully
- [ ] Double connect (same room) → prevented
- [ ] Disconnect before connect completes → no crash

### Contraintes Techniques Twitch

**Délai IRC incompressible:**
- 2-4 secondes entre émission message viewer et réception serveur
- Cette latence est acceptée et compensée par le dual counting (Epic 4)
- Le feedback viewer sera géré par compteur optimiste côté client

**Mode anonyme limitations:**
- Read-only (pas d'écriture dans le chat)
- Pas d'accès aux données étendues utilisateur
- Pas de badges, emotes détaillés, etc.
- Suffisant pour notre use case (compter les commandes)

### References

- [FR12] Connexion chat Twitch via tmi.js mode anonyme - _bmad-output/planning-artifacts/prd.md
- [AR18] tmi.js 1.8 en mode anonyme avec reconnexion automatique - architecture.md#AR18
- [AD-3] Dual Counting for Twitch Delay Compensation - architecture.md#AD-3
- [NFR9] Reconnexion IRC toutes les 10 sec si échec - architecture.md#NFR9
- [NFR12] Mode anonyme sans OAuth - architecture.md#NFR12
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.1]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- ✅ Task 1: @types/tmi.js added to devDependencies (tmi.js already present)
- ✅ Task 2-5: Created TwitchManager singleton class with connect(), disconnect(), isConnected(), getClient() methods
- ✅ Task 6: Integrated Twitch connection in server.ts GAME_EVENTS.START handler
- ✅ Task 7: Added twitchManager.disconnect() to RoomManager.cleanupStaleRooms()
- ✅ Task 8: Created shared Twitch types (TwitchMessage, TwitchConnectionStatus, TwitchState)
- ✅ Task 9: Both npm run build:shared and npm run build:backend pass without errors
- Note: Manual tests (IRC connection logs, error handling) require user verification

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5 (code-review workflow)
**Date:** 2026-01-10

**Issues Found:** 2 HIGH, 4 MEDIUM, 1 LOW
**Issues Fixed:** 2 HIGH, 3 MEDIUM (auto-fix)

| Severity | Issue | Status |
|----------|-------|--------|
| HIGH-1 | AC3 - Timestamp manquant dans logging messages | ✅ Fixed |
| HIGH-2 | Event 'twitch:error' non type | ✅ Fixed |
| MEDIUM-1 | Handler 'error' manquant sur tmi.js client | ✅ Fixed |
| MEDIUM-2 | Cleanup interval n'attend pas Promise async | ✅ Fixed |
| MEDIUM-3 | Pas de tracking etat 'connecting' | Deferred to Story 3.4 |
| MEDIUM-4 | TwitchMessage type not used | Expected for Story 3.2 |
| LOW-1 | Hypothese pseudo = Twitch username | Documented |

### Change Log

- 2026-01-10: Story created with comprehensive implementation context
- 2026-01-10: Implementation completed - All automated tasks done, manual tests pending user verification
- 2026-01-10: Code review completed - 5 issues fixed (2 HIGH, 3 MEDIUM)

### File List

**Created:**
- backend/src/managers/TwitchManager.ts
- shared/src/types/twitch.ts

**Modified:**
- backend/package.json (added @types/tmi.js to devDependencies)
- backend/src/server.ts (import TwitchManager, TWITCH_EVENTS, connect on game:started)
- backend/src/managers/RoomManager.ts (import TwitchManager, disconnect on cleanup, async cleanup fix)
- shared/src/types/index.ts (export Twitch types + TwitchErrorEvent + TWITCH_EVENTS)
- shared/src/types/events.ts (add TwitchErrorEvent type, TWITCH_EVENTS constant)
- shared/src/schemas/events.ts (add TwitchErrorEventSchema)
- shared/src/schemas/index.ts (export TwitchErrorEventSchema)

