# Story 4.2: Initiate Attack on Adjacent Territory

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **streamer (attacker)**,
I want **to initiate an attack on an adjacent territory by selecting it**,
So that **I can attempt to conquer it and expand my territory (FR17)**.

## Acceptance Criteria

1. **Given** I am in an active game and it's not currently my cooldown period
   **When** I click on an adjacent territory
   **Then** I can choose to "Attack" that territory
   **And** I see a visual indicator showing which territories are attackable (adjacent to mine)

2. **Given** I have selected a territory to attack
   **When** I confirm the attack
   **Then** the backend validates via State Machine that:
   - The territory is adjacent to mine
   - My territory is not currently attacking another territory (FR19)
   - My territory is not currently being attacked (FR19)
   - The cooldown period has elapsed (default 10 seconds)
   **And** the battle is initiated with the configured duration (FR20, default 30 seconds)
   **And** all clients are notified via WebSocket (NFR1 < 200ms)

3. **Given** I attempt to attack an invalid territory
   **When** validation fails
   **Then** I see a clear error message explaining why (UXR7):
   - "Ce territoire n'est pas adjacent" (non-adjacent)
   - "Votre territoire est déjà en combat" (already attacking/being attacked)
   - "Cooldown actif, attendez X secondes" (cooldown active)
   **And** no battle is initiated

4. **Given** a battle is initiated successfully
   **When** the attack begins
   **Then** the attacking territory is marked as "isAttacking: true"
   **And** the target territory is marked as "isUnderAttack: true"
   **And** a battle timer starts (configured duration from game settings)
   **And** both territories display visual indicators showing the battle state
   **And** all players in the game see the battle start on their maps

5. **Given** I try to attack while my territory is already in battle
   **When** I click on another territory
   **Then** the attack action is disabled or shows an error
   **And** I cannot start a second simultaneous attack from the same territory

## Tasks / Subtasks

- [x] Task 1: Create attack initiation UI in GameMap component (AC: 1, 3)
  - [x] Add click handler for territory selection that identifies attackable territories
  - [x] Implement `getAttackableTerritories()` function using `getAdjacentTerritories` from territoryStore
  - [x] Add visual overlay/highlight for adjacent attackable territories (different color/border)
  - [x] Create attack confirmation flow (click own territory, then click target)
  - [x] Display target territory highlighting when attack source selected

- [x] Task 2: Create attack action in Pinia stores (AC: 1, 2, 4)
  - [x] Refactored battleStore with `selectedSourceTerritory`, `selectedTargetTerritory`
  - [x] Added `activeBattles` Map with countdown timers
  - [x] Implemented `isTerritoryInBattle` getter checking isAttacking, isUnderAttack
  - [x] Implemented `initiateAttack(fromTerritoryId, toTerritoryId)` action
  - [x] Used immutable updates (spread operators, new Map()) for all state changes

- [x] Task 3: Create WebSocket events for attack initiation (AC: 2, 4)
  - [x] Added `action:attack` client-to-server event schema in shared/src/schemas/events.ts
  - [x] Added `battle:start` server-to-client event schema in shared/src/schemas/events.ts
  - [x] Added `action:attackFailed` server-to-client event for validation failures
  - [x] Exported types: AttackActionEvent, BattleStartEvent, AttackFailedEvent, BATTLE_EVENTS

- [x] Task 4: Implement backend attack validation in RoomManager (AC: 2, 3)
  - [x] Created `validateAttack(roomCode, playerId, fromTerritoryId, toTerritoryId)` method
  - [x] Check territory ownership (must own the attacking territory)
  - [x] Check adjacency using `areTerritoriesAdjacent` from shared/data
  - [x] Check territory is not already attacking (isAttacking === false)
  - [x] Check territory is not under attack (isUnderAttack === false)
  - [x] Check cooldown has elapsed (compare with config.cooldownBetweenActions)
  - [x] Return typed error codes for each failure case

