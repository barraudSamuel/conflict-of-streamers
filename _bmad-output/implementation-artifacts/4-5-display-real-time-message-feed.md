# Story 4.5: Display Real-Time Message Feed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer participating via Twitch chat**,
I want **to see my pseudo appear in the message feed with visual validation**,
So that **I know my command was recognized (FR26-FR27)**.

## Acceptance Criteria

1. **Given** a battle is in progress
   **When** I send a valid command
   **Then** my pseudo appears in the message feed at the bottom right of the screen
   **And** my message has a green background indicating it was valid (FR27)

2. **Given** the message feed on screen
   **When** messages arrive from Twitch chat
   **Then** the feed displays a maximum of 10 messages (FIFO - oldest disappear)
   **And** the feed updates smoothly with animations (60 FPS - UXR4)

3. **Given** a high volume of Twitch messages during battle
   **When** the server broadcasts feed updates
   **Then** the feed is sampled at 10-15 msg/sec to maintain DOM performance (AR4)
   **And** the feed is positioned bottom right, left of the stats sidebar

4. **Given** an invalid command in Twitch chat
   **When** the command is detected (optional feature)
   **Then** the pseudo may appear with a red background as visual feedback
   **Note**: Invalid commands are silent by default (NFR10), red indicator is optional enhancement

5. **Given** the message feed component
   **When** rendering multiple messages
   **Then** each message displays:
   - Twitch username/displayName
   - Command type (ATTACK/DEFEND)
   - Colored indicator (green for valid, optionally red for invalid)
   - Smooth entry animation
   **And** newest messages appear at the bottom (chat UX convention)

## Tasks / Subtasks

- [x] Task 1: Extend BattleProgressEvent with recent commands (AC: 1, 3)
  - [x] Add `recentCommands` field to `BattleProgressEventSchema` in `shared/src/schemas/events.ts`
  - [x] Define `FeedMessageSchema` with: id, username, displayName, commandType, side, timestamp
  - [x] Export `FeedMessage` type from `shared/src/types/events.ts`
  - [x] Update `shared/src/types/index.ts` to export new type

- [x] Task 2: Backend - Extract recent commands in battle:progress (AC: 3)
  - [x] Modify `BattleCounter.ts` to add `getRecentCommands(limit: number)` method
  - [x] Track commands array with max 2000 entries (existing limit from Story 3.2 for leaderboard)
  - [x] In `server.ts` throttled broadcast callback, include `recentCommands` from BattleCounter
  - [x] Send only last 10 commands per broadcast (already throttled to 10/sec)

