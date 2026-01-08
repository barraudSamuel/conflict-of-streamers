---
title: 'Setup Core Architecture Foundations'
slug: 'setup-core-architecture-foundations'
created: '2026-01-08'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
implementedAt: '2026-01-08'
reviewedAt: '2026-01-08'
tech_stack: ['Vue 3.5', 'Pinia 3', 'Fastify 5.6', 'Zod 3.23', 'TypeScript 5.6', 'WebSocket natif']
files_to_modify: ['shared/src/schemas/index.ts', 'shared/src/types/index.ts', 'shared/src/index.ts', 'backend/src/server.ts', 'backend/tsconfig.json', 'shared/tsconfig.json']
files_to_create: ['shared/src/schemas/player.ts', 'shared/src/schemas/game.ts', 'shared/src/schemas/territory.ts', 'shared/src/schemas/battle.ts', 'shared/src/types/player.ts', 'shared/src/types/game.ts', 'shared/src/types/territory.ts', 'shared/src/types/battle.ts', 'frontend/src/stores/gameStore.ts', 'frontend/src/stores/lobbyStore.ts', 'frontend/src/stores/playerStore.ts', 'frontend/src/stores/battleStore.ts', 'frontend/src/stores/websocketStore.ts']
code_patterns: ['Zod schemas with PascalCase+Schema suffix', 'Immutable Pinia stores', 'Composition API style', 'Native WebSocket ws://', 'Custom error classes', 'Structured Pino logging']
test_patterns: ['Manual verification', 'TypeScript compilation', 'Schema validation in REPL', 'Store immutability checks']
review_notes:
  - 'Adversarial review completed'
  - 'Findings: 15 total (2 HIGH, 5 MEDIUM, 8 LOW)'
  - 'Resolution: 9 fixed, 6 skipped (justified)'
  - 'Approach: Walk-through with user approval'
---

# Tech-Spec: Setup Core Architecture Foundations

**Created:** 2026-01-08

## Overview

### Problem Statement

Le projet a besoin des fondations architecturales complètes (schémas Zod, types TypeScript, stores Pinia, error handling) pour permettre le développement des features suivantes. Actuellement, seuls les placeholders minimaux existent dans shared/, et aucun store Pinia n'est créé côté frontend. Le backend manque également d'un error handler global pour gérer les custom errors de manière cohérente.

### Solution

Implémenter la structure shared complète avec schémas Zod et types TypeScript pour les entités core (Player, Game, Territory, Battle), créer les stores Pinia avec logique de base côté frontend, et configurer le error handler global Fastify pour gérer les custom errors.

### Scope

**In Scope:**
- Schémas Zod **complets** pour Player, Game, Territory, Battle dans `shared/src/schemas/`
- Types TypeScript correspondants inférés via `z.infer<>` dans `shared/src/types/`
- Structure stores Pinia organisée par domaine :
  - `frontend/src/stores/gameStore.ts`
  - `frontend/src/stores/lobbyStore.ts`
  - `frontend/src/stores/playerStore.ts`
  - `frontend/src/stores/battleStore.ts`
  - `frontend/src/stores/websocketStore.ts`
- Logique de base dans chaque store (state refs, getters computed, actions vides)
- Error handler global Fastify pour custom errors (AppError, ValidationError, GameError, NotFoundError, UnauthorizedError)

**Out of Scope:**
- Module config centralisé pour validation .env
- Validation Zod des variables d'environnement
- Logique métier spécifique (calculs combat, intégration Twitch, etc.)
- Implémentation complète des actions Pinia (sera fait dans les stories features)
- Tests unitaires (sera fait dans une story dédiée testing)

## Context for Development

### Codebase Patterns

**Patterns critiques à suivre (voir `_bmad-output/project-context.md` pour détails complets) :**

1. **Zod Schema Naming** :
   - PascalCase + "Schema" suffix : `PlayerSchema`, `GameSchema`
   - Types inférés sans suffix : `type Player = z.infer<typeof PlayerSchema>`
   - Jamais de prefix "I" ou suffix "Type"

2. **Pinia Stores** :
   - Composition API style : `defineStore('name', () => { const state = ref(); return { state } })`
   - Immutable updates OBLIGATOIRES : `territories.value = [...territories.value, newT]`
   - Naming : `useGameStore()`, `useLobbyStore()`, etc.
   - Organization par domaine (pas par type)

3. **Fastify Error Handler** :
   - Global handler avec `fastify.setErrorHandler()`
   - Gestion custom errors avec statusCode approprié
   - Logging structuré avec Pino : `fastify.log.error({ err: error })`
   - Réponse JSON format : `{ error: { code, message, details } }`

