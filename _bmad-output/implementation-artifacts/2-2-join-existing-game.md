# Story 2.2: Join Existing Game

Status: done

## Story

As a **streamer (participant)**,
I want **to join an existing game by entering the game code and my Twitch pseudo**,
So that **I can participate in a game created by another streamer (FR4-FR5)**.

## Acceptance Criteria

1. **Given** I am on the home page
   **When** I click "Rejoindre une Partie"
   **Then** I am navigated to the join game form (route /join)

2. **Given** I am on the join game form
   **When** the form loads
   **Then** I can enter:
   - Game code (required, 6-10 uppercase alphanumeric)
   - My pseudo Twitch (required, 3-20 characters)

3. **Given** I have filled the form with a valid game code and pseudo
   **When** I submit the form
   **Then** I am added to the game lobby via REST API
   **And** I am redirected to the lobby view

4. **Given** I submit with a valid game code
   **When** I am added to the lobby
   **Then** a default avatar is generated using my assigned player color
   **And** I appear in the player list of the lobby

5. **Given** I submit with an invalid game code
   **When** the room doesn't exist
   **Then** I see a clear error message "Code de partie invalide" (UXR7)
   **And** the form is not cleared, allowing me to correct the code

6. **Given** I submit with a pseudo already used in the room
   **When** a player with the same pseudo exists
   **Then** I see a clear error message "Ce pseudo est déjà utilisé dans cette partie"
   **And** the form is not cleared

7. **Given** I submit the form with invalid data
   **When** validation fails on frontend
   **Then** I see clear error messages for each invalid field
   **And** the form is not submitted

8. **Given** the room is full (max 10 players)
   **When** I try to join
   **Then** I see a clear error message "La partie est complète"

## Tasks / Subtasks

- [x] Task 1: Create join game form UI (AC: 1, 2, 7)
  - [x] Convert JoinGameView.vue from placeholder to full form
  - [x] Add Input for game code (required, uppercase, 6-10 chars)
  - [x] Add auto-uppercase transformation on code input
  - [x] Add Input for pseudo Twitch (required, 3-20 chars)
  - [x] Add form validation with Zod safeParse() on frontend
  - [x] Add loading state during form submission
  - [x] Display validation errors clearly with Input error state

- [x] Task 2: Create REST API endpoint for joining game (AC: 3, 5, 6, 8)
  - [x] Add POST /api/rooms/:code/join endpoint to backend/src/routes/rooms.ts
  - [x] Implement JoinRoomRequestSchema in shared/src/schemas/room.ts
  - [x] Validate room exists (return 404 if not)
  - [x] Validate pseudo is unique in the room (return 409 if duplicate)
  - [x] Validate room is not full (max 10 players) (return 409 if full)
  - [x] Add player to room with generated avatar and assigned color
  - [x] Return player data and room state in response
  - [x] Add Pino logging for join events

- [x] Task 3: Extend RoomManager for player management (AC: 3, 4)
  - [x] Add addPlayer() method to RoomManager
  - [x] Assign next available color from PLAYER_COLORS (8 colors, cycling if >8)
  - [x] Check pseudo uniqueness within room
  - [x] Check max player count (10)
  - [x] Generate default avatar using avatarGenerator
  - [x] Return added player with full data

- [x] Task 4: Add shared types and schemas for join (AC: 3)
  - [x] Add JoinRoomRequestSchema to shared/src/schemas/room.ts
  - [x] Add JoinRoomResponseSchema to shared/src/schemas/room.ts
  - [x] Export types via barrel files

- [x] Task 5: Extend API client service (AC: 3)
  - [x] Add joinRoom() function to frontend/src/services/api.ts
  - [x] Handle 404 (room not found), 409 (pseudo taken / room full) errors
  - [x] Return typed error messages for UI display

- [x] Task 6: Implement form submission and navigation (AC: 3, 4)
  - [x] Wire form submission to API client
  - [x] On success, store player and room data in lobbyStore (Pinia)
  - [x] Navigate to /lobby/:roomCode route
  - [x] Handle and display API errors (room not found, pseudo taken, room full)

