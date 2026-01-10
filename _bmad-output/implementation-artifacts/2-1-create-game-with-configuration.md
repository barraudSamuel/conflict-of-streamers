# Story 2.1: Create Game with Configuration

Status: done

## Story

As a **streamer (game creator)**,
I want **to create a new game by entering my Twitch pseudo and configuring game parameters**,
So that **I can start a custom game session and share the game code with other streamers (FR1-FR3)**.

## Acceptance Criteria

1. **Given** I am on the home page
   **When** I click "Créer une Partie"
   **Then** I am navigated to a game creation form (route /create)

2. **Given** I am on the game creation form
   **When** the form loads
   **Then** I can enter:
   - My pseudo Twitch (required, 3-20 characters)
   - Battle duration (configurable, default 30 seconds - FR2)
   - Cooldown between actions (configurable, default 10 seconds - FR2)

3. **Given** I have filled the form with valid data
   **When** I submit the form
   **Then** a REST API creates a new game with a unique shareable code (FR3)
   **And** the code is 6-10 uppercase alphanumeric characters
   **And** I am redirected to the lobby with the game code displayed prominently

4. **Given** the game is created successfully
   **When** I view the lobby
   **Then** a default avatar is generated using my assigned player color
   **And** the game configuration is stored in backend memory (AR7 - per-room config)

5. **Given** I submit the form with invalid data
   **When** validation fails
   **Then** I see clear error messages (UXR7)
   **And** the form is not submitted

6. **Given** the backend receives the create game request
   **When** processing the request
   **Then** validation uses Zod schemas (AR8)
   **And** errors are handled with custom error classes (AR9)

7. **Given** I navigate to /lobby/:roomCode with an invalid code
   **When** the room doesn't exist
   **Then** I am redirected to home with an error message

## Tasks / Subtasks

- [x] Task 1: Create game creation form UI (AC: 1, 2, 5)
  - [x] Convert CreateGameView.vue from placeholder to full form
  - [x] Add Input for pseudo Twitch (required, 3-20 chars validation)
  - [x] Add Input for battle duration (number, default 30, min 10, max 120 seconds)
  - [x] Add Input for cooldown (number, default 10, min 5, max 60 seconds)
  - [x] Add form validation with Zod safeParse() on frontend
  - [x] Add loading state during form submission
  - [x] Display validation errors clearly with Input error state

- [x] Task 2: Create REST API endpoint for game creation (AC: 3, 6)
  - [x] Create `backend/src/routes/rooms.ts` with POST /api/rooms endpoint
  - [x] Implement CreateRoomSchema in shared/src/schemas for request validation
  - [x] Generate unique 6-10 char uppercase alphanumeric room code
  - [x] Add Pino logging for room creation events
  - [x] Return room code, room ID, and creator data in response
  - [x] Register routes in server.ts

- [x] Task 3: Implement RoomManager for game state (AC: 4)
  - [x] Create `backend/src/managers/RoomManager.ts`
  - [x] Implement in-memory room storage with Map<string, Room>
  - [x] Add createRoom() method with config immutability (AR7)
  - [x] Add getRoom() and roomExists() methods
  - [x] Add room TTL cleanup (30 min if empty) for memory management
  - [x] Add Pino logging for lifecycle events (create, get, cleanup)
  - [x] Export singleton instance

- [x] Task 4: Generate default player avatar (AC: 4)
  - [x] Assign player color from PlayerSchema colors (8 neon colors available)
  - [x] Generate SVG avatar with first letter of pseudo + assigned color
  - [x] Store avatar as data URL or inline SVG in player data

- [x] Task 5: Create API client service on frontend (AC: 3)
  - [x] Create `frontend/src/services/api.ts`
  - [x] Implement createRoom() function with fetch
  - [x] Add proper TypeScript types for request/response
  - [x] Handle errors and return typed results

- [x] Task 6: Implement form submission and navigation (AC: 3, 4)
  - [x] Wire form submission to API client
  - [x] On success, store room data in lobbyStore (Pinia) via enterLobby()
  - [x] Navigate to /lobby/:roomCode route

- [x] Task 7: Create lobby route with validation (AC: 3, 7)
  - [x] Add /lobby/:roomCode route to Vue Router
  - [x] Add beforeEnter guard to verify room exists via API
  - [x] Redirect to home with error message if room invalid
  - [x] Create LobbyView.vue placeholder component
  - [x] Display room code prominently
  - [x] Display creator's avatar and pseudo
  - [x] Add "Retour" navigation to home