4. **TypeScript Strict Mode** :
   - Pas de `any` types
   - Toujours typer paramètres et retours de fonctions
   - ES Modules : `import/export` syntax

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/project-context.md` | Conventions complètes (naming, patterns, anti-patterns) |
| `_bmad-output/planning-artifacts/architecture.md` | Décisions architecturales (AR5-AR17) |
| `shared/src/errors/index.ts` | Custom error classes existantes |
| `frontend/src/main.ts` | Pinia déjà configuré |
| `backend/src/server.ts` | Fastify setup existant |

### Technical Decisions

- **Schémas Zod** : Source unique de vérité pour validation ET types TypeScript
- **Stores Pinia** : Un store par domaine fonctionnel (game, lobby, player, battle, websocket)
- **Error Handler** : Centralisé dans Fastify pour cohérence des réponses API
- **Immutabilité** : Pattern strict dans stores Pinia pour garantir réactivité Vue 3

### Domain Entities (from Architecture & PRD)

**Player** :
- `id`: UUID string
- `pseudo`: Twitch username (3-20 chars)
- `twitchAvatarUrl`: string (URL auto-fetched)
- `color`: Player color enum (8 neon colors: #FF3B3B, #00F5FF, #FFE500, #00FF7F, #FF00FF, #9D4EDD, #FF6B35, #00FFA3)
- `status`: 'waiting' | 'ready' | 'playing' | 'eliminated'
- `territoryIds`: string[] (owned territory IDs)
- `createdAt`, `updatedAt`: ISO datetime strings

**Game** :
- `id`: UUID string
- `code`: Shareable room code (ex: "VENDETTA") - 6-10 uppercase alphanumeric
- `creatorId`: Player UUID
- `status`: 'lobby' | 'playing' | 'finished'
- `config`: GameConfig object (see below)
- `playerIds`: string[]
- `territoryIds`: string[]
- `createdAt`, `updatedAt`: ISO datetime strings

**GameConfig** (sub-schema):
- `battleDuration`: number (seconds, default 30)
- `cooldownBetweenActions`: number (seconds, default 10)
- `forceMultiplier`: number (default 0.7, used in combat formula)
- `territoryBonusRange`: [min: number, max: number] (default [1.0, 2.5])

**Territory** :
- `id`: UUID string
- `name`: string (generated, e.g. "France", "Espagne")
- `ownerId`: string | null (Player UUID or null for BOT territories)
- `size`: number (number of grid cells)
- `position`: { x: number, y: number } (position on 20×20 grid)
- `adjacentTerritoryIds`: string[]
- `attackPower`: number (inverse to size)
- `defensePower`: number (inverse to size)
- `isAttacking`: boolean (state lock)
- `isUnderAttack`: boolean (state lock)
- `createdAt`, `updatedAt`: ISO datetime strings

**Battle** :
- `id`: UUID string
- `gameId`: Game UUID
- `attackerTerritoryId`: Territory UUID
- `defenderTerritoryId`: Territory UUID
- `attackerPlayerId`: Player UUID
- `defenderPlayerId`: Player UUID | null (null for BOT)
- `status`: 'in_progress' | 'completed'
- `duration`: number (seconds, from game config)
- `startedAt`: ISO datetime string
- `endedAt`: ISO datetime string | null
- `attackerStats`: BattleStats
- `defenderStats`: BattleStats
- `winnerId`: Territory UUID | null
- `createdAt`, `updatedAt`: ISO datetime strings

**BattleStats** (sub-schema):
- `messageCount`: number (total messages)
- `uniqueUserCount`: number (unique Twitch users)
- `force`: number (calculated: messages × 0.7 + uniqueUsers × territoryBonus)
- `topSpammers`: Array<{ pseudo: string, messageCount: number }> (top 5)

## Implementation Plan

### Validation Rules & Constants (CRITICAL - First Principles)

**Player Colors Constant:**
```typescript
// shared/src/schemas/player.ts
export const PLAYER_COLORS = [
  '#FF3B3B', '#00F5FF', '#FFE500', '#00FF7F',
  '#FF00FF', '#9D4EDD', '#FF6B35', '#00FFA3'
] as const
```

**Game Code Validation:**
- Regex: `/^[A-Z2-9]{6,10}$/` (excludes O,0,I,1 to avoid confusion when typing)
- Length: 6-10 characters
- Characters: Uppercase letters A-Z (except O,I) + digits 2-9 (except 0,1)

**UUID Generation Strategy:**
- **Backend only** generates UUIDs using `crypto.randomUUID()` (Node.js native, UUID v4)
- Frontend **never** generates IDs
- All entity IDs validated with `z.string().uuid()` in schemas

**Datetime Format:**
- ISO 8601 with timezone UTC: `z.string().datetime()`
- Generated with `new Date().toISOString()` → `"2026-01-08T18:30:00.000Z"`

**Grid Constraints:**
- Position coordinates: integers 0-19 (20×20 grid)
- Max territories per player: 20 (entire grid)
- Top spammers: max 5 entries

### Tasks

**Phase 1: Shared Schemas & Types (Foundation)**

- [ ] Task 1: Create shared Zod schemas - Sub-schemas
  - File: `shared/src/schemas/game.ts`
  - Action: Create `GameConfigSchema` with exact defaults and refinements:
    ```typescript
    export const GameConfigSchema = z.object({
      battleDuration: z.number().int().positive().default(30),
      cooldownBetweenActions: z.number().int().nonnegative().default(10),
      forceMultiplier: z.number().positive().default(0.7),
      territoryBonusRange: z.tuple([
        z.number().positive(),
        z.number().positive()
      ])
        .refine(([min, max]) => min < max, {
          message: "territoryBonusRange[0] must be less than territoryBonusRange[1]"
        })
        .default([1.0, 2.5])
    })
    ```
  - Notes: All defaults specified with `.default()` for type-safe partial config, territoryBonusRange validated for correct order (F25)

- [ ] Task 2: Create shared Zod schemas - Battle sub-schema
  - File: `shared/src/schemas/battle.ts`
  - Action: Create `BattleStatsSchema` with array constraints:
    ```typescript
    export const BattleStatsSchema = z.object({
      messageCount: z.number().int().nonnegative(),
      uniqueUserCount: z.number().int().nonnegative(),
      force: z.number().nonnegative(),
      topSpammers: z.array(z.object({
        pseudo: z.string(),
        messageCount: z.number().int().nonnegative()
      })).max(5).default([])
    })
    ```
  - Notes: topSpammers limited to max 5 entries for consistent UX

- [ ] Task 3: Create Player Zod schema
  - File: `shared/src/schemas/player.ts`
  - Action: Create `PlayerSchema` with exact enum and constraints:
    ```typescript
    export const PLAYER_COLORS = ['#FF3B3B', '#00F5FF', '#FFE500', '#00FF7F', '#FF00FF', '#9D4EDD', '#FF6B35', '#00FFA3'] as const

    export const PlayerSchema = z.object({
      id: z.string().uuid(),
      pseudo: z.string().min(3).max(20),
      twitchAvatarUrl: z.string().url(),
      color: z.enum(PLAYER_COLORS),
      status: z.enum(['waiting', 'ready', 'playing', 'eliminated']),
      territoryIds: z.array(z.string().uuid()).max(20).default([]),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime()
    })
    ```
  - Notes: color uses exact hex enum, territoryIds max 20 (grid size)

- [ ] Task 4: Create Territory Zod schema
  - File: `shared/src/schemas/territory.ts`
  - Action: Create `TerritorySchema` with grid position validation:
    ```typescript
    export const TerritorySchema = z.object({
      id: z.string().uuid(),
      name: z.string(),
      ownerId: z.string().uuid().nullable(),
      size: z.number().int().positive(),
      position: z.object({
        x: z.number().int().min(0).max(19),
        y: z.number().int().min(0).max(19)
      }),
      adjacentTerritoryIds: z.array(z.string().uuid()),
      attackPower: z.number().nonnegative(),
      defensePower: z.number().nonnegative(),
      isAttacking: z.boolean(),
      isUnderAttack: z.boolean(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime()
    })
    ```
  - Notes: position validated for 20×20 grid (0-19), ownerId nullable for BOT

- [ ] Task 5: Create Game Zod schema
  - File: `shared/src/schemas/game.ts`
  - Action: Create `GameSchema` with code regex validation:
    ```typescript
    export const GameSchema = z.object({
      id: z.string().uuid(),
      code: z.string().regex(/^[A-Z2-9]{6,10}$/).describe('6-10 uppercase, excludes O,0,I,1'),
      creatorId: z.string().uuid(),
      status: z.enum(['lobby', 'playing', 'finished']),
      config: GameConfigSchema,
      playerIds: z.array(z.string().uuid()),
      territoryIds: z.array(z.string().uuid()),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime()
    })
    ```
  - Notes: code excludes confusing chars (O,0,I,1), uses GameConfigSchema

- [ ] Task 6: Create Battle Zod schema
  - File: `shared/src/schemas/battle.ts`
  - Action: Create `BattleSchema` with nullable fields for BOT battles:
    ```typescript
    export const BattleSchema = z.object({
      id: z.string().uuid(),
      gameId: z.string().uuid(),
      attackerTerritoryId: z.string().uuid(),
      defenderTerritoryId: z.string().uuid(),
      attackerPlayerId: z.string().uuid(),
      defenderPlayerId: z.string().uuid().nullable(),
      status: z.enum(['in_progress', 'completed']),
      duration: z.number().int().positive(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime().nullable(),
      attackerStats: BattleStatsSchema,
      defenderStats: BattleStatsSchema,
      winnerId: z.string().uuid().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime()
    })
    ```
  - Notes: defenderPlayerId nullable for BOT defenders, uses BattleStatsSchema. **F24 Limitation**: Cross-entity validation (if defenderPlayerId null then territory.ownerId null) CANNOT be done at schema level - must be validated at application logic level in backend before battle creation

- [ ] Task 7: Export all schemas from shared schemas index
  - File: `shared/src/schemas/index.ts`
  - Action: Add exports for PlayerSchema, GameSchema, GameConfigSchema, TerritorySchema, BattleSchema, BattleStatsSchema (keep existing BaseEntitySchema export)
  - Notes: Clean up placeholder comments

- [ ] Task 8: Create TypeScript types from Zod schemas - Player & Game
  - File: `shared/src/types/player.ts`
  - Action: Import PlayerSchema, export `type Player = z.infer<typeof PlayerSchema>`
  - File: `shared/src/types/game.ts`
  - Action: Import GameSchema and GameConfigSchema, export `type Game = z.infer<typeof GameSchema>` and `type GameConfig = z.infer<typeof GameConfigSchema>`
  - Notes: NO "Type" suffix on inferred types

- [ ] Task 9: Create TypeScript types from Zod schemas - Territory & Battle
  - File: `shared/src/types/territory.ts`
  - Action: Import TerritorySchema, export `type Territory = z.infer<typeof TerritorySchema>`
  - File: `shared/src/types/battle.ts`
  - Action: Import BattleSchema and BattleStatsSchema, export `type Battle = z.infer<typeof BattleSchema>` and `type BattleStats = z.infer<typeof BattleStatsSchema>`
  - Notes: Follow naming convention without suffixes

- [ ] Task 10: Export all types from shared types index
  - File: `shared/src/types/index.ts`
  - Action: Add exports for Player, Game, GameConfig, Territory, Battle, BattleStats (keep existing BaseEntity export)
  - Notes: Clean up placeholder comments

- [ ] Task 11: Verify shared package exports
  - File: `shared/src/index.ts`
  - Action: Verify that exports from './types', './schemas', './errors' are correct
  - Notes: No changes needed, just verification

- [ ] Task 18: Verify workspace TypeScript configuration
  - Files: Root `tsconfig.json`, `shared/tsconfig.json`, `frontend/tsconfig.json`, `backend/tsconfig.json`
  - Action: Ensure workspace references configured:
    - Root `tsconfig.json` has `references: [{ path: './shared' }, { path: './frontend' }, { path: './backend' }]`
    - Each package tsconfig has `composite: true`
    - Frontend/backend tsconfig have paths configured for shared imports (e.g., `paths: { "shared/*": ["../shared/src/*"] }`)
    - Verify imports like `import { Player } from 'shared/types'` work without errors
  - Notes: CRITICAL for monorepo - verify before starting implementation. Failure here means nothing compiles (F23, F29)

**Phase 2: Frontend Pinia Stores (State Management)**

**Store Architecture Pattern: Hub & Spoke**
- WebSocket store = central hub (all stores communicate through it)
- Stores can import other stores (one-way only, avoid circular execution)
- WebSocket dispatches events → stores listen and react
- Pattern prevents circular dependency issues

**Immutability Enforcement Strategy:**
- **Recommended**: ESLint rule `no-param-reassign` to detect mutations
- Alternative: TypeScript `Immutable<T>` utility type for compile-time checks
- Pattern: Always replace ref entirely (`state.value = [...state.value, item]`), never mutate content directly

**Store Actions Implementation (F20 Clarification):**
- ALL actions are FULLY IMPLEMENTED with base logic (not stubs)
- "Base logic" means: CRUD operations on state (add, update, remove items from arrays immutably)
- Actions DO: Manipulate local state, track refs, update computed getters
- Actions DO NOT: Call backend APIs (future stories), complex business logic (combat calculations), side effects (localStorage)
- Example: `addPlayer(player)` → `players.value = [...players.value, player]` ✅ IMPLEMENTED
- Example: `updatePlayer(id, updates)` → find + immutable update ✅ IMPLEMENTED
- NOT example: `fetchPlayersFromAPI()` → ❌ OUT OF SCOPE for this story

- [ ] Task 12: Create WebSocket store with error handling
  - File: `frontend/src/stores/websocketStore.ts`
  - Action: Create `useWebSocketStore` with full connection lifecycle:
    ```typescript
    export const useWebSocketStore = defineStore('websocket', () => {
      const ws = ref<WebSocket | null>(null)
      const url = ref<string>('')
      const connectionState = ref<number>(WebSocket.CLOSED)
      const isConnected = computed(() => connectionState.value === WebSocket.OPEN)

      function connect(wsUrl: string) {
        url.value = wsUrl
        try {
          ws.value = new WebSocket(wsUrl)

          ws.value.onopen = () => {
            connectionState.value = WebSocket.OPEN
            console.log('[WS] Connected')
          }

          ws.value.onerror = (error) => {
            console.error('[WS] Error:', error)
          }

          ws.value.onclose = () => {
            connectionState.value = WebSocket.CLOSED
            console.log('[WS] Disconnected')
            // Auto-reconnect after 3 seconds
            setTimeout(() => {
              if (url.value) connect(url.value)
            }, 3000)
          }
        } catch (error) {
          console.error('[WS] Connection failed:', error)
          connectionState.value = WebSocket.CLOSED
        }
      }

      function send<T>(event: string, data: T): boolean {
        if (!ws.value || connectionState.value !== WebSocket.OPEN) {
          console.warn('[WS] Cannot send, not connected')
          return false
        }
        try {
          ws.value.send(JSON.stringify({ event, data }))
          return true
        } catch (error) {
          console.error('[WS] Send failed:', error)
          return false
        }
      }

      function disconnect() {
        url.value = '' // Prevent auto-reconnect
        ws.value?.close()
        ws.value = null
        connectionState.value = WebSocket.CLOSED
      }

      return { ws, isConnected, connectionState, connect, send, disconnect }
    })
    ```
  - Notes: Auto-reconnect every 3 sec, `send()` returns boolean (success/failure), connection state tracking

- [ ] Task 13: Create Player store with base logic
  - File: `frontend/src/stores/playerStore.ts`
  - Action: Create `usePlayerStore` with Composition API style - state: players ref<Player[]>, currentPlayer ref<Player | null> - actions: addPlayer(player), updatePlayer(id, updates), removePlayer(id), setCurrentPlayer(player) - getters: getPlayerById(id) computed
  - Notes: MUST use immutable updates (spread operators), import Player type from shared

- [ ] Task 14: Create Game store with base logic
  - File: `frontend/src/stores/gameStore.ts`
  - Action: Create `useGameStore` with Composition API style - state: currentGame ref<Game | null>, territories ref<Territory[]> - actions: setGame(game), updateGame(updates), addTerritory(territory), updateTerritory(id, updates) - getters: getGameConfig computed
  - Notes: Import Game, Territory types from shared, immutable updates required

- [ ] Task 15: Create Battle store with base logic
  - File: `frontend/src/stores/battleStore.ts`
  - Action: Create `useBattleStore` with Composition API style - state: currentBattle ref<Battle | null>, battleHistory ref<Battle[]> - actions: startBattle(battle), updateBattle(updates), completeBattle(winnerId), addToBattleHistory(battle) - getters: isInBattle computed
  - Notes: Import Battle type from shared, immutable updates with spread operators

- [ ] Task 16: Create Lobby store with base logic
  - File: `frontend/src/stores/lobbyStore.ts`
  - Action: Create `useLobbyStore` with Composition API style - state: isInLobby ref<boolean>, selectedTerritoryId ref<string | null> - actions: enterLobby(), exitLobby(), selectTerritory(territoryId), clearSelection() - getters: hasSelectedTerritory computed
  - Notes: Simpler store, minimal logic for now

**Phase 3: Backend Error Handling (API Consistency)**

**Error Status Code Mapping:**
- `ZodError` → 400 (validation error, details = error.issues array)
- `ValidationError` → 400 (custom validation)
- `GameError` → 400 (game rule violation)
- `NotFoundError` → 404 (resource not found)
- `UnauthorizedError` → 401 (authentication required)
- `AppError` → 500 (default, internal server error)
- Unexpected errors → 500 (generic internal error)

**ZodError Handling Strategy:**
- Use `.safeParse()` in routes (doesn't throw, returns result)
- If validation fails, throw `result.error` (ZodError)
- Error handler catches ZodError and transforms to 400 response
- Exposes validation details via `error.issues` array

- [ ] Task 17: Add global error handler to Fastify server
  - File: `backend/src/server.ts`
  - Action: Add `fastify.setErrorHandler()` after plugin registration, before routes:
    ```typescript
    import { ZodError } from 'zod'
    import { ValidationError, AppError, GameError, NotFoundError, UnauthorizedError } from 'shared/errors'

    fastify.setErrorHandler((error, request, reply) => {
      // 1. Handle ZodError (from schema validation)
      if (error instanceof ZodError) {
        fastify.log.error({ err: error }, 'Validation error')
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        })
      }

      // 2. Handle custom errors (ValidationError, GameError, NotFoundError, UnauthorizedError)
      if (error instanceof ValidationError ||
          error instanceof GameError ||
          error instanceof NotFoundError ||
          error instanceof UnauthorizedError) {
        fastify.log.error({ err: error }, 'Custom error')
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      }

      // 3. Handle base AppError (statusCode 500 default)
      if (error instanceof AppError) {
        fastify.log.error({ err: error, stack: error.stack }, 'Application error')
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      }

      // 4. Unexpected errors (500) - log full stack trace
      fastify.log.error({ err: error, stack: error.stack }, 'Unexpected error')
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      })
    })
    ```
  - Notes: ZodError handled first, stack traces logged server-side, details exposed only in dev for 500 errors

### Acceptance Criteria

**Shared Schemas & Types:**

- [ ] AC1: Given I import PlayerSchema, when I validate valid player data, then validation passes AND inferred type Player has all expected properties (id, pseudo, color, status, etc.) AND type is NOT 'any'
- [ ] AC2: Given I import PlayerSchema, when I validate invalid player data (pseudo < 3 chars), then validation fails with ZodError AND error.issues contains details about pseudo validation
- [ ] AC3: Given I import GameSchema, when I validate game data with valid config, then nested GameConfigSchema validation passes AND config defaults are filled
- [ ] AC4: Given I import TerritorySchema, when I validate territory with null ownerId (BOT), then validation passes AND position coordinates are validated (0-19)
- [ ] AC5: Given I import BattleSchema, when I validate battle data with nullable defenderPlayerId, then validation passes AND BattleStats nested validation works
- [ ] AC6: Given I import type Player from 'shared/types', when I use it in TypeScript code, then TypeScript compiler accepts it without errors AND type has correct properties (verify Player.color is one of 8 hex values, not string)
- [ ] AC7: Given all schemas are exported from shared/src/schemas/index.ts, when I import from 'shared/schemas', then all schemas are accessible
- [ ] AC8: Given all types are exported from shared/src/types/index.ts, when I import from 'shared/types', then all types are accessible
- [ ] AC30: Given GameSchema with nested GameConfigSchema, when I parse game data with partial config (missing some defaults), then GameConfigSchema fills defaults AND territoryBonusRange[0] < territoryBonusRange[1] is enforced
- [ ] AC31: Given BattleSchema with nested BattleStatsSchema, when I parse battle data, then nested BattleStats validates AND topSpammers.max(5) is enforced
- [ ] AC32: Given TypeScript compiler in frontend, when I import from 'shared/types', then compilation succeeds without path errors
- [ ] AC33: Given TypeScript compiler in backend, when I import from 'shared/errors', then compilation succeeds without path errors

**Pinia Stores:**

- [ ] AC9: Given I call useWebSocketStore, when I call connect(url), then ws ref is set and connected ref becomes true
- [ ] AC10: Given usePlayerStore with empty players array, when I call addPlayer(newPlayer), then players.value reference changes (oldRef !== players.value) AND newPlayer is in array
- [ ] AC11: Given usePlayerStore with 3 players, when I call updatePlayer(id, updates), then players.value reference changes (oldRef !== players.value) AND only the matching player is updated
- [ ] AC12: Given useGameStore, when I call setGame(game), then currentGame ref is set and getGameConfig getter returns game.config
- [ ] AC13: Given useGameStore with territories, when I call updateTerritory(id, updates), then only matching territory is updated immutably
- [ ] AC14: Given useBattleStore, when I call startBattle(battle), then currentBattle ref is set and isInBattle computed returns true
- [ ] AC15: Given useBattleStore with currentBattle, when I call completeBattle(winnerId), then battle is added to battleHistory and currentBattle is cleared
- [ ] AC16: Given useLobbyStore, when I call selectTerritory(id), then selectedTerritoryId is set and hasSelectedTerritory computed returns true

**Backend Error Handler:**

- [ ] AC17: Given Fastify error handler, when a ZodError is thrown, then response has status 400 with JSON format { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues } }
- [ ] AC18: Given Fastify error handler, when a ValidationError is thrown in a route, then response has status 400 with structured error JSON
- [ ] AC19: Given Fastify error handler, when a GameError is thrown, then response has status 400 with structured error JSON
- [ ] AC20: Given Fastify error handler, when a NotFoundError is thrown, then response has status 404 with structured error JSON
- [ ] AC21: Given Fastify error handler, when a UnauthorizedError is thrown, then response has status 401 with structured error JSON
- [ ] AC22: Given Fastify error handler, when an AppError is thrown, then response has status 500 (default) with structured error JSON
- [ ] AC23: Given Fastify error handler, when an unexpected error occurs, then response has status 500 with generic message and error.stack is logged via Pino but not exposed in response (except in dev)
- [ ] AC24: Given any error is caught, when error handler executes, then Pino structured log is written with `{ err: error, stack: error.stack }` format

**WebSocket Store:**

- [ ] AC25: Given useWebSocketStore, when connect(url) is called and connection fails, then connectionState is CLOSED and error is logged
- [ ] AC26: Given useWebSocketStore with open connection, when connection drops, then onclose fires, connectionState becomes CLOSED, and auto-reconnect attempts after 3 seconds
- [ ] AC27: Given useWebSocketStore, when send() is called before connection is OPEN, then send returns false and warning is logged
- [ ] AC28: Given useWebSocketStore with OPEN connection, when send() is called successfully, then send returns true and message is sent
- [ ] AC29: Given useWebSocketStore, when disconnect() is called, then url is cleared (preventing auto-reconnect), WebSocket is closed, and connectionState is CLOSED

## Additional Context

### Dependencies

**External Libraries (Already Installed):**
- Zod ^3.23 - Runtime validation (shared package)
- Pinia 3 - State management (frontend, already configured in main.ts)
- Fastify 5.6 - Backend framework (backend)
- @fastify/websocket 11.2 - Native WebSocket support (backend, already registered)

**Internal Dependencies:**
- Custom error classes in `shared/src/errors/index.ts` (already exist: AppError, ValidationError, GameError, NotFoundError, UnauthorizedError)
- Pinia already configured in `frontend/src/main.ts`
- Fastify already configured in `backend/src/server.ts` with Pino logging

**No New Dependencies Required** - All necessary libraries are already installed

### Testing Strategy

**For This Story:**
- Manual verification only (no automated tests in this story)
- Verify TypeScript compilation passes without errors
- Verify schemas validate correctly using test data in browser console or Node REPL
- Verify stores are accessible and follow immutable patterns

**Future Testing (Out of Scope):**
- Unit tests for Zod schemas (Story dédiée testing)
- Unit tests for Pinia store actions/getters
- Integration tests for error handler with sample routes
- Will be addressed in dedicated testing story

**Manual Testing Steps:**
1. Run `npm run build:shared` - verify no TypeScript errors
2. Run `npm run build:frontend` - verify stores compile and types are accessible
3. Run `npm run build:backend` - verify error handler compiles
4. Test schema validation in Node REPL: `PlayerSchema.parse({ ...testData })`
5. Test store in browser console: `usePlayerStore().addPlayer({ ...player })`

**F19 - Automated Testing Decision:**
- **Decision**: Defer automated tests to dedicated testing story
- **Rationale**: Foundation code needs manual verification first to ensure patterns are correct
- **Risk Mitigation**: Manual testing steps above + code review before merge
- **Future**: Dedicated testing story will add unit tests for schemas, stores, error handler
- **Trade-off Accepted**: Tech debt noted, but faster iteration for foundation setup

### Notes

**Critical Foundation Story:**
Cette story pose les fondations architecturales essentielles. Toutes les stories features suivantes dépendent de ces schémas, types, et stores. Sans cette base, aucune feature concrète (lobby, game, battles) ne peut être implémentée.

**High-Risk Items (Pre-Mortem Analysis):**
1. **Zod Schema Complexity** - Les schémas imbriqués (GameConfig dans Game, BattleStats dans Battle) peuvent être difficiles à déboguer si mal typés
   - Mitigation: Créer les sub-schemas AVANT les schemas principaux (Task 1-2 avant Task 3-6), validation rules exactes spécifiées
2. **Immutabilité Pinia** - Facile d'oublier les spread operators et muter directement
   - Mitigation: ESLint rule `no-param-reassign` configurée, pattern documenté dans chaque task store
3. **Import Paths Shared** - Confusion entre import relatifs vs workspace imports
   - Mitigation: Toujours utiliser `import { X } from 'shared/types'` jamais `../../../shared/src/types`
4. **WebSocket Connection Failures** - Network drops, server restarts, connection timeouts
   - Mitigation: Auto-reconnect every 3 sec, connection state tracking, send() returns boolean
5. **Error Handler Order** - ZodError vs custom errors processing order matters
   - Mitigation: ZodError checked first, status codes explicitly mapped, stack traces logged

**Known Limitations:**
- Stores Pinia ont logique de base complète mais actions métier seront implémentées dans stories features
- WebSocket auto-reconnect simple (3 sec fixed delay) - pas de exponential backoff pour MVP
- Error handler ne sanitize pas error messages (à considérer si données sensibles exposées)
- Immutabilité enforced via ESLint uniquement (pas de runtime checks en production)

**Architectural Decisions Documented:**
- **UUID Generation**: Backend only, using `crypto.randomUUID()` (Node.js native)
- **Datetime Format**: ISO 8601 UTC via `z.string().datetime()` and `new Date().toISOString()`
- **WebSocket Pattern**: Hub & Spoke avec auto-reconnect, connection state tracking
- **Error Handling**: ZodError → 400, status codes mapped, stack traces logged server-side only
- **Immutability**: ESLint `no-param-reassign` rule, pattern: replace refs entirely
- **Store Communication**: One-way imports, WebSocket hub central

**Application-Level Validations (Cannot Be Done at Schema Level):**

**F26 - Game.code Uniqueness:**
- Enforced at **backend application level** (not schema level)
- Backend RoomManager maintains `Map<code, Game>` in-memory
- On game creation: generate random code, check `Map.has(code)`, retry if collision
- Collision probability with 6-10 chars [A-Z2-9] (34^6 to 34^10) is negligible for MVP
- No database needed (games are ephemeral, in-memory only with TTL)

**F27 - Territory Adjacency Bidirectionality:**
- Schema-level validation: CANNOT enforce bidirectional symmetry (cross-entity constraint)
- Application-level validation: MUST be enforced during territory generation
- Pattern: When generating territories, ensure `if A.adjacents.includes(B)` then `B.adjacents.includes(A)`
- Validation happens at game initialization, not per-action (performance)

**F28 - WebSocket Reconnection State Strategy:**
- On reconnect, stores are NOT automatically cleared
- Frontend must request full state resync from backend after reconnection
- Pattern: After `onopen` fires post-reconnect, send `{ event: 'game:sync-request' }`
- Backend responds with current full game state
- Frontend stores update with fresh authoritative data
- Alternative considered: Clear all stores on disconnect (simpler but loses optimistic updates)
- **MVP Decision**: Request full state resync (preserves UX, reliable recovery)

**F30 - TypeScript 5.6 Features Used:**
- No TS 5.6-specific features required for this story
- Code uses standard TS 5.x features: generics, type inference, enums, union types
- **Downgrade Compatible**: Yes, compatible with TypeScript 5.0+
- If downgrade needed: No code changes required, just update tsconfig `"target"` and `"lib"`

**F31 - Pinia Devtools Configuration:**
- **Development**: Pinia devtools auto-enabled in dev mode (Vue DevTools browser extension)
- **Setup**: Install Vue DevTools extension → Pinia tab appears automatically
- **Usage**: Inspect store state, track mutations, time-travel debugging
- **Production**: Devtools automatically disabled when `NODE_ENV=production`
- **No code changes required**: Pinia devtools work out-of-the-box with Vue 3

**F32 - Schema Evolution Strategy:**
- **Adding Optional Fields**: Use `.optional()` on new fields → backward compatible
  ```typescript
  // Future: Add optional field to PlayerSchema
  newField: z.string().optional()
  ```
- **Adding Required Fields**: Use `.default()` → existing data gets default value
  ```typescript
  // Future: Add required field with default
  newRequiredField: z.string().default('default-value')
  ```
- **Removing Fields**: Mark as `.optional()` first, remove in next version (2-step deprecation)
- **Changing Types**: Avoid if possible, or use union types for transition period
- **Migration Strategy**: No database migrations needed (in-memory state, ephemeral games)
- **Version Compatibility**: Frontend/backend must be deployed together (monorepo)

**F34 - WebSocket URL Format:**
- **Development**: `ws://localhost:3000/ws` (HTTP, no SSL)
- **Production**: `wss://yourdomain.com/ws` (HTTPS, SSL required)
- **Construction Pattern**:
  ```typescript
  // Frontend - construct from window.location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host // includes port
  const wsUrl = `${protocol}//${host}/ws`

  // Alternative: From env var (if different backend domain)
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'
  ```
- **Environment Variables** (optional):
  - Frontend: `VITE_WS_URL` in `.env`
  - Backend: WebSocket served on same port as HTTP server (Fastify handles both)
- **Recommendation**: Use `window.location` construction (works in all environments without config)

**Future Considerations (Out of Scope):**
- WebSocket event schemas (ClientToServerEvents, ServerToClientEvents) - sera créé dans story WebSocket communication
- Exponential backoff pour WebSocket reconnection - amélioration possible post-MVP
- Runtime immutability checks - pourrait être ajouté si bugs fréquents détectés
- Error message sanitization - à implémenter si données sensibles dans errors
- Shared constants export (MAX_PLAYERS, GRID_SIZE, etc.) - sera ajouté quand nécessaire dans stories features
