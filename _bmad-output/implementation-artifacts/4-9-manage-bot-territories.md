# Story 4.9: Manage BOT Territories

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **streamer**,
I want **to attack and conquer BOT territories (unowned/free zones)**,
So that **I can expand even if no player owns adjacent territories (FR38-FR40)**.

## Acceptance Criteria

1. **Given** there are BOT territories on the map (territories not owned by any player)
   **When** the game starts
   **Then** all territories not selected by players are marked as BOT territories
   **And** BOT territories are displayed in a distinct neutral color (grey/white from design system)
   **And** BOT territories have `ownerId: 'BOT'` in their state

2. **Given** I own a territory adjacent to a BOT territory
   **When** I click on the BOT territory
   **Then** I can initiate an attack against it
   **And** the battle starts with the same UI as player-vs-player battles
   **And** my viewers can send "ATTACK [territoire]" commands in Twitch chat

3. **Given** a battle is in progress against a BOT territory
   **When** the battle timer runs
   **Then** the BOT has no viewers defending (defense force = 0 viewers)
   **And** the BOT applies a baseline resistance based on territory size (FR40):
   - Small BOT territories: low resistance (bonus_territoire ~1.0)
   - Large BOT territories: higher resistance (bonus_territoire up to ~2.5)
   **And** the BOT resistance is calculated as: `BOT_Force = BOT_BASE_RESISTANCE * bonus_territoire`
   **And** the battle progress bar shows attacker vs BOT forces in real-time

4. **Given** a battle against a BOT territory has ended
   **When** the attacker's force exceeds the BOT's resistance
   **Then** the territory ownership transfers to the attacker (FR39)
   **And** the territory color changes to the attacker's neon color
   **And** the territory is no longer a BOT territory
   **And** the battle summary shows "Territoire conquis" as result

5. **Given** a battle against a BOT territory has ended
   **When** the attacker's force is less than or equal to the BOT's resistance
   **Then** the BOT territory remains unowned
   **And** the battle summary shows "Defense BOT reussie" as result
   **And** the attacker's territory enters cooldown period

6. **Given** the battle summary is displayed for a BOT battle
   **When** showing statistics
   **Then** only attacker stats are displayed (no defender stats)
   **And** BOT resistance value is shown instead of defender force
   **And** top 5 contributors list only includes attackers

7. **Given** a player disconnects during an active game (FR42 - prerequisite for Epic 5)
   **When** the disconnection is confirmed
   **Then** their territories become BOT territories
   **And** the territories change to neutral BOT color
   **And** this conversion is handled in Epic 5 (Story 5.6)

## Tasks / Subtasks

- [x] Task 1: Define BOT territory constants and types (AC: 1, 3)
  - [x] BOT_TERRITORY_COLOR constant added to shared/src/schemas/player.ts
  - [x] isBotTerritory() helper function in backend/src/utils/botResistance.ts (uses ownerId === null)
  - [x] calculateBotDefenderForce() in backend/src/utils/botResistance.ts
  - [x] Territory type already allows ownerId: string | null

- [x] Task 2: Initialize BOT territories on game start (AC: 1)
  - [x] getInitialTerritories() returns all territories with ownerId: null
  - [x] RoomManager.startGame() only sets ownerId for player-selected territories
  - [x] Unselected territories remain ownerId: null = BOT
  - [x] Game state broadcast includes BOT territories

- [x] Task 3: Render BOT territories with neutral color (AC: 1)
  - [x] BOT_TERRITORY_COLOR = '#4a4a4a' in design system
  - [x] GameMap.vue getTerritoryColor() returns BOT_TERRITORY_COLOR for ownerId === null
  - [x] BOT territories visually distinct with neutral grey color

- [x] Task 4: Enable attack on BOT territories (AC: 2)
  - [x] RoomManager.validateAttack() allows attacks on territories where ownerId !== playerId
  - [x] Adjacency check works for BOT territories (same logic)
  - [x] Territory lock states (isUnderAttack) work for BOT
  - [x] Frontend allows targeting BOT territories in GameMap.vue