- [x] Task 3: Create MessageFeed.vue component (AC: 1, 2, 5)
  - [x] Create `frontend/src/components/battle/MessageFeed.vue`
  - [x] Accept props: `messages: FeedMessage[]`
  - [x] Display FIFO list with max 10 visible items
  - [x] Style: green background (#22c55e/success) for valid commands
  - [x] Style: attacker messages in red/coral tones, defender in blue tones
  - [x] Add entry animation (fade-in + slide from right, 60 FPS)
  - [x] Auto-scroll to newest message
  - [x] Streaming-optimized: 18px+ text, high contrast

- [x] Task 4: Update battleStore with feed tracking (AC: 1, 2)
  - [x] Add `feedMessages: ref<FeedMessage[]>([])` to battleStore
  - [x] Add `MAX_FEED_MESSAGES = 10` constant
  - [x] Modify `handleBattleProgress()` to extract and store recentCommands
  - [x] Implement FIFO: remove oldest when exceeding max
  - [x] Use IMMUTABLE updates (spread operator)
  - [x] Clear feed in `handleBattleEnd()`

- [x] Task 5: Integrate MessageFeed into BattleOverlay (AC: 3)
  - [x] Import `MessageFeed.vue` in `BattleOverlay.vue`
  - [x] Position feed at bottom right, left of any sidebar
  - [x] Pass `feedMessages` from battleStore as props
  - [x] Ensure layout doesn't overlap with progress bar or timer

- [x] Task 6: Handle feed in useGameSync (AC: 1)
  - [x] Ensure `handleBattleProgress` in battleStore receives full event including recentCommands
  - [x] Verify data flow from WebSocket → store → component

- [x] Task 7: Unit and integration tests
  - [x] Test BattleCounter.getRecentCommands() returns correct sliding window (10 tests added)
  - [ ] Test battleStore FIFO logic for feed messages (frontend test infra not configured)
  - [ ] Test MessageFeed.vue renders messages correctly (frontend test infra not configured)
  - [x] Full build passes (npm run build)
  - [x] Backend tests pass (npm run test:backend) - 125 tests passing

## Dev Notes

### Critical Architecture Requirements

**FR26 - Feed de messages temps réel:**
> Les joueurs voient un feed de messages en bas à droite affichant les commandes Twitch valides en cours

**FR27 - Validation visuelle:**
> Le système affiche visuellement les pseudos Twitch dans le feed avec un indicateur de validation (background vert)

**AR4 - Sampling for DOM performance:**
> Throttle broadcasts to 10-15 msg/sec to prevent UI lag

### Existing Infrastructure to Leverage

**BattleCounter Already Tracks Commands (Story 4.4):**
```typescript
// backend/src/managers/BattleCounter.ts
// Commands already stored per battle in battle.commands[] array
interface BattleCommand {
  type: 'ATTACK' | 'DEFEND'
  username: string
  displayName: string
  timestamp: number
}

// Already in place:
addCommand(battleId, command) // Stores command
getProgressData(battleId) // Returns forces + stats
```

**battle:progress Event Already Broadcasted:**
```typescript
// server.ts - Line 37-67
// Throttled at 100ms intervals (10/sec)
// Broadcasts to all room connections
```

**Frontend Flow Already Established (Story 4.4):**
```typescript
// useGameSync.ts handles BATTLE_EVENTS.PROGRESS
// battleStore.handleBattleProgress() updates state
// BattleOverlay.vue displays battle info
```

### New Event Enhancement: BattleProgressEvent

```typescript
// Extend shared/src/schemas/events.ts

export const FeedMessageSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  commandType: z.enum(['ATTACK', 'DEFEND']),
  side: z.enum(['attacker', 'defender']),
  timestamp: z.number()
})

// Extend existing BattleProgressEventSchema
export const BattleProgressEventSchema = z.object({
  battleId: z.string().uuid(),
  attackerForce: z.number().min(0),
  defenderForce: z.number().min(0),
  attackerMessages: z.number().min(0),
  defenderMessages: z.number().min(0),
  attackerUniqueUsers: z.number().min(0),
  defenderUniqueUsers: z.number().min(0),
  // NEW: Recent commands for feed display
  recentCommands: z.array(FeedMessageSchema).optional()
})
```

### MessageFeed Component Design

```vue
<!-- frontend/src/components/battle/MessageFeed.vue -->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { FeedMessage } from 'shared/types'

const props = defineProps<{
  messages: FeedMessage[]
}>()

const feedContainer = ref<HTMLElement | null>(null)

// Auto-scroll on new messages
watch(() => props.messages.length, async () => {
  await nextTick()
  if (feedContainer.value) {
    feedContainer.value.scrollTop = feedContainer.value.scrollHeight
  }
})
</script>

<template>
  <div
    ref="feedContainer"
    class="message-feed overflow-y-auto max-h-40 space-y-1"
  >
    <TransitionGroup name="feed">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item px-2 py-1 rounded text-sm"
        :class="[
          msg.side === 'attacker'
            ? 'bg-red-500/30 text-red-200'
            : 'bg-blue-500/30 text-blue-200'
        ]"
      >
        <span class="font-bold">{{ msg.displayName }}</span>
        <span class="ml-2 opacity-80">{{ msg.commandType }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.feed-enter-active {
  transition: all 0.2s ease-out;
}
.feed-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
</style>
```

### battleStore Enhancement

```typescript
// frontend/src/stores/battleStore.ts

const MAX_FEED_MESSAGES = 10

// Add to state
const feedMessages = ref<FeedMessage[]>([])

// Modify handleBattleProgress()
function handleBattleProgress(event: BattleProgressEvent): void {
  const battle = activeBattles.value.get(event.battleId)
  if (!battle) return

  // Existing force update (IMMUTABLE)
  activeBattles.value = new Map(activeBattles.value)
  activeBattles.value.set(event.battleId, {
    ...battle,
    forces: {
      attackerForce: event.attackerForce,
      defenderForce: event.defenderForce,
      attackerMessages: event.attackerMessages,
      defenderMessages: event.defenderMessages
    }
  })

  // NEW: Update feed messages (IMMUTABLE)
  if (event.recentCommands && event.recentCommands.length > 0) {
    // Merge new commands, avoiding duplicates
    const existingIds = new Set(feedMessages.value.map(m => m.id))
    const newMessages = event.recentCommands.filter(m => !existingIds.has(m.id))

    if (newMessages.length > 0) {
      const combined = [...feedMessages.value, ...newMessages]
      // FIFO: Keep only last MAX_FEED_MESSAGES
      feedMessages.value = combined.slice(-MAX_FEED_MESSAGES)
    }
  }
}

// Clear on battle end
function handleBattleEnd(event: BattleEndEvent): void {
  // ... existing logic ...
  feedMessages.value = [] // Clear feed
}
```

### Backend BattleCounter Enhancement

```typescript
// backend/src/managers/BattleCounter.ts

// Add to BattleStats interface
interface BattleStats {
  // ... existing fields ...
  commands: BattleCommand[]  // Already exists in current impl
  lastSentCommandIndex: number  // Track what we already sent
}

// New method
getRecentCommands(battleId: string, limit: number = 10): FeedMessage[] {
  const battle = this.battles.get(battleId)
  if (!battle) return []

  const start = Math.max(0, battle.commands.length - limit)
  const recent = battle.commands.slice(start)

  return recent.map((cmd, i) => ({
    id: `${battleId}-${start + i}`,
    username: cmd.username,
    displayName: cmd.displayName,
    commandType: cmd.type,
    side: cmd.type === 'ATTACK' ? 'attacker' : 'defender',
    timestamp: cmd.timestamp
  }))
}
```

### Layout Integration

```vue
<!-- In BattleOverlay.vue -->
<template>
  <div class="battle-overlay fixed inset-0 pointer-events-none">
    <!-- Existing content: attacker/defender info, timer, progress bar -->

    <!-- Message Feed - Bottom Right -->
    <div class="absolute bottom-4 right-4 w-64 pointer-events-auto">
      <MessageFeed :messages="feedMessages" />
    </div>
  </div>
</template>

<script setup lang="ts">
import MessageFeed from './MessageFeed.vue'
import { useBattleStore } from '@/stores/battleStore'
import { storeToRefs } from 'pinia'

const battleStore = useBattleStore()
const { feedMessages } = storeToRefs(battleStore)
</script>
```

### Project Structure Notes

**CREATE:**
```
frontend/src/components/battle/MessageFeed.vue
```

**MODIFY:**
```
shared/src/schemas/events.ts (add FeedMessageSchema, extend BattleProgressEventSchema)
shared/src/types/events.ts (export FeedMessage type)
shared/src/types/index.ts (export FeedMessage)
backend/src/managers/BattleCounter.ts (add getRecentCommands method)
backend/src/server.ts (include recentCommands in progress broadcast)
frontend/src/stores/battleStore.ts (add feedMessages state, update handleBattleProgress)
frontend/src/components/battle/BattleOverlay.vue (integrate MessageFeed component)
```

### Previous Story Learnings (Story 4.4)

**Key Patterns to Follow:**
- All events use BATTLE_EVENTS constants from shared/types
- Pinia stores use IMMUTABLE updates (spread operators, new Map())
- Vue transitions for smooth animations
- Throttled broadcasts at 100ms intervals in server.ts
- Canvas renders on-demand via Vue watch for performance
- Error messages in French for user display

**BattleProgressBar Animation Pattern (60 FPS):**
```vue
<!-- Already implemented smooth transitions -->
<style>
.progress-bar {
  transition: width 0.15s ease-out;
}
</style>
```

**WebSocket Event Pattern (server.ts):**
```typescript
// Throttled broadcast - reuse existing pattern
const throttledBroadcast = new Map<string, number>()
const THROTTLE_MS = 100 // 10 updates/sec

function shouldBroadcast(battleId: string): boolean {
  const now = Date.now()
  const last = throttledBroadcast.get(battleId) ?? 0
  if (now - last >= THROTTLE_MS) {
    throttledBroadcast.set(battleId, now)
    return true
  }
  return false
}
```

### Edge Cases to Handle

**1. Empty messages array:**
- Component should render empty state gracefully
- No errors if recentCommands is undefined or empty

**2. Duplicate messages across broadcasts:**
- Use message IDs to prevent duplicates
- ID format: `${battleId}-${commandIndex}`

**3. Battle ends while messages arriving:**
- Clear feedMessages in handleBattleEnd()
- Ignore late-arriving progress events for ended battles

**4. High message volume:**
- FIFO limits protect DOM performance
- Backend already throttles to 10/sec (AR4)

**5. Layout responsive:**
- Fixed positioning at bottom-right
- Width constrained (w-64 = 256px)
- Max height with overflow scroll

### Testing Checklist

**Unit Tests:**
- [ ] BattleCounter.getRecentCommands() returns correct slice
- [ ] Message IDs are unique and sequential
- [ ] battleStore feedMessages FIFO works correctly
- [ ] Duplicates are filtered out

**Integration Tests:**
- [ ] Full flow: Twitch command → broadcast → store → component
- [ ] Messages appear with correct styling
- [ ] Animation triggers on new messages

**Manual Testing:**
- [ ] Feed appears at bottom-right during battle
- [ ] Messages slide in with animation
- [ ] Auto-scroll to newest message
- [ ] Green/red coloring based on command type
- [ ] Max 10 messages visible (FIFO)
- [ ] Feed clears when battle ends

### Dependencies on Other Stories

**Depends on:**
- Story 4.4: Dual Counting System - DONE (battle:progress event, BattleCounter)
- Story 4.3: Defend Territory When Attacked - DONE (BattleOverlay component)
- Story 4.2: Initiate Attack - DONE (battle:start event)
- Story 3.2: Parse Chat Commands - DONE (TwitchManager parsing)

**Provides to:**
- Story 4.8: Display Battle Summary (viewers see their participation recognized)

### Color Scheme Reference

```css
/* From design system (project-context.md) */
--color-background: #0a0a0a;
--color-grid: #1a1a1a;

/* For message feed */
.attacker { background: rgba(239, 68, 68, 0.3); } /* red-500/30 */
.defender { background: rgba(59, 130, 246, 0.3); } /* blue-500/30 */
.valid { background: rgba(34, 197, 94, 0.3); } /* green-500/30 */
```

### References

- [FR26] Feed de messages bas droite - epics.md#Story-4.5
- [FR27] Indicateur validation background vert - epics.md#Story-4.5
- [AR4] Échantillonnage 10-15 msg/sec - architecture.md
- [UXR4] Animations 60 FPS - architecture.md
- [NFR2] UI < 100ms feedback - architecture.md
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.5]
- [Source: _bmad-output/project-context.md#Dual-Counting-Pattern]
- [Source: _bmad-output/implementation-artifacts/4-4-implement-dual-counting-system-for-real-time-feedback.md]
- [Source: backend/src/managers/BattleCounter.ts]
- [Source: frontend/src/components/battle/BattleOverlay.vue]
- [Source: frontend/src/stores/battleStore.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - all tests passed

### Completion Notes List

- Story 4.5 completed successfully
- 125 backend tests passing (10 new tests for Story 4.5)
- All builds passing (shared, backend, frontend)
- MessageFeed component created with Vue 3 TransitionGroup for 60 FPS animations
- BattleCounter extended with getRecentCommands() for incremental feed updates
- battleStore enhanced with feedMessages state and FIFO logic
- Full data flow: Twitch → BattleCounter → server.ts → WebSocket → battleStore → MessageFeed.vue

### File List

**Created:**
- frontend/src/components/battle/MessageFeed.vue

**Modified:**
- shared/src/schemas/events.ts (FeedMessageSchema, BattleProgressEventSchema extended)
- shared/src/types/events.ts (FeedMessage type export)
- shared/src/types/index.ts (FeedMessage export)
- backend/src/managers/BattleCounter.ts (getRecentCommands method, lastSentCommandIndex)
- backend/src/managers/BattleCounter.test.ts (10 new tests for Story 4.5)
- backend/src/server.ts (include recentCommands in battle:progress broadcast)
- frontend/src/stores/battleStore.ts (feedMessages state, FIFO logic)
- frontend/src/components/battle/BattleOverlay.vue (MessageFeed integration)

**Note:** Git also shows uncommitted changes from prior stories (4.3, 4.4):
- frontend/src/components/game/GameMap.vue
- frontend/src/composables/useGameSync.ts
- frontend/src/views/GameView.vue
These are NOT part of Story 4.5 implementation.