- [x] Task 7: Update lobby route guard for joiners (AC: 3)
  - [x] Ensure beforeEnter guard works for joined players
  - [x] Verify lobbyStore has data before allowing access
  - [x] If no store data and room exists, redirect to /join with roomCode prefilled

## Dev Notes

### Critical Architecture Requirements

**FR4 - Rejoindre partie avec code + pseudo:**
- Code de partie: 6-10 caractères uppercase alphanumériques
- Pseudo Twitch: 3-20 caractères (mêmes règles que création)
- Validation côté frontend (UX) ET backend (sécurité)

**FR5 - Avatar automatique:**
- Avatar généré avec couleur assignée (même système que création)
- Couleur = prochaine disponible dans PLAYER_COLORS (cycle si >8 joueurs)

**AR8/AR9 - Validation & Error Handling:**
- Frontend: `safeParse()` pour UX immédiat (comme Story 2-1)
- Backend: `parse()` + custom error classes
- Utiliser `ValidationError`, `NotFoundError`, `GameError` de `shared/errors`

**UXR7 - Error Handling UX:**
- Messages d'erreur clairs et spécifiques
- Formulaire non vidé en cas d'erreur (permet correction)
- Loading state pendant soumission

### Previous Story Intelligence (Story 2-1)

**Learnings à appliquer:**
- UI components: `import { Button, Card, Input, Container, PageLayout } from '@/components/ui'`
- Input a `error` prop (boolean) et `errorMessage` prop (string)
- Utiliser `@` alias pour src folder
- lobbyStore: utiliser `enterLobby({ roomCode, roomId, player, players })` pour stocker les données
- API client pattern: retourner `{ success, data, error }` pour gestion d'erreur typée

**Fichiers créés dans Story 2-1:**
- `backend/src/routes/rooms.ts` - À ÉTENDRE avec POST /api/rooms/:code/join
- `backend/src/managers/RoomManager.ts` - À ÉTENDRE avec addPlayer()
- `backend/src/utils/avatarGenerator.ts` - RÉUTILISER generateDefaultAvatar()
- `frontend/src/services/api.ts` - À ÉTENDRE avec joinRoom()
- `shared/src/schemas/room.ts` - À ÉTENDRE avec JoinRoomRequestSchema

**Pattern d'erreur API (Story 2-1):**
```typescript
// frontend/src/services/api.ts pattern existant
export async function createRoom(data: CreateRoomRequest): Promise<ApiResult<CreateRoomResponse>> {
  try {
    const response = await fetch('/api/rooms', { ... })
    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.error }
    }
    return { success: true, data: await response.json() }
  } catch (error) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Erreur de connexion' } }
  }
}
```

### API Contract

**POST /api/rooms/:code/join**

Request:
```json
{
  "pseudo": "LeaStream"
}
```

Response 200:
```json
{
  "player": {
    "id": "uuid",
    "pseudo": "LeaStream",
    "color": "#FFE500",
    "avatarUrl": "data:image/svg...",
    "isCreator": false,
    "isReady": false
  },
  "room": {
    "roomCode": "VENDETTA",
    "roomId": "uuid",
    "players": [
      { "id": "uuid", "pseudo": "SamStreamer", "color": "#00F5FF", "avatarUrl": "...", "isCreator": true },
      { "id": "uuid", "pseudo": "LeaStream", "color": "#FFE500", "avatarUrl": "...", "isCreator": false }
    ],
    "config": { "battleDuration": 30, "cooldownBetweenActions": 10 }
  }
}
```

Error 404 (room not found):
```json
{
  "error": { "code": "NOT_FOUND", "message": "Room not found" }
}
```

Error 409 (pseudo taken):
```json
{
  "error": { "code": "PSEUDO_TAKEN", "message": "Ce pseudo est déjà utilisé dans cette partie" }
}
```

Error 409 (room full):
```json
{
  "error": { "code": "ROOM_FULL", "message": "La partie est complète (max 10 joueurs)" }
}
```

### Shared Schemas à Créer

```typescript
// shared/src/schemas/room.ts - À AJOUTER

export const JoinRoomRequestSchema = z.object({
  pseudo: z.string().min(3).max(20)
})

export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>

export const JoinRoomResponseSchema = z.object({
  player: PlayerInRoomSchema,
  room: RoomStateSchema
})

export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>
```