- [x] Task 8: Add shared types and schemas (AC: 6)
  - [x] Add CreateRoomRequestSchema to shared/src/schemas
  - [x] Add CreateRoomResponseSchema to shared/src/schemas
  - [x] Add RoomSchema for full room state
  - [x] Export types and schemas via barrel files

## Dev Notes

### Critical Architecture Requirements

**FR1 - Création partie avec pseudo Twitch:**
- Pseudo Twitch obligatoire (validation 3-20 caractères)
- Utilisé pour identification et génération avatar par défaut

**FR2 - Configuration paramètres jeu:**
- Battle duration: 10-120 sec (default 30)
- Cooldown: 5-60 sec (default 10)
- Modifiables dans le lobby (Story 2.6) avant le lancement

**FR3 - Code partie unique:**
- Format: 6-10 caractères alphanumériques uppercase (exclure I, O, 0, 1 pour lisibilité)
- Unique et vérifiable

**AR7 - Per-Room Immutable Config:**
- Config définie à la création, modifiable dans lobby, immutable après start

**AR8/AR9 - Validation & Error Handling:**
- Frontend: `safeParse()` pour UX immédiat
- Backend: `parse()` + global error handler existant dans `server.ts`
- Utiliser `ValidationError`, `GameError`, `NotFoundError` de `shared/errors`

### Stores Used in This Story

```typescript
// frontend/src/stores/ - STORES USED:

// lobbyStore.ts - Pour état du lobby et données de la room créée
import { useLobbyStore } from '@/stores/lobbyStore'
const lobbyStore = useLobbyStore()
lobbyStore.enterLobby({ roomCode, roomId, creator }) // Stocke les données après création
lobbyStore.exitLobby() // Nettoie les données au départ

// NOTE: gameStore, playerStore, websocketStore seront utilisés dans Story 2.3+
// pour la synchronisation temps réel avec d'autres joueurs
```

### Shared Package Import Patterns

```typescript
// CORRECT - Import types from shared
import type { Player, Game, GameConfig } from 'shared/types'
import { PlayerSchema, GameConfigSchema } from 'shared/schemas'
import { ValidationError, GameError, NotFoundError } from 'shared/errors'

// INCORRECT - Never use relative paths to shared
import { Player } from '../../../shared/src/types/player' // NO!
```

### API Contract

**POST /api/rooms**

Request:
```json
{
  "creatorPseudo": "SamStreamer",
  "config": { "battleDuration": 30, "cooldownBetweenActions": 10 }
}
```

Response 201:
```json
{
  "roomCode": "VENDETTA",
  "roomId": "uuid",
  "creator": { "id": "uuid", "pseudo": "SamStreamer", "color": "#00F5FF", "avatarUrl": "data:image/svg..." }
}
```

Error 400 (format standardisé):
```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid data", "details": [...] }
}
```

### Default Avatar Generation

**Décision:** Avatar par défaut généré côté backend (pas de Twitch API pour MVP).

```typescript
// backend/src/utils/avatarGenerator.ts
const PLAYER_COLORS = ['#FF3B3B', '#00F5FF', '#FFE500', '#00FF7F', '#FF00FF', '#9D4EDD', '#FF6B35', '#00FFA3']

function generateDefaultAvatar(pseudo: string, colorIndex: number): string {
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]
  const letter = pseudo.charAt(0).toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70">
      <circle cx="35" cy="35" r="35" fill="${color}"/>
      <text x="35" y="45" text-anchor="middle" fill="#0a0a0a" font-size="32" font-weight="bold">${letter}</text>
    </svg>`
  )}`
}
```

### Room Code Generation

```typescript
// backend/src/utils/codeGenerator.ts
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude I, O, 0, 1

export function generateRoomCode(length = 6): string {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}
```

### Lobby Route Guard Pattern

```typescript
// frontend/src/router/index.ts
{
  path: '/lobby/:roomCode',
  name: 'lobby',
  component: () => import('@/views/LobbyView.vue'),
  beforeEnter: async (to) => {
    try {
      const exists = await api.checkRoomExists(to.params.roomCode as string)
      if (!exists) {
        return { name: 'home', query: { error: 'room-not-found' } }
      }
    } catch {
      return { name: 'home', query: { error: 'connection-error' } }
    }
  }
}
```