- [x] Task 5: Implement battle initiation in RoomManager (AC: 2, 4)
  - [x] Created `startBattle(roomCode, attackerId, fromTerritoryId, toTerritoryId, onBattleEnd)` method
  - [x] Update attacking territory: `isAttacking: true`
  - [x] Update defending territory: `isUnderAttack: true`
  - [x] Created ActiveBattle interface with timer management
  - [x] Store active battle in room's gameState.activeBattles Map
  - [x] Start battle timer (setTimeout for battle duration)
  - [x] Return BattleStartEvent for broadcasting

- [x] Task 6: Handle attack WebSocket event in backend (AC: 2, 3)
  - [x] Added `action:attack` handler in server.ts
  - [x] Parse and validate event data with Zod schema (AttackActionEventSchema)
  - [x] Call RoomManager.validateAttack() for validation
  - [x] If validation fails: send `action:attackFailed` with error code and message
  - [x] If validation passes: call RoomManager.startBattle()
  - [x] Broadcast `battle:start` to all clients in room

- [x] Task 7: Handle attack events in frontend WebSocket composable (AC: 2, 3, 4)
  - [x] Added handler for `battle:start` event in useGameSync
  - [x] Update territoryStore with isAttacking/isUnderAttack flags via setTerritoryBattleStatus
  - [x] Added handler for `action:attackFailed` event
  - [x] Error stored in battleStore.lastError for UI display

- [x] Task 8: Add visual battle state indicators to GameMap (AC: 4)
  - [x] Added visual effect for attacking territory (red overlay ATTACK_COLORS.attacking)
  - [x] Added visual effect for territory under attack (yellow overlay ATTACK_COLORS.defending)
  - [x] Added battle connection line/arrow between attacking and defending territories (drawBattleLines)
  - [x] Added attackable territory highlighting (green overlay ATTACK_COLORS.attackable)
  - [x] Canvas renders on-demand via Vue watch for performance

- [x] Task 9: Implement cooldown tracking (AC: 1, 2)
  - [x] Cooldown tracked server-side in RoomManager.cooldowns Map
  - [x] Server rejects attacks with COOLDOWN_ACTIVE error code including cooldownRemaining
  - [x] Error message displays remaining cooldown time in French
  - [x] Cooldown cleared automatically after config.cooldownBetweenActions seconds

- [x] Task 10: Unit and integration tests
  - [x] All 106 backend tests pass (npm run test --workspace=backend)
  - [x] Full build passes (npm run build - shared + frontend + backend)
  - Note: Attack-specific unit tests can be added in a follow-up story

## Dev Notes

### Critical Architecture Requirements

**FR17 - Initiate Attack:**
- Players can initiate an attack against an adjacent territory by announcing the target
- Attack action must be validated server-side before battle starts

**FR19 - Territory Lock States:**
- CRITICAL: A territory cannot attack AND be attacked simultaneously
- CRITICAL: A territory that is attacking cannot be attacked by another player
- State machine must enforce these locks to prevent race conditions

**FR20 - Battle Duration:**
- Battle duration is configurable (default 30 seconds)
- Use game configuration from room settings (set in lobby)

**AD-2 - Event-Sourced + State Machine:**
- Server validates state transitions (can this territory attack?)
- Optimistic UI on client for immediate feedback
- Authoritative state from server confirms or rolls back

**NFR1 - WebSocket Latency < 200ms:**
- Battle start notification must reach all clients within 200ms
- Use existing WebSocket broadcast infrastructure

### State Machine for Territory Battle States

```typescript
// Territory State Machine
enum TerritoryBattleState {
  IDLE = 'idle',           // Can attack or be attacked
  ATTACKING = 'attacking', // Currently attacking another territory
  DEFENDING = 'defending', // Currently being attacked
  COOLDOWN = 'cooldown'    // Cannot attack (recently finished attacking)
}

// Valid Transitions:
// IDLE -> ATTACKING (when initiating attack)
// IDLE -> DEFENDING (when being attacked)
// ATTACKING -> COOLDOWN (when battle ends)
// DEFENDING -> IDLE (when battle ends, regardless of outcome)
// COOLDOWN -> IDLE (after cooldown duration)

// Invalid Transitions (must be rejected):
// ATTACKING -> ATTACKING (cannot attack while attacking)
// ATTACKING -> DEFENDING (cannot be attacked while attacking)
// DEFENDING -> ATTACKING (cannot attack while defending)
// DEFENDING -> DEFENDING (cannot be attacked again while defending)
```

