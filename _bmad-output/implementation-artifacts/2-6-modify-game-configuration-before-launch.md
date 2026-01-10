# Story 2.6: Modify Game Configuration Before Launch

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **streamer (game creator)**,
I want **to modify game parameters in the lobby before launching the game**,
So that **I can adjust settings based on player feedback (FR6)**.

## Acceptance Criteria

1. **Given** I am the game creator in the lobby
   **When** I access game configuration
   **Then** I can modify:
   - Battle duration (configurable, default 30 seconds)
   - Cooldown between actions (configurable, default 10 seconds)
   **And** I see edit controls for these parameters

2. **Given** I am a non-creator player in the lobby
   **When** I view the game configuration
   **Then** I see the current configuration values
   **But** I cannot modify them (no edit controls visible)
   **And** I see changes made by the creator in real-time

3. **Given** I am the game creator
   **When** I save configuration changes
   **Then** all players in the lobby see the updated configuration in real-time via WebSocket
   **And** the changes are validated before saving (reasonable min/max limits)
   **And** the changes are persisted to the game state

4. **Given** the configuration has been modified
   **When** the game has started
   **Then** I cannot modify configuration anymore (AR7 - immutable during game)
   **And** edit controls are disabled/hidden

5. **Given** I am modifying the configuration
   **When** I enter invalid values (e.g., negative numbers, exceeding limits)
   **Then** I see immediate validation feedback (UXR7)
   **And** the save action is prevented until values are valid

6. **Given** I modify the configuration
   **When** changes are broadcast via WebSocket
   **Then** all clients receive the update within 200ms (NFR1)
   **And** the UI updates without page refresh

## Tasks / Subtasks

- [x] Task 1: Add configuration update WebSocket events (AC: 3, 6)
  - [x] Add `config:update` event to shared/types/events.ts (ClientToServer)
  - [x] Add `config:updated` event (ServerToClient) for broadcast
  - [x] Create ConfigUpdatePayload Zod schema with validation rules
  - [x] Define min/max limits for battleDuration (10-120 sec) and cooldownBetweenActions (5-60 sec)

- [x] Task 2: Update RoomManager to support configuration updates (AC: 3, 4)
  - [x] Add `updateConfig(roomCode: string, playerId: string, config: Partial<GameConfig>): boolean` method
  - [x] Verify player is room creator before allowing update
  - [x] Verify room status is 'lobby' (not 'playing' or 'ended')
  - [x] Apply validation on server-side with Zod parse()
  - [x] Update room.config with immutable pattern

- [x] Task 3: Add WebSocket handler for config updates (AC: 3, 6)
  - [x] Add `config:update` handler in backend/src/server.ts
  - [x] Validate request with Zod schema
  - [x] Call roomManager.updateConfig()
  - [x] Broadcast `config:updated` event to all room players
  - [x] Handle errors (not creator, invalid values, game started)

- [x] Task 4: Create EditableGameConfigCard component (AC: 1, 2, 5)
  - [x] Create `frontend/src/components/lobby/EditableGameConfigCard.vue`
  - [x] Display current config values (read from lobbyStore.config)
  - [x] Add number inputs for battleDuration and cooldownBetweenActions
  - [x] Show edit mode only for creator (use lobbyStore.isCreator)
  - [x] Add client-side validation with safeParse() for immediate feedback
  - [x] Add "Sauvegarder" button to submit changes
  - [x] Add visual feedback for validation errors (red border, error text)

- [x] Task 5: Update lobbyStore for config updates (AC: 3)
  - [x] Add `updateConfig(config: Partial<GameConfig>)` action
  - [x] Use immutable update pattern (spread operator)
  - [x] Ensure reactivity triggers UI update

- [x] Task 6: Add WebSocket handler in useLobbySync (AC: 3, 6)
  - [x] Add handler for `config:updated` event
  - [x] Call lobbyStore.updateConfig() with received data
  - [x] Log config update for debugging

- [x] Task 7: Update LobbyView to use EditableGameConfigCard (AC: 1, 2)
  - [x] Replace GameConfigCard with EditableGameConfigCard
  - [x] Pass isCreator prop to control edit mode
  - [x] Remove old GameConfigCard import

- [x] Task 8: Add config update to websocketStore (AC: 3)
  - [x] Using existing generic wsStore.send() method with CONFIG_EVENTS.UPDATE
  - [x] Format and send `config:update` WebSocket event