### Backend Error Handler (EXISTING in server.ts)

Le global error handler existe déjà - utiliser les custom error classes:
```typescript
// Dans routes/rooms.ts
import { ValidationError, NotFoundError } from 'shared/errors'

// Zod validation error → ValidationError
if (error instanceof z.ZodError) {
  throw new ValidationError('Invalid room data', error.errors)
}

// Room not found → NotFoundError
if (!room) {
  throw new NotFoundError('Room not found', { roomCode })
}
```

### Previous Story Learnings (Story 1-4)

- UI components: `import { Button, Card, Input, Container, PageLayout } from '@/components/ui'`
- Input has `error` prop (boolean) and `errorMessage` prop (string)
- Use `@` alias for src folder
- Vue Router has lazy loading with `lazyLoad()` wrapper and error fallback
- 404 catch-all route exists, redirects to home

### Project Structure

**CREATE:**
```
backend/src/routes/rooms.ts           # POST /api/rooms, GET /api/rooms/:code/exists
backend/src/managers/RoomManager.ts   # In-memory room storage
backend/src/utils/codeGenerator.ts    # Room code generation
backend/src/utils/avatarGenerator.ts  # Default avatar SVG

frontend/src/services/api.ts          # API client
frontend/src/views/LobbyView.vue      # Lobby placeholder
```

**MODIFY:**
```
backend/src/server.ts                 # Register rooms routes
frontend/src/router/index.ts          # Add /lobby/:roomCode with guard
frontend/src/views/CreateGameView.vue # Full form implementation
shared/src/schemas/index.ts           # Export room schemas
```

### Testing Checklist

- [x] Form displays with all inputs
- [x] Validation errors display for invalid inputs
- [x] POST /api/rooms creates room with unique code
- [x] GET /api/rooms/:code/exists returns correct boolean
- [x] Success navigates to /lobby/:roomCode
- [x] Invalid room code redirects to home with error
- [x] Lobby displays room code and creator avatar/pseudo
- [x] lobbyStore is updated correctly (enterLobby/exitLobby)
- [x] Build passes (npm run build)

### References

- [FR1-FR3] Game creation requirements
- [AR7-AR10] Architecture patterns (config, validation, errors, REST)
- [UXR7] Error handling UX
- [Project Context] `_bmad-output/project-context.md`
- [Existing Stores] `frontend/src/stores/` - gameStore, playerStore, lobbyStore
- [Error Classes] `shared/src/errors/` - ValidationError, GameError, NotFoundError

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Backend build passed
- Frontend build passed
- API endpoints tested: POST /api/rooms (201), GET /api/rooms/:code/exists (200)

### Completion Notes List

- All 8 tasks completed successfully
- Game creation form with Zod validation implemented
- REST API with room creation and exists check endpoints
- RoomManager singleton with in-memory storage and TTL cleanup
- Default SVG avatar generator using player colors
- API client service with typed fetch functions
- Lobby route with beforeEnter guard validation
- Shared schemas and types properly separated

### Change Log

- 2026-01-08: Initial implementation of all tasks (Story 2.1)
- 2026-01-08: Code review #1 fixes - Pino logger, Pinia stores instead of sessionStorage, GameError, network error handling, copy feedback
- 2026-01-08: Code review #2 - Documentation fixes, story marked done

### File List

**Created:**
- backend/src/routes/rooms.ts
- backend/src/managers/RoomManager.ts
- backend/src/utils/codeGenerator.ts
- backend/src/utils/avatarGenerator.ts
- backend/src/utils/logger.ts (standalone Pino logger)
- frontend/src/services/api.ts (API client with network error handling)
- frontend/src/views/LobbyView.vue
- shared/src/schemas/room.ts
- shared/src/types/room.ts

**Modified:**
- backend/src/server.ts (registered room routes)
- frontend/src/views/CreateGameView.vue (full form + Pinia store integration)
- frontend/src/router/index.ts (added lobby route with guard)
- frontend/src/stores/lobbyStore.ts (added roomData state, enterLobby/exitLobby actions)
- shared/src/schemas/index.ts (exported room schemas)
- shared/src/types/index.ts (exported room types)