- [x] Task 5: Implement BOT resistance calculation (AC: 3, 4, 5)
  - [x] calculateBotDefenderForce(size, defenseBonus) in backend/src/utils/botResistance.ts
  - [x] Formula: BOT_Force = BOT_BASE_FORCE × size_multiplier × defenseBonus
  - [x] Uses territory size for resistance multipliers (small=0.3, medium=0.5, large=0.8)
  - [x] BOT battles have 0 defender messages/uniqueUsers (no IRC participation)

- [x] Task 6: Handle battle resolution for BOT territories (AC: 4, 5)
  - [x] server.ts battle end handler applies isBotTerritory() check (lines 520-539)
  - [x] Uses calculateBotDefenderForce() for BOT territory resistance
  - [x] On win: updateTerritoryOwner() transfers ownership to attacker
  - [x] On loss: Territory remains ownerId: null, attacker enters cooldown
  - [x] battle:end event includes calculated defenderForce (BOT resistance)

- [x] Task 7: Adapt battle UI for BOT battles (AC: 2, 3, 6)
  - [x] BattleOverlay.vue shows "Territoire Libre" when defenderId is null (line 177)
  - [x] BattleProgressBar displays correct forces (including BOT resistance)
  - [x] Uses neutral color for BOT side in battle UI

- [x] Task 8: Update BattleSummary for BOT battles (AC: 6)
  - [x] BattleSummary.vue has isDefenderBot prop
  - [x] Handles defenderStats === null case (lines 211-232)
  - [x] Shows "TERRITOIRE CONQUIS" or "DEFENSE BOT REUSSIE" result text (lines 81-84)
  - [x] Top 5 only shows attackers when defenderStats is null

- [x] Task 9: Unit tests and integration verification
  - [x] 23 tests for botResistance.ts in backend/src/utils/botResistance.test.ts
  - [x] Tests cover calculateBotDefenderForce() with all territory sizes
  - [x] Tests cover isBotTerritory() helper
  - [x] Tests cover attacker win/loss scenarios vs BOT
  - [x] All 177 backend tests pass
  - [x] All 24 shared tests pass (territories)

## Dev Notes

### Critical Architecture Requirements

**FR38 - Gerer territoires BOT:**
> Le systeme gere des territoires BOT (libres) non possedes par des joueurs

**FR39 - Attaquer/conquerir territoires BOT:**
> Les joueurs peuvent attaquer et conquerir des territoires BOT

**FR40 - Resistance proportionnelle BOT:**
> Le systeme applique une resistance proportionnelle pour les territoires BOT

### BOT Territory Design

**Conceptual Model:**
- BOT territories = "free zones" not owned by any player
- Created at game start for all unselected territories
- Can be conquered by any adjacent player
- Provide passive resistance based on territory size (no viewer participation)
- Once conquered, become normal player territories

**BOT Resistance Formula:**
```typescript
// Based on existing inversed territorial stats (FR22)
// Large territories = higher attack bonus, lower defense bonus
// For BOT: we use the territory's bonus_territoire as resistance multiplier

const BOT_BASE_RESISTANCE = 50 // Configurable constant

function calculateBotResistance(territory: Territory): number {
  // bonus_territoire ranges from 1.0 (small) to 2.5 (large)
  // Small territories: 50 * 1.0 = 50 resistance (easy to conquer)
  // Large territories: 50 * 2.5 = 125 resistance (harder to conquer)
  return BOT_BASE_RESISTANCE * territory.stats.bonusTerritory
}
```

**Battle Resolution for BOT:**
```typescript
// Player vs BOT battle
const attackerForce = calculateForce(attackerMessages, attackerUniqueUsers, attackerBonus)
const botResistance = calculateBotResistance(defenderTerritory)

const attackerWon = attackerForce > botResistance // Simple comparison, no viewer participation for BOT
```

### Existing Implementation Analysis