- [x] Task 9: Build verification and testing
  - [x] Run `npm run build:shared` - verify no TypeScript errors
  - [x] Run `npm run build:frontend` - verify no TypeScript errors
  - [x] Run `npm run build:backend` - verify no TypeScript errors
  - [ ] Manual test: Creator can edit config and see changes
  - [ ] Manual test: Non-creator sees config updates in real-time
  - [ ] Manual test: Validation prevents invalid values
  - [ ] Manual test: Config locked after game starts

## Dev Notes

### Critical Architecture Requirements

**AR7 - Per-Room Configuration:**
- Configuration is modifiable ONLY in lobby (status === 'lobby')
- Once game starts, config becomes immutable
- Config stored per-room in RoomManager

**AD-5 - Native WebSocket Protocol:**
- MUST use native WebSocket with `ws://` protocol
- Event format: `{ event: "namespace:action", data: {...} }`
- Use `config:update` and `config:updated` events

**FR6 - Modify parameters in lobby before launch:**
- Creator-only functionality
- Battle duration and cooldown configurable
- Real-time sync to all players

**NFR1 - WebSocket latency < 200ms:**
- Config updates broadcast immediately
- Optimistic UI not needed (simple update)

### Validation Rules

```typescript
// Validation constraints for GameConfig fields
const CONFIG_LIMITS = {
  battleDuration: {
    min: 10,   // 10 seconds minimum
    max: 120,  // 2 minutes maximum
    default: 30
  },
  cooldownBetweenActions: {
    min: 5,    // 5 seconds minimum
    max: 60,   // 1 minute maximum
    default: 10
  }
}
```

### WebSocket Event Format

```typescript
// Client -> Server
{
  event: "config:update",
  data: {
    battleDuration?: number,
    cooldownBetweenActions?: number
  }
}

// Server -> All Clients
{
  event: "config:updated",
  data: {
    battleDuration: number,
    cooldownBetweenActions: number
  }
}
```

### Existing Code Patterns (from Previous Stories)

**lobbyStore.ts (Story 2.3):**
```typescript
// Current config getter
const config = computed(() => roomData.value?.config ?? null)
const isCreator = computed(() => roomData.value?.currentPlayer?.isCreator ?? false)

// Pattern for immutable updates
function updateConfig(newConfig: Partial<GameConfig>) {
  if (!roomData.value) return
  roomData.value = {
    ...roomData.value,
    config: { ...roomData.value.config!, ...newConfig }
  }
}
```

**useLobbySync.ts event handler pattern:**
```typescript
// Existing pattern for handling WebSocket events
function handleWebSocketMessage(event: MessageEvent) {
  const { event: eventType, data } = JSON.parse(event.data)

  switch (eventType) {
    case 'config:updated':
      lobbyStore.updateConfig(data)
      break
    // ...other cases
  }
}
```

**RoomManager.ts (Story 2.5):**
```typescript
// Pattern for player/creator verification
const roomData = this.rooms.get(normalizedCode)
if (!roomData) return { success: false }

const player = roomData.players.find(p => p.id === playerId)
if (!player || !player.isCreator) return { success: false }

// Immutable config update
roomData.room.config = { ...roomData.room.config, ...newConfig }
roomData.room.updatedAt = new Date().toISOString()
roomData.lastActivity = new Date()
```

**Backend server.ts WebSocket handler pattern:**
```typescript
// Pattern for WebSocket event handling
socket.on('message', async (message) => {
  const { event, data } = JSON.parse(message.toString())

  switch (event) {
    case 'config:update':
      // Validate with Zod
      const validated = ConfigUpdateSchema.parse(data)
      // Update room
      const success = roomManager.updateConfig(roomCode, playerId, validated)
      if (success) {
        // Broadcast to room
        broadcastToRoom(roomCode, 'config:updated', roomManager.getRoomState(roomCode)?.config)
      }
      break
  }
})
```

### EditableGameConfigCard Component Structure