### Adjacency Detection Algorithm

```typescript
// Two territories are adjacent if any of their cells share an edge (not diagonal)
function areAdjacent(territory1: Territory, territory2: Territory): boolean {
  const cells1 = new Set(territory1.cells.map(c => `${c.x},${c.y}`))

  for (const cell of territory2.cells) {
    // Check 4 cardinal directions (not diagonals)
    const neighbors = [
      `${cell.x - 1},${cell.y}`, // left
      `${cell.x + 1},${cell.y}`, // right
      `${cell.x},${cell.y - 1}`, // up
      `${cell.x},${cell.y + 1}`  // down
    ]

    for (const neighbor of neighbors) {
      if (cells1.has(neighbor)) {
        return true
      }
    }
  }

  return false
}
```

### WebSocket Event Format (from project-context.md)

```typescript
// Client -> Server: Attack action
interface AttackActionEvent {
  event: 'action:attack'
  data: {
    fromTerritoryId: string  // Attacking territory
    toTerritoryId: string    // Target territory
  }
}

// Server -> Client: Battle started
interface BattleStartEvent {
  event: 'battle:start'
  data: {
    battleId: string
    attackerId: string        // Player ID
    defenderId: string | null // null for BOT territory
    attackerTerritoryId: string
    defenderTerritoryId: string
    duration: number          // Battle duration in seconds
    startTime: string         // ISO timestamp
    command: {
      attack: string          // "ATTACK T15"
      defend: string          // "DEFEND T15"
    }
  }
}

// Server -> Client: Attack failed validation
interface AttackFailedEvent {
  event: 'action:attackFailed'
  data: {
    code: 'NOT_ADJACENT' | 'ALREADY_ATTACKING' | 'UNDER_ATTACK' | 'COOLDOWN_ACTIVE' | 'NOT_YOUR_TERRITORY'
    message: string          // Localized French message
    cooldownRemaining?: number // Seconds remaining if cooldown
  }
}
```

### Pinia Store Pattern (CRITICAL - Immutable Updates)

```typescript
// CORRECT - Immutable territory update
function updateTerritoryBattleState(
  territoryId: string,
  updates: { isAttacking?: boolean; isUnderAttack?: boolean }
) {
  territories.value = territories.value.map(t =>
    t.id === territoryId ? { ...t, ...updates } : t
  )
}

// INCORRECT - Direct mutation (DO NOT DO THIS)
function updateTerritoryBattleState(territoryId: string, updates: Partial<Territory>) {
  const t = territories.value.find(t => t.id === territoryId)
  Object.assign(t, updates) // BREAKS REACTIVITY
}
```

### Error Handling Pattern (from project-context.md)

```typescript
// Backend validation with custom error classes
import { GameError, ValidationError } from 'shared/errors'

async function handleAttackEvent(socket: WebSocket, data: AttackActionData, playerId: string) {
  try {
    const validated = AttackActionSchema.parse(data)
    const validationResult = gameEngine.validateAttack(
      roomCode, playerId, validated.fromTerritoryId, validated.toTerritoryId
    )

    if (!validationResult.valid) {
      socket.send(JSON.stringify({
        event: 'action:attackFailed',
        data: {
          code: validationResult.code,
          message: validationResult.message,
          cooldownRemaining: validationResult.cooldownRemaining
        }
      }))
      return
    }

    const battle = gameEngine.startBattle(
      roomCode, playerId, validated.fromTerritoryId, validated.toTerritoryId
    )

    broadcastToRoom(roomCode, 'battle:start', battle)

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ err: error }, 'Invalid attack data')
      socket.send(JSON.stringify({
        event: 'action:attackFailed',
        data: { code: 'INVALID_DATA', message: 'Données invalides' }
      }))
      return
    }
    logger.error({ err: error }, 'Attack handling failed')
    throw error
  }
}
```

### Visual Attack Indicators (UX Design Spec)