**From Story 4.6/4.7 (Force Calculation):**
```typescript
// Current formula: Force = (messages * 0.7) + (uniqueUsers * bonus_territoire)
function calculateForce(messages: number, uniqueUsers: number, bonusTerritory: number): number {
  const FORCE_MULTIPLIER = 0.7
  return (messages * FORCE_MULTIPLIER) + (uniqueUsers * bonusTerritory)
}
```

**Territory Stats (from shared/src/types/game.ts):**
```typescript
interface TerritoryStats {
  size: 'small' | 'medium' | 'large'
  attackBonus: number   // High for large territories
  defenseBonus: number  // High for small territories
  bonusTerritory: number // Used in force calculation
}
```

**BattleCounter (from Story 4.8):**
- Already tracks per-user message counts
- Already handles BOT battles with defenderStats = null in summary
- Need to ensure defenderMessages = 0 and defenderUniqueUsers = 0 for BOT battles

**GameEngine State Machine:**
- Validates territory can attack (not already attacking, not under attack)
- Validates target is adjacent
- Need to add: validate target can be BOT territory

### Schema/Type Updates Required

**shared/src/types/game.ts additions:**
```typescript
// BOT owner identifier
export const BOT_OWNER_ID = 'BOT' as const

// BOT resistance configuration
export const BOT_BASE_RESISTANCE = 50

// Helper function
export function isBotTerritory(territory: Territory): boolean {
  return territory.ownerId === BOT_OWNER_ID
}
```

**No schema changes needed** - Territory already allows any string for ownerId.

### Backend Changes Required

**server.ts - Game Start Handler:**
```typescript
// After territory selection, mark remaining as BOT
const selectedTerritoryIds = new Set(players.map(p => p.selectedTerritoryId))
room.game.territories.forEach(territory => {
  if (!selectedTerritoryIds.has(territory.id)) {
    territory.ownerId = BOT_OWNER_ID
  }
})
```

**GameEngine.ts - Attack Validation:**
```typescript
// Allow attacks on BOT territories
function canAttack(attackerId: string, targetId: string): boolean {
  const target = getTerritoire(targetId)
  // Target can be player-owned OR BOT-owned
  return (
    isAdjacent(attackerId, targetId) &&
    !getTerritory(attackerId).isAttacking &&
    !getTerritory(attackerId).isUnderAttack &&
    !target.isUnderAttack // BOT territories can also be locked
  )
}
```

**GameEngine.ts - Battle Resolution:**
```typescript
function resolveBattle(battleId: string): BattleResult {
  const battle = getBattle(battleId)
  const { attackerForce, defenderForce } = calculateForces(battle)

  let defenderEffectiveForce: number

  if (isBotTerritory(battle.defenderTerritory)) {
    // BOT battle: use resistance instead of viewer force
    defenderEffectiveForce = calculateBotResistance(battle.defenderTerritory)
  } else {
    // Player battle: use calculated force from viewers
    defenderEffectiveForce = defenderForce
  }

  const attackerWon = attackerForce > defenderEffectiveForce

  if (attackerWon) {
    transferTerritory(battle.defenderTerritoryId, battle.attackerId)
  }

  return { attackerWon, attackerForce, defenderForce: defenderEffectiveForce, ... }
}
```

### Frontend Changes Required

**Design System - BOT Color:**
```typescript
// Defined in shared/src/schemas/player.ts (exported via shared/schemas)
export const BOT_TERRITORY_COLOR = '#4a4a4a' // Neutral dark grey
```

**GameMap.vue - Canvas Rendering:**
```typescript
// Note: isBotTerritory(ownerId) checks if ownerId === null
function getTerritoryColor(territory: Territory): string {
  if (territory.ownerId === null) {
    return BOT_TERRITORY_COLOR // Neutral/BOT territory
  }
  return territory.color ?? BOT_TERRITORY_COLOR
}
```

**BattleOverlay.vue - BOT Display:**
```typescript
// Actual implementation: Shows "Territoire Libre" when defender is null
const defender = computed(() => {
  if (!battle.value) return null
  if (!battle.value.defenderId) return null // BOT territory
  return players.value.find(p => p.id === battle.value!.defenderId) ?? null
})

// In template:
// {{ defender?.pseudo ?? 'Territoire Libre' }}
```