```vue
<!-- frontend/src/components/lobby/EditableGameConfigCard.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { GameConfig } from 'shared/types'
import { GameConfigSchema } from 'shared/schemas'
import { Card, Button } from '@/components/ui'
import { useWebSocketStore } from '@/stores/websocketStore'

const props = defineProps<{
  config: GameConfig | null
  isCreator: boolean
}>()

const wsStore = useWebSocketStore()

// Local edit state
const battleDuration = ref(props.config?.battleDuration ?? 30)
const cooldownBetweenActions = ref(props.config?.cooldownBetweenActions ?? 10)

// Validation state
const battleDurationError = ref('')
const cooldownError = ref('')

// Sync local state when props change (real-time updates from other source)
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    battleDuration.value = newConfig.battleDuration
    cooldownBetweenActions.value = newConfig.cooldownBetweenActions
  }
}, { immediate: true })

// Client-side validation
function validateBattleDuration(value: number): boolean {
  if (value < 10) {
    battleDurationError.value = 'Minimum 10 secondes'
    return false
  }
  if (value > 120) {
    battleDurationError.value = 'Maximum 120 secondes'
    return false
  }
  battleDurationError.value = ''
  return true
}

function validateCooldown(value: number): boolean {
  if (value < 5) {
    cooldownError.value = 'Minimum 5 secondes'
    return false
  }
  if (value > 60) {
    cooldownError.value = 'Maximum 60 secondes'
    return false
  }
  cooldownError.value = ''
  return true
}

const isValid = computed(() =>
  !battleDurationError.value && !cooldownError.value
)

function handleSave() {
  const bdValid = validateBattleDuration(battleDuration.value)
  const cdValid = validateCooldown(cooldownBetweenActions.value)

  if (bdValid && cdValid) {
    wsStore.sendConfigUpdate({
      battleDuration: battleDuration.value,
      cooldownBetweenActions: cooldownBetweenActions.value
    })
  }
}
</script>

<template>
  <Card :padding="'md'" class="animate-fade-in">
    <template #header>
      <h2 class="text-lg font-semibold text-white">
        Configuration de la partie
        <span v-if="isCreator" class="text-sm text-gray-400 ml-2">(Modifiable)</span>
      </h2>
    </template>

    <div class="grid grid-cols-2 gap-4 text-base">
      <!-- Battle Duration -->
      <div>
        <label class="text-gray-400 block mb-1">Duree des batailles</label>
        <div v-if="isCreator" class="flex items-center gap-2">
          <input
            v-model.number="battleDuration"
            type="number"
            min="10"
            max="120"
            class="w-20 px-2 py-1 bg-gray-800 border rounded text-white text-center"
            :class="battleDurationError ? 'border-danger' : 'border-gray-600'"
            @input="validateBattleDuration(battleDuration)"
          />
          <span class="text-white">secondes</span>
        </div>
        <p v-else class="text-xl text-white font-bold">{{ config?.battleDuration ?? 30 }}s</p>
        <p v-if="battleDurationError" class="text-sm text-danger mt-1">{{ battleDurationError }}</p>
      </div>

      <!-- Cooldown -->
      <div>
        <label class="text-gray-400 block mb-1">Cooldown entre actions</label>
        <div v-if="isCreator" class="flex items-center gap-2">
          <input
            v-model.number="cooldownBetweenActions"
            type="number"
            min="5"
            max="60"
            class="w-20 px-2 py-1 bg-gray-800 border rounded text-white text-center"
            :class="cooldownError ? 'border-danger' : 'border-gray-600'"
            @input="validateCooldown(cooldownBetweenActions)"
          />
          <span class="text-white">secondes</span>
        </div>
        <p v-else class="text-xl text-white font-bold">{{ config?.cooldownBetweenActions ?? 10 }}s</p>
        <p v-if="cooldownError" class="text-sm text-danger mt-1">{{ cooldownError }}</p>
      </div>
    </div>

    <!-- Save Button (creator only) -->
    <div v-if="isCreator" class="mt-4 flex justify-end">
      <Button
        variant="primary"
        size="sm"
        :disabled="!isValid"
        @click="handleSave"
      >
        Sauvegarder
      </Button>
    </div>
  </Card>
</template>
```

### Previous Story Learnings (Story 2.5)

From Story 2-5-territory-selection-on-grid.md:
- WebSocket events use `namespace:action` format (e.g., `territory:select`, `config:update`)
- RoomManager methods verify player exists before operations
- Pinia stores use immutable updates with spread operators
- useLobbySync handles WebSocket event routing
- Build verification: `npm run build:shared`, `npm run build:frontend`, `npm run build:backend`

### Code Review Fixes from Story 2.5

Applied patterns to follow:
- **HIGH-2: Render Loop** - No continuous loops, render on-demand via Vue watch
- **MEDIUM-3: Race Condition** - Add pending state guard for save action
- Use existing Card and Button components from `@/components/ui`

### Project Structure Notes

**CREATE:**
```
frontend/src/components/lobby/EditableGameConfigCard.vue
```