### RoomManager Extension

```typescript
// backend/src/managers/RoomManager.ts - À AJOUTER

addPlayer(roomCode: string, pseudo: string): Player {
  const room = this.getRoom(roomCode)
  if (!room) {
    throw new NotFoundError('Room not found', { roomCode })
  }

  // Check pseudo uniqueness
  if (room.players.some(p => p.pseudo.toLowerCase() === pseudo.toLowerCase())) {
    throw new GameError('PSEUDO_TAKEN', 'Ce pseudo est déjà utilisé dans cette partie')
  }

  // Check max players
  if (room.players.length >= 10) {
    throw new GameError('ROOM_FULL', 'La partie est complète (max 10 joueurs)')
  }

  // Assign color (cycle through 8 colors)
  const colorIndex = room.players.length
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]

  // Generate avatar
  const avatarUrl = generateDefaultAvatar(pseudo, colorIndex)

  const player: Player = {
    id: crypto.randomUUID(),
    pseudo,
    color,
    avatarUrl,
    isCreator: false,
    isReady: false
  }

  room.players.push(player)
  logger.info({ roomCode, playerId: player.id, pseudo }, 'Player joined room')

  return player
}
```

### Frontend Form Pattern (Comme Story 2-1)

```typescript
// frontend/src/views/JoinGameView.vue - Structure

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Input, Container, PageLayout } from '@/components/ui'
import { useLobbyStore } from '@/stores/lobbyStore'
import { JoinRoomRequestSchema } from 'shared/schemas'
import * as api from '@/services/api'

const router = useRouter()
const lobbyStore = useLobbyStore()

const roomCode = ref('')
const pseudo = ref('')
const isLoading = ref(false)
const errors = ref<{ roomCode?: string; pseudo?: string; api?: string }>({})

// Auto-uppercase room code
const handleCodeInput = (value: string) => {
  roomCode.value = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const handleSubmit = async () => {
  errors.value = {}

  // Frontend validation
  const result = JoinRoomRequestSchema.safeParse({ pseudo: pseudo.value })
  if (!result.success) {
    // Map errors...
    return
  }

  // Validate room code format
  if (roomCode.value.length < 6 || roomCode.value.length > 10) {
    errors.value.roomCode = 'Le code doit contenir 6 à 10 caractères'
    return
  }

  isLoading.value = true
  const response = await api.joinRoom(roomCode.value, { pseudo: pseudo.value })
  isLoading.value = false

  if (!response.success) {
    // Handle specific errors
    if (response.error.code === 'NOT_FOUND') {
      errors.value.roomCode = 'Code de partie invalide'
    } else if (response.error.code === 'PSEUDO_TAKEN') {
      errors.value.pseudo = response.error.message
    } else if (response.error.code === 'ROOM_FULL') {
      errors.value.api = response.error.message
    } else {
      errors.value.api = response.error.message
    }
    return
  }

  // Success - store and navigate
  lobbyStore.enterLobby({
    roomCode: roomCode.value,
    roomId: response.data.room.roomId,
    currentPlayer: response.data.player,
    players: response.data.room.players,
    config: response.data.room.config
  })

  router.push({ name: 'lobby', params: { roomCode: roomCode.value } })
}
</script>
```

### lobbyStore Extension

```typescript
// frontend/src/stores/lobbyStore.ts - À VÉRIFIER/ÉTENDRE

// Le store existant de Story 2-1 stocke roomData
// Ajouter currentPlayer séparé si nécessaire:
const currentPlayer = ref<Player | null>(null)

function enterLobby(data: {
  roomCode: string
  roomId: string
  currentPlayer: Player
  players: Player[]
  config: GameConfig
}) {
  roomData.value = {
    roomCode: data.roomCode,
    roomId: data.roomId,
    config: data.config
  }
  currentPlayer.value = data.currentPlayer
  players.value = data.players
}
```

### Project Structure Changes