### Previous Story Learnings (Story 4.8)

**Key Patterns to Follow:**
- All events use constants from BATTLE_EVENTS, GAME_EVENTS in shared/types
- Pinia stores use IMMUTABLE updates (spread operators)
- Error messages in French for user display
- Pino structured logging with context
- Get player data from roomManager.getPlayer() or roomManager.getRoomState()
- Frontend components use `<script setup lang="ts">` with Composition API
- Tailwind CSS for styling with design system colors

**BattleSummary already handles BOT:**
- defenderStats = null for BOT battles (implemented in 4.8)
- Shows "Aucune participation" for defender side
- Result text logic needs update for "Defense BOT reussie"

### Edge Cases to Handle

**1. All Territories Selected (No BOT):**
- If all players select all territories, no BOT territories exist
- Game proceeds normally without BOT battles

**2. BOT Territory Already Under Attack:**
- BOT territories have isUnderAttack flag like player territories
- Only one player can attack a BOT territory at a time
- State machine prevents concurrent attacks

**3. Player vs BOT with Zero Participation:**
- If attacker has 0 messages, attackerForce = 0
- BOT resistance still applies
- Attacker loses if 0 < botResistance (always true unless resistance = 0)

**4. Very Small BOT Territory:**
- Small territory = bonus_territoire ~1.0
- BOT resistance = 50 * 1.0 = 50
- Attacker needs > 50 force to win
- With 0.7 multiplier: ~72 messages or equivalent unique user bonus needed

**5. Very Large BOT Territory:**
- Large territory = bonus_territoire ~2.5
- BOT resistance = 50 * 2.5 = 125
- Attacker needs > 125 force to win
- Requires significant viewer participation

### Project Structure Notes

**CREATE:**
```
(none - all changes in existing files)
```

**MODIFY:**
```
shared/src/types/game.ts (BOT_OWNER_ID, BOT_BASE_RESISTANCE, isBotTerritory)
shared/src/types/index.ts (export new constants/function)
backend/src/server.ts (initialize BOT territories on game:start)
backend/src/managers/GameEngine.ts (calculateBotResistance, battle resolution for BOT)
backend/src/managers/BattleCounter.ts (handle BOT battles with 0 defender participation)
frontend/src/lib/colors.ts or constants.ts (BOT_TERRITORY_COLOR)
frontend/src/components/game/GameMap.vue (render BOT territories with neutral color)
frontend/src/components/battle/BattleOverlay.vue (display BOT as defender)
frontend/src/components/battle/BattleSummary.vue (result text for BOT battles)
frontend/src/stores/territoryStore.ts (handle BOT territory state)
```

### Testing Checklist

**Unit Tests (GameEngine.test.ts):**
- [ ] calculateBotResistance returns correct value for small territory
- [ ] calculateBotResistance returns correct value for large territory
- [ ] Battle resolution: attacker wins vs small BOT (low resistance)
- [ ] Battle resolution: attacker loses vs large BOT (high resistance)
- [ ] isBotTerritory returns true for BOT territories
- [ ] isBotTerritory returns false for player territories

**Integration Tests:**
- [ ] Game start initializes unselected territories as BOT
- [ ] Player can attack adjacent BOT territory
- [ ] BOT territory transfers ownership on conquest
- [ ] BOT territory remains BOT on failed attack
- [ ] Battle summary shows correct BOT-specific information

**Visual Tests:**
- [ ] BOT territories render with neutral grey color
- [ ] Battle overlay shows "BOT" as defender name
- [ ] Battle progress bar shows BOT resistance correctly
- [ ] Battle summary shows "Territoire conquis" / "Defense BOT reussie"

### Dependencies on Other Stories

**Depends on (COMPLETED):**
- Story 4.1: Render Game Map - DONE (Canvas 2D rendering, territory colors)
- Story 4.2: Initiate Attack - DONE (attack validation, battle:start)
- Story 4.4: Dual Counting System - DONE (BattleCounter.getForces())
- Story 4.6: Calculate Battle Force - DONE (force calculation formula)
- Story 4.7: Resolve Battle - DONE (battle:end, territory transfer)
- Story 4.8: Battle Summary - DONE (summary display, BOT partial handling)