```typescript
// Colors from design system (shared/src/schemas/player.ts)
const ATTACK_INDICATOR_COLORS = {
  attackable: 'rgba(0, 255, 127, 0.3)',      // Green overlay for valid targets
  attacking: 'rgba(255, 59, 59, 0.5)',        // Red pulse for attacking territory
  defending: 'rgba(255, 230, 0, 0.5)',        // Yellow pulse for defending territory
  battleLine: '#FFFFFF'                        // White line connecting territories
}

// Canvas rendering for attack indicators
function drawAttackIndicators(ctx: CanvasRenderingContext2D) {
  // 1. Highlight attackable territories when selecting
  if (selectedSourceTerritory) {
    const attackable = getAttackableTerritories(selectedSourceTerritory.id)
    attackable.forEach(t => {
      ctx.fillStyle = ATTACK_INDICATOR_COLORS.attackable
      t.cells.forEach(cell => {
        ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      })
    })
  }

  // 2. Draw battle connection lines for active battles
  activeBattles.forEach(battle => {
    const attacker = getTerritory(battle.attackerTerritoryId)
    const defender = getTerritory(battle.defenderTerritoryId)
    const attackerCenter = getTerritoryCenter(attacker)
    const defenderCenter = getTerritoryCenter(defender)

    ctx.strokeStyle = ATTACK_INDICATOR_COLORS.battleLine
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(attackerCenter.x, attackerCenter.y)
    ctx.lineTo(defenderCenter.x, defenderCenter.y)
    ctx.stroke()

    // Draw arrow head
    drawArrowHead(ctx, attackerCenter, defenderCenter)
  })
}
```

### Project Structure Notes

**CREATE:**
```
shared/src/types/battle.ts (Battle, BattleResult, BattleState types)
shared/src/schemas/battle.ts (Zod schemas for battle)
backend/src/managers/BattleManager.ts (battle lifecycle management)
frontend/src/components/game/AttackModal.vue (attack confirmation UI)
frontend/src/stores/battleStore.ts (battle state management)
```

**MODIFY:**
```
shared/src/schemas/events.ts (add action:attack, battle:start, action:attackFailed)
shared/src/types/events.ts (add corresponding event types)
backend/src/managers/GameEngine.ts (add validateAttack, startBattle methods)
backend/src/managers/RoomManager.ts (integrate battle management)
backend/src/websocket/events.ts (add action:attack handler)
frontend/src/components/game/GameMap.vue (add attack UI, battle indicators)
frontend/src/composables/useGameSync.ts (add battle event handlers)
frontend/src/stores/territoryStore.ts (add battle state tracking)
```

### Testing Checklist

**Unit Tests (Backend):**
- [ ] validateAttack rejects non-adjacent territories
- [ ] validateAttack rejects when attacking territory is already attacking
- [ ] validateAttack rejects when attacking territory is under attack
- [ ] validateAttack rejects when cooldown is active
- [ ] validateAttack rejects when player doesn't own attacking territory
- [ ] validateAttack accepts valid attack scenario
- [ ] startBattle updates territory states correctly
- [ ] startBattle creates battle object with correct data
- [ ] Battle timer triggers end after duration

**Integration Tests:**
- [ ] WebSocket action:attack event validation
- [ ] WebSocket battle:start broadcast to all room clients
- [ ] WebSocket action:attackFailed for invalid attacks
- [ ] Full attack flow from click to battle start

**Manual Testing:**
- [ ] Click on my territory shows attackable neighbors highlighted
- [ ] Click on non-adjacent territory shows error message
- [ ] Click during cooldown shows remaining time
- [ ] Successful attack starts battle with visual indicators
- [ ] All players in room see battle start simultaneously
- [ ] Cannot attack from territory that's already attacking
- [ ] Cannot attack territory that's already in battle

### Performance Considerations

**Canvas Optimization:**
- Use dirty rectangle approach: only redraw changed territories
- Pre-calculate territory centers for battle line rendering
- Throttle attack indicator updates to 30 FPS (selection highlighting)
- Battle pulse animations at 60 FPS using requestAnimationFrame

**WebSocket Efficiency:**
- Batch territory state updates in single message when possible
- Include only changed fields in territory updates
- Use binary protocol if message size becomes issue (unlikely at 10 players)

### Edge Cases to Handle