**MODIFY:**
```
shared/src/types/events.ts (add config events)
shared/src/schemas/events.ts (add ConfigUpdateSchema)
frontend/src/views/LobbyView.vue (swap GameConfigCard for EditableGameConfigCard)
frontend/src/stores/lobbyStore.ts (add updateConfig action)
frontend/src/stores/websocketStore.ts (add sendConfigUpdate method)
frontend/src/composables/useLobbySync.ts (add config:updated handler)
backend/src/server.ts (add config:update WebSocket handler)
backend/src/managers/RoomManager.ts (add updateConfig method)
```

### Testing Checklist

**Visual Verification:**
- [ ] Creator sees editable inputs for battleDuration and cooldownBetweenActions
- [ ] Non-creator sees read-only values (no inputs)
- [ ] Validation errors show immediately on invalid input
- [ ] Save button disabled when validation fails
- [ ] Config updates reflect in real-time for all players

**WebSocket Verification:**
- [ ] `config:update` event sent when creator saves
- [ ] `config:updated` broadcast received by all clients
- [ ] Non-creators cannot send config updates (server rejects)

**Edge Cases:**
- [ ] Invalid values rejected (< min, > max)
- [ ] Config update rejected when game has started
- [ ] Config update rejected when not creator
- [ ] Rapid updates don't cause race conditions

**Build Verification:**
- [ ] `npm run build:shared` passes
- [ ] `npm run build:frontend` passes
- [ ] `npm run build:backend` passes

### References

- [FR6] Creator can modify parameters in lobby before launch
- [AR7] Per-room configuration - immutable after game start
- [AD-5] Native WebSocket with namespace:action format
- [NFR1] WebSocket latency < 200ms
- [UXR7] Validation error feedback
- [Source: _bmad-output/planning-artifacts/architecture.md#AD-6]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.6]
- [Source: _bmad-output/project-context.md#WebSocket-Event-Naming]
- [Source: 2-5-territory-selection-on-grid.md#WebSocket-Events]
- [Source: 2-4-display-game-instructions-in-lobby.md#GameConfigCard]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Implemented full config:update/config:updated WebSocket event flow
- Created CONFIG_LIMITS constant with min/max validation rules for battleDuration (10-120s) and cooldownBetweenActions (5-60s)
- Added ConfigUpdateEventSchema and ConfigUpdatedEventSchema with Zod validation
- RoomManager.updateConfig() verifies: player is creator, room status is 'lobby', validates with Zod
- EditableGameConfigCard shows editable inputs for creator, read-only for others
- Client-side validation provides immediate UX feedback (error text, red border)
- Server-side validation ensures security (Zod parse in handler)
- useLobbySync handles config:updated events and syncs to lobbyStore
- All builds pass: shared, frontend, backend
- Follows immutable state update patterns per project conventions
- Pending state guard added to prevent race conditions on rapid saves

### Change Log

- 2026-01-10: Implemented Story 2.6 - Modify Game Configuration Before Launch
- 2026-01-10: Code Review - Fixed 6 issues (2 HIGH, 4 MEDIUM):
  - HIGH-1: Fixed unsafe non-null assertion in lobbyStore.updateConfig
  - HIGH-2: Fixed hardcoded magic values in useLobbySync (now uses DEFAULT_GAME_CONFIG)
  - MEDIUM-1: Updated story File List to include all modified files
  - MEDIUM-2: Added error handling for WebSocket send failures with user feedback
  - MEDIUM-3: Fixed fragile setTimeout by resetting isSaving on config:updated
  - MEDIUM-4: Consolidated duplicate CONFIG_LIMITS imports

### File List

**Created:**
- frontend/src/components/lobby/EditableGameConfigCard.vue

**Modified:**
- shared/src/schemas/events.ts (added CONFIG_LIMITS, ConfigUpdateEventSchema, ConfigUpdatedEventSchema)
- shared/src/schemas/game.ts (added DEFAULT_GAME_CONFIG constant)
- shared/src/schemas/index.ts (exported new schemas and DEFAULT_GAME_CONFIG)
- shared/src/types/events.ts (added types and CONFIG_EVENTS constant)
- shared/src/types/index.ts (exported new types)
- backend/src/managers/RoomManager.ts (added updateConfig method)
- backend/src/server.ts (added config:update WebSocket handler)
- frontend/src/stores/lobbyStore.ts (added updateConfig, syncConfig actions with null safety)
- frontend/src/composables/useLobbySync.ts (added config:updated handler with shared defaults)
- frontend/src/views/LobbyView.vue (replaced GameConfigCard with EditableGameConfigCard)
- _bmad-output/implementation-artifacts/sprint-status.yaml (updated story status)