**Provides to (FUTURE):**
- Story 5.6: Handle Rage-Quit - Uses BOT territory conversion for disconnected players
- Story 5.8: Game State Consistency - BOT territories part of consistent state

### References

- [FR38] Gerer territoires BOT - epics.md#Story-4.9
- [FR39] Attaquer/conquerir territoires BOT - epics.md#Story-4.9
- [FR40] Resistance proportionnelle BOT - epics.md#Story-4.9
- [FR22] Stats territoriales inversees - epics.md#Epic-4
- [Source: backend/src/managers/GameEngine.ts]
- [Source: backend/src/managers/BattleCounter.ts]
- [Source: backend/src/server.ts]
- [Source: frontend/src/components/game/GameMap.vue]
- [Source: frontend/src/components/battle/BattleOverlay.vue]
- [Source: frontend/src/components/battle/BattleSummary.vue]
- [Source: shared/src/types/game.ts]
- [Source: _bmad-output/implementation-artifacts/4-8-display-battle-summary-with-top-5-leaderboard.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- No bugs encountered - implementation was already complete in prior stories

### Code Review Fixes Applied (2026-01-11)

**M1 FIXED**: Updated BOT_TERRITORY_COLOR documentation from '#666666' to '#4a4a4a' (matching actual code)
**L1 FIXED**: Updated code examples to match actual implementation (ownerId === null pattern)

### Completion Notes List

**Analysis Summary (2026-01-11):**

Cette story a été implémentée de manière incrémentale dans les stories précédentes :

1. **Story 4.1** - Ajout de `BOT_TERRITORY_COLOR` et rendu Canvas pour territoires neutres
2. **Story 4.6** - Ajout de `botResistance.ts` avec `calculateBotDefenderForce()` et `isBotTerritory()`
3. **Story 4.7** - Intégration dans le battle resolution (server.ts lignes 520-539)
4. **Story 4.8** - Support complet dans `BattleSummary.vue` avec `isDefenderBot` prop

**Convention architecturale confirmée :**
- Les territoires BOT utilisent `ownerId: null` (pas `'BOT'` comme suggéré dans la story originale)
- Cette convention est cohérente dans tout le codebase : backend, frontend, shared types
- `isBotTerritory(ownerId)` vérifie `ownerId === null`

**Tests vérifiés :**
- 23 tests pour `botResistance.ts` passent
- 177 tests backend passent au total
- 24 tests shared (territories) passent

**Acceptance Criteria validés :**
- AC1 ✅ : Territoires non-sélectionnés marqués BOT avec couleur neutre
- AC2 ✅ : Attaque sur territoires BOT fonctionne avec même UI
- AC3 ✅ : Résistance BOT basée sur taille du territoire
- AC4 ✅ : Transfert de territoire à l'attaquant en cas de victoire
- AC5 ✅ : Territoire reste BOT en cas de défaite, cooldown appliqué
- AC6 ✅ : Summary affiche stats adaptées pour batailles BOT
- AC7 ⏳ : Conversion player→BOT sur disconnect (prévu pour Story 5.6)

### File List

**Files already modified in prior stories (verified working):**
- `shared/src/schemas/player.ts` - BOT_TERRITORY_COLOR constant
- `shared/src/data/territories.ts` - getInitialTerritories() with ownerId: null
- `backend/src/utils/botResistance.ts` - calculateBotDefenderForce(), isBotTerritory()
- `backend/src/utils/botResistance.test.ts` - 23 unit tests
- `backend/src/server.ts` - Battle resolution with BOT resistance (lines 520-539)
- `backend/src/managers/RoomManager.ts` - Attack validation allowing null ownerId
- `frontend/src/components/game/GameMap.vue` - getTerritoryColor() for BOT
- `frontend/src/components/battle/BattleOverlay.vue` - "Territoire Libre" display
- `frontend/src/components/battle/BattleSummary.vue` - isDefenderBot handling