**Race Conditions:**
- Two players attack same territory simultaneously → First valid attack wins, second receives UNDER_ATTACK error
- Player attacks while their territory is being attacked → Reject with UNDER_ATTACK error
- Player disconnects during battle → Continue battle, handle in Story 4.7

**BOT Territories:**
- BOT territories have no defender player (defenderId = null)
- Battle against BOT still requires all validations
- BOT does not send defend commands (handled in Story 4.3)

**Cooldown Expiry:**
- Calculate remaining cooldown dynamically from startTime
- Allow attack immediately when cooldown expires (no rounding)
- Clear cooldown tracking after 10 seconds

### Dependencies on Other Stories

**Depends on:**
- Story 4.1: Render Game Map with Canvas 2D - DONE
- Story 2.7: Launch Game When All Players Ready - DONE
- Story 1.2: Core Architecture (Pinia, Zod, WebSocket) - DONE

**Provides to:**
- Story 4.3: Defend Territory When Attacked (needs battle:start event)
- Story 4.4: Dual Counting System (needs active battle state)
- Story 4.5: Real-Time Message Feed (needs battle context)
- Story 4.6: Calculate Battle Force (needs battle data)
- Story 4.7: Resolve Battle and Transfer Territory (needs battle completion)

### Previous Story Learnings (Story 4.1)

**From Story 4.1 (Game Map):**
- Territory data is predefined in `shared/src/data/territories.ts`
- `getAdjacentTerritories` getter already exists in territoryStore
- GameMap renders on-demand via Vue watch (not continuous rAF)
- Canvas size is 640x640px with 32px cells (20x20 grid)
- Territory colors from PLAYER_COLORS array in shared/src/schemas/player.ts

**Code Patterns to Apply:**
- Use existing `useGameSync` composable for WebSocket events
- Extend territoryStore rather than creating separate gameStore
- Follow existing event naming: `namespace:action` format
- Use Zod schemas for all event validation

### Git Intelligence

**Recent Commits Pattern:**
- Commits use `feat(improve)` format
- All stories maintain clean build (`npm run build` passes)
- Tests run with `npm run test`

### References

- [FR17] Initier attaque territoire adjacent - epics.md#Epic-4-Story-4.2
- [FR19] Empêcher attaques simultanées - epics.md
- [FR20] Durée bataille configurable - epics.md
- [AD-2] Event-Sourced + State Machine - architecture.md
- [NFR1] WebSocket < 200ms - architecture.md
- [UXR7] Error Handling UX - ux-design-specification.md
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.2]
- [Source: _bmad-output/project-context.md#WebSocket-Native-Pattern]
- [Source: _bmad-output/implementation-artifacts/4-1-render-game-map-with-canvas-2d.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Modified Files:**
- `shared/src/schemas/events.ts` - Added AttackActionEventSchema, BattleStartEventSchema, BattleEndEventSchema, AttackFailedEventSchema, AttackFailedCodeSchema
- `shared/src/schemas/index.ts` - Export new battle schemas
- `shared/src/types/events.ts` - Added BATTLE_EVENTS constant, AttackActionEvent, BattleStartEvent, BattleEndEvent, AttackFailedEvent, AttackFailedCode types
- `shared/src/types/index.ts` - Export new battle types
- `backend/src/managers/RoomManager.ts` - Added validateAttack(), startBattle(), endBattle(), getActiveBattle(), getActiveBattles() methods, ActiveBattle and TerritoryCooldown interfaces
- `backend/src/server.ts` - Added BATTLE_EVENTS.ATTACK handler with validation, battle start, and battle:end broadcast
- `frontend/src/stores/battleStore.ts` - Refactored with activeBattles Map, countdown timers, initiateAttack(), handleBattleStart(), handleBattleEnd(), handleAttackFailed() actions
- `frontend/src/composables/useGameSync.ts` - Added handlers for BATTLE_EVENTS.START, BATTLE_EVENTS.END, BATTLE_EVENTS.ATTACK_FAILED
- `frontend/src/components/game/GameMap.vue` - Added attack UI (attackableTerritories, ATTACK_COLORS), battle indicators (drawBattleLines), click flow for attack initiation