**MODIFY:**
```
backend/src/routes/rooms.ts           # Add POST /api/rooms/:code/join
backend/src/managers/RoomManager.ts   # Add addPlayer(), check pseudo/max
frontend/src/views/JoinGameView.vue   # Full form implementation
frontend/src/services/api.ts          # Add joinRoom()
frontend/src/stores/lobbyStore.ts     # Extend for current player
shared/src/schemas/room.ts            # Add JoinRoomRequestSchema
shared/src/types/room.ts              # Add JoinRoomRequest type
```

### Testing Checklist

- [ ] Form displays with code and pseudo inputs
- [ ] Code input auto-uppercases and filters invalid chars
- [ ] Validation errors display for invalid inputs
- [ ] POST /api/rooms/:code/join adds player to room
- [ ] 404 returned for non-existent room code
- [ ] 409 returned for duplicate pseudo
- [ ] 409 returned for full room (10 players)
- [ ] Success navigates to /lobby/:roomCode
- [ ] Joined player appears in lobby player list
- [ ] lobbyStore is updated with current player
- [ ] Avatar generated with correct color
- [ ] Build passes (npm run build)

### References

- [FR4-FR5] Join game requirements
- [AR8-AR10] Architecture patterns (validation, errors, REST)
- [UXR7] Error handling UX
- [Project Context] `_bmad-output/project-context.md`
- [Previous Story] `2-1-create-game-with-configuration.md` - patterns à réutiliser
- [Error Classes] `shared/src/errors/` - ValidationError, GameError, NotFoundError

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Shared package build: PASS
- Backend build: PASS
- Frontend build: PASS

### Completion Notes List

- All 7 tasks completed successfully
- Join game form with auto-uppercase code input and Zod validation
- REST API endpoint POST /api/rooms/:code/join with proper error handling (404, 409)
- RoomManager extended with addPlayer() method supporting max 10 players and pseudo uniqueness
- Shared schemas for JoinRoomRequest/Response with PlayerInRoom and RoomState
- API client extended with joinRoom() function
- lobbyStore extended with enterLobbyAsJoiner() and new getters (currentPlayer, players, config, isCreator)
- Router guard enhanced to check lobbyStore data and redirect to /join with code prefilled if needed
- GameError class enhanced to support custom error codes (PSEUDO_TAKEN, ROOM_FULL)

### Code Review Fixes Applied

**HIGH fixes:**
- [x] Added room status validation in addPlayer() - can only join rooms in 'lobby' status
- [x] Added room code format validation in backend routes using exported ROOM_CODE_REGEX

**MEDIUM fixes:**
- [x] Fixed duplicate avatar generation in createRoom() - now reuses computed values
- [x] Added clear documentation for GameError status code patterns (400 vs 409)
- [x] Fixed room cleanup logic - empty rooms: 30min TTL, active rooms: 2h TTL

**LOW fixes:**
- [x] Exported ROOM_CODE_REGEX from shared and imported in frontend (removed duplication)
- [x] Added trim() to roomCode input handling
- [x] Changed NotFoundError message to French for consistency

### Change Log

- 2026-01-08: Initial implementation of all tasks (Story 2.2)
- 2026-01-08: Code review fixes applied (2 HIGH, 4 MEDIUM, 3 LOW issues fixed)

### File List

**Modified:**
- shared/src/errors/index.ts (GameError overload for custom codes)
- shared/src/schemas/room.ts (JoinRoomRequestSchema, JoinRoomResponseSchema, PlayerInRoomSchema, RoomStateSchema)
- shared/src/schemas/index.ts (export new schemas)
- shared/src/types/room.ts (JoinRoomRequest, JoinRoomResponse, PlayerInRoom, RoomState types)
- shared/src/types/index.ts (export new types)
- backend/src/managers/RoomManager.ts (addPlayer method, players array in RoomWithMeta)
- backend/src/routes/rooms.ts (POST /api/rooms/:code/join endpoint)
- frontend/src/services/api.ts (joinRoom function)
- frontend/src/stores/lobbyStore.ts (enterLobbyAsJoiner, currentPlayer, players, config, isCreator)
- frontend/src/views/JoinGameView.vue (full form implementation)
- frontend/src/router/index.ts (enhanced lobby guard for joiners)

