---
project_name: 'conflict-of-streamers'
user_name: 'sam'
date: '2026-01-08'
sections_completed: ['technology_stack', 'language_specific', 'framework_specific', 'code_quality', 'critical_rules']
existing_patterns_found: 26
status: 'complete'
rule_count: 50+
optimized_for_llm: true
last_updated: '2026-01-08'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Technologies
- **Vue 3.5** - Frontend framework (Composition API obligatoire, pas Options API)
- **Vite 7.2** - Build tooling avec HMR instantané
- **Fastify 5.6** - Backend framework (TypeScript native, 2x plus rapide qu'Express)
- **TypeScript 5.6+** - Strict mode activé partout (frontend, backend, shared)
- **Node.js 20 LTS** - Runtime backend

### Frontend Dependencies
- **Pinia 3** - State management (composition-based, pas Vuex)
- **Vue Router 4.4** - Navigation (History Mode requis)
- **Tailwind CSS 4.1** - Utility-first CSS (config TypeScript native)
- **ws 8.18** - WebSocket client NATIF (protocole ws://)
- **Howler.js 2.2** - Audio management (orchestral music + SFX)

### Backend Dependencies
- **@fastify/websocket 11.2** - WebSocket NATIF (protocole ws://, PAS Socket.io)
- **@fastify/cors 10.0** - CORS configuration
- **tmi.js 1.8** - Twitch IRC anonymous connection
- **Pino 10.1** - Structured logging (intégré Fastify par défaut)

### Shared Dependencies
- **Zod ^3.23** - Runtime validation schemas + TypeScript type inference

### CRITICAL Version Constraints

⚠️ **WebSocket Architecture:**
- MUST use native WebSocket (`ws://` protocol) via `ws` library client-side et `@fastify/websocket` server-side
- NEVER use Socket.io - architecture optimisée pour latency minimale (<200ms requirement)
- Broadcasting manuel côté serveur (simple Map des connections par room)

⚠️ **TypeScript Configuration:**
- Strict mode OBLIGATOIRE - `"strict": true` in all tsconfig.json
- ES Modules ONLY - `"type": "module"` in all package.json
- `"moduleResolution": "bundler"` for modern imports

⚠️ **Monorepo Structure:**
- npm workspaces - dependencies partagées via workspaces config
- Shared types package - `"shared": "file:../shared"` dans frontend/backend package.json
- NEVER use npm link - workspaces handle linking automatically

---

## Critical Implementation Rules

### Language-Specific Rules (TypeScript/JavaScript)

#### TypeScript Configuration Requirements

⚠️ **Strict Mode OBLIGATOIRE:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```
- NEVER use `any` type - utiliser `unknown` si type vraiment inconnu
- NEVER disable strict checks with `// @ts-ignore` ou `// @ts-nocheck`
- TOUJOURS typer les paramètres de fonction et retours

⚠️ **ES Modules ONLY:**
- `"type": "module"` in ALL package.json files
- Use `import/export` syntax - NEVER `require()` or `module.exports`
- File extensions: `.ts` pour code, `.d.ts` pour type definitions
- `moduleResolution: "bundler"` for modern imports

#### Import/Export Patterns

**Shared Types Import:**
```typescript
// ✅ CORRECT - Import types from shared package
import type { Player, Game, Territory } from 'shared/types'
import { PlayerSchema, GameSchema } from 'shared/schemas'
import { GameError, ValidationError } from 'shared/errors'

// ❌ INCORRECT
import { Player } from '../../../shared/src/types/player' // Pas de relative paths vers shared
```

**Vue 3 Composition API:**
```typescript
// ✅ CORRECT - <script setup> avec TypeScript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Player } from 'shared/types'

const players = ref<Player[]>([])
const activePlayerCount = computed(() => players.value.filter(p => p.status === 'playing').length)
</script>

// ❌ INCORRECT - Options API
<script lang="ts">
export default {
  data() { return { players: [] } } // NEVER use Options API
}
</script>
```

#### Zod Schema Pattern (CRITICAL - AI Agents Often Get This Wrong)

⚠️ **STRICT NAMING CONVENTION:**
```typescript
// ✅ CORRECT - PascalCase schema name + "Schema" suffix
export const PlayerSchema = z.object({
  id: z.string().uuid(),
  pseudo: z.string().min(3).max(20),
  status: z.enum(['waiting', 'ready', 'playing', 'eliminated'])
})

// Type inference - NO "Schema" suffix on type
export type Player = z.infer<typeof PlayerSchema>

// Usage
const player = PlayerSchema.parse(data) // Backend validation (throws)
const result = PlayerSchema.safeParse(data) // Frontend validation (returns result)

// ❌ INCORRECT
export const playerSchema = z.object({ ... }) // Pas PascalCase
export const Player = z.object({ ... }) // Conflit avec type name
export type PlayerType = z.infer<typeof PlayerSchema> // Suffixe inutile
export type IPlayer = z.infer<typeof PlayerSchema> // Pas de "I" prefix
```

**Validation Locations:**
- **Frontend**: Use `safeParse()` for UX (immediate feedback, no throw)
- **Backend**: Use `parse()` for security (throws ZodError, caught by error handler)
- **Shared**: Export both schema and inferred type

#### Error Handling Pattern

⚠️ **Custom Error Classes REQUIRED:**
```typescript
// ✅ CORRECT - Use custom typed error classes
import { GameError, ValidationError } from 'shared/errors'

async function handleAttack(data: unknown) {
  try {
    const validated = AttackSchema.parse(data)
    const result = await gameEngine.processAttack(validated)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid attack data', error.errors)
    }
    if (error instanceof GameError) {
      logger.warn({ err: error }, 'Attack failed (expected)')
      throw error
    }
    logger.error({ err: error }, 'Unexpected error')
    throw new GameError('Attack processing failed')
  }
}

// ❌ INCORRECT
async function handleAttack(data: any) { // any type
  const result = await gameEngine.processAttack(data) // No validation, no try/catch
  return result
}
```

#### Async/Await Pattern

⚠️ **ALWAYS use async/await (not Promises .then()):**
```typescript
// ✅ CORRECT
async function createRoom(config: GameConfig) {
  try {
    const room = await api.createRoom(config)
    return room
  } catch (error) {
    handleError(error)
  }
}

// ❌ INCORRECT
function createRoom(config: GameConfig) {
  return api.createRoom(config).then(room => room).catch(handleError) // Pas .then()
}
```

**Backend Logging in Catch Blocks:**
```typescript
// ✅ CORRECT - Structured logging avec contexte
try {
  // ...
} catch (error) {
  logger.error({
    err: error,
    roomCode,
    playerId,
    context: 'handleAttack'
  }, 'Failed to process attack')
  throw new GameError('Attack failed')
}

// ❌ INCORRECT
catch (error) {
  console.log('Error:', error) // NEVER use console.log
  logger.error('Error') // Pas d'objet error, pas de contexte
}
```

---

### Framework-Specific Rules

#### Vue 3 Composition API (Frontend)

⚠️ **NEVER use Options API - Composition API ONLY:**
```typescript
// ✅ CORRECT - <script setup> avec Composition API
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Player } from 'shared/types'

const players = ref<Player[]>([])
const activeCount = computed(() => players.value.filter(p => p.status === 'playing').length)

onMounted(() => {
  loadPlayers()
})
</script>

// ❌ INCORRECT - Options API
<script lang="ts">
export default {
  data() { return { players: [] } },
  computed: { activeCount() { ... } },
  mounted() { ... }
}
</script>
```

**Reactivity Rules:**
- Use `ref()` for primitives: `const count = ref(0)`
- Use `ref()` for objects too (préféré sur `reactive()` pour consistency)
- Access ref values with `.value`: `count.value++`
- In templates, `.value` is automatic: `{{ count }}`
- Computed properties: `const total = computed(() => count.value * 2)`

**Props & Emits Typing:**
```typescript
// ✅ CORRECT - TypeScript props definition
const props = defineProps<{
  player: Player
  territories: Territory[]
}>()

const emit = defineEmits<{
  'territory-selected': [territoryId: string]
  'player-ready': []
}>()

// Usage
emit('territory-selected', 'T15')

// ❌ INCORRECT
const props = defineProps({ player: Object }) // Pas de typage
```

#### Pinia 3 Stores (CRITICAL - Immutability Pattern)

⚠️ **State Updates MUST BE IMMUTABLE:**
```typescript
// ✅ CORRECT - Immutable updates avec spread operators
export const useGameStore = defineStore('game', () => {
  const territories = ref<Territory[]>([])

  function addTerritory(territory: Territory) {
    territories.value = [...territories.value, territory] // Spread
  }

  function updateTerritory(id: string, updates: Partial<Territory>) {
    territories.value = territories.value.map(t =>
      t.id === id ? { ...t, ...updates } : t // Spread objects
    )
  }

  function removeTerritory(id: string) {
    territories.value = territories.value.filter(t => t.id !== id)
  }

  return { territories, addTerritory, updateTerritory, removeTerritory }
})

// ❌ INCORRECT - Mutable updates
function addTerritory(territory: Territory) {
  territories.value.push(territory) // NEVER mutate directly
}

function updateTerritory(id: string, updates: Partial<Territory>) {
  const t = territories.value.find(t => t.id === id)
  Object.assign(t, updates) // NEVER mutate objects directly
}
```

**Store Organization:**
- **One file per store**: `gameStore.ts`, `lobbyStore.ts`, `playerStore.ts`, `battleStore.ts`, `websocketStore.ts`
- **Composition API style**: `defineStore('name', () => { const state = ref(); return { state } })`
- **Store communication**: Stores can import and use other stores
- **Naming**: `useGameStore()` pattern (camelCase avec "use" prefix)

**Getters Pattern:**
```typescript
export const useGameStore = defineStore('game', () => {
  const territories = ref<Territory[]>([])

  // Getter = computed property
  const playerTerritories = computed(() => (playerId: string) =>
    territories.value.filter(t => t.ownerId === playerId)
  )

  return { territories, playerTerritories }
})
```

#### Fastify 5.6 Backend Patterns

⚠️ **Plugin Architecture:**
```typescript
// ✅ CORRECT - Register plugins avec await
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
})

// MUST use await for plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
})

await fastify.register(websocket)

// ❌ INCORRECT
fastify.register(cors) // Missing await
```

**Logging Pattern:**
```typescript
// ✅ CORRECT - Use Pino logger (intégré Fastify)
fastify.log.info({ roomCode, players: 8 }, 'Game started')
fastify.log.error({ err: error, context: 'handleAttack' }, 'Attack failed')

// ❌ INCORRECT
console.log('Game started') // NEVER use console.log
logger.info('Game started') // Pas de structured data
```

**Error Handler Pattern:**
```typescript
// ✅ CORRECT - Global error handler avec custom errors
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    fastify.log.error({ err: error, code: error.code })
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    })
  }

  fastify.log.fatal(error)
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Une erreur est survenue' }
  })
})
```

**Route Typing:**
```typescript
// ✅ CORRECT - TypeScript route typing
fastify.post<{
  Body: CreateRoomRequest
  Reply: CreateRoomResponse
}>('/api/rooms', async (request, reply) => {
  const validated = CreateRoomSchema.parse(request.body)
  const room = await roomManager.createRoom(validated)
  return reply.status(201).send(room)
})
```

#### WebSocket Native Pattern (ULTRA CRITICAL)

⚠️ **MUST use native WebSocket - NEVER Socket.io:**

**Server-Side (Fastify + @fastify/websocket):**
```typescript
// ✅ CORRECT - Native WebSocket avec @fastify/websocket
await fastify.register(websocket)

fastify.get('/ws', { websocket: true }, (socket, req) => {
  const connectionId = generateId()

  socket.on('message', async (message) => {
    const { event, data } = JSON.parse(message.toString())

    // Validate with Zod
    const eventSchema = ClientEventSchemas[event]
    const validatedData = eventSchema.parse(data)

    // Handle event
    await eventHandlers[event](socket, validatedData, connectionId)
  })

  socket.on('close', () => {
    handleDisconnect(connectionId)
  })
})

// Broadcasting manuel
function broadcastToRoom(roomCode: string, event: string, data: any) {
  const room = rooms.get(roomCode)
  room.connections.forEach(socket => {
    socket.send(JSON.stringify({ event, data }))
  })
}

// ❌ INCORRECT - Socket.io
import { Server } from 'socket.io' // NEVER use Socket.io
const io = new Server(server)
io.on('connection', (socket) => { ... })
```

**Client-Side (ws library):**
```typescript
// ✅ CORRECT - Native WebSocket client
import WebSocket from 'ws'

export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect(url: string) {
    ws.value = new WebSocket(url) // ws:// protocol

    ws.value.onopen = () => { connected.value = true }
    ws.value.onclose = () => { connected.value = false }
    ws.value.onmessage = (event) => handleMessage(event)
  }

  function send<T extends keyof ClientToServerEvents>(
    event: T,
    data: ClientToServerEvents[T]
  ) {
    ws.value?.send(JSON.stringify({ event, data }))
  }

  return { connected, connect, send }
})

// ❌ INCORRECT - Socket.io client
import io from 'socket.io-client' // NEVER use Socket.io
const socket = io('http://localhost:3000')
```

**Event Format (Shared Convention):**
```typescript
// ✅ CORRECT - { event, data } format with namespace:action
{
  "event": "player:join",
  "data": { "pseudo": "Sam", "roomCode": "VENDETTA" }
}

{
  "event": "battle:progress",
  "data": { "attackerForce": 150, "defenderForce": 120 }
}

// ❌ INCORRECT
{ "type": "join", "payload": { ... } } // Pas le bon format
{ "action": "playerJoin", "data": { ... } } // Pas namespace:action
```

#### Canvas 2D Native Rendering

⚠️ **Use Canvas 2D API - NEVER PixiJS or WebGL:**
```typescript
// ✅ CORRECT - Canvas 2D dans Vue component
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const canvas = ref<HTMLCanvasElement>()

onMounted(() => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  // Rendering logic
  function render() {
    ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

    // Draw territories
    territories.forEach(territory => {
      ctx.fillStyle = territory.color
      ctx.fillRect(territory.x, territory.y, territory.width, territory.height)
    })

    requestAnimationFrame(render)
  }

  render()
})
</script>

<template>
  <canvas ref="canvas" width="800" height="600"></canvas>
</template>

// ❌ INCORRECT
import * as PIXI from 'pixi.js' // NEVER use PixiJS/WebGL pour grille 20×20
const app = new PIXI.Application()
```

**Performance Optimization:**
- Throttle updates: max 60 FPS avec `requestAnimationFrame()`
- Avoid full clears: only redraw changed areas si possible
- Use offscreen canvas for complex pre-rendering

---

### Code Quality & Style Rules

#### File Naming Conventions

⚠️ **STRICT naming pattern - AI agents often get this wrong:**

| File Type | Convention | ✅ Example | ❌ Anti-pattern |
|-----------|-----------|---------|----------------|
| Vue Components | PascalCase.vue | `GameMap.vue`, `BattleProgress.vue` | `gameMap.vue`, `game-map.vue` |
| TypeScript Files | camelCase.ts | `gameEngine.ts`, `websocketHandler.ts` | `GameEngine.ts`, `websocket-handler.ts` |
| Test Files | `{filename}.test.ts` | `gameEngine.test.ts` | `test.gameEngine.ts`, `gameEngineTest.ts` |
| Type Definitions | camelCase.d.ts | `events.d.ts` | `Events.d.ts` |
| Zod Schemas | camelCase.ts (in `/schemas/`) | `player.ts`, `game.ts` | `playerSchema.ts`, `Player.ts` |

#### Code Naming Conventions

```typescript
// ✅ CORRECT
const gameState = ref()                     // Variables: camelCase
function calculateForce() { }               // Functions: camelCase
const MAX_PLAYERS = 10                      // Constants: SCREAMING_SNAKE_CASE
type Player = { }                          // Types: PascalCase
interface GameState { }                    // Interfaces: PascalCase
export const PlayerSchema = z.object({ })  // Zod schemas: PascalCase + "Schema"
export type Player = z.infer<typeof PlayerSchema> // Types from Zod: PascalCase (no suffix)
const useGameStore = defineStore()         // Stores: "use" prefix + camelCase
function useAudio() { }                    // Composables: "use" prefix + camelCase

// ❌ INCORRECT
const GameState = ref()                    // Variables NOT PascalCase
function CalculateForce() { }              // Functions NOT PascalCase
const maxPlayers = 10                      // Constants NOT camelCase
type player = { }                          // Types NOT lowercase
export const playerSchema = z.object({ })  // Schemas NOT camelCase
export type PlayerType = z.infer<>         // NO "Type" suffix
const gameStore = defineStore()            // Stores NEED "use" prefix
function audioManager() { }                // Composables NEED "use" prefix
```

#### WebSocket Event Naming (CRITICAL)

⚠️ **MUST use `namespace:action` format:**

```typescript
// ✅ CORRECT - namespace:action pattern
socket.send({ event: 'player:join', data: { ... } })
socket.send({ event: 'action:attack', data: { ... } })
socket.send({ event: 'battle:progress', data: { ... } })
socket.send({ event: 'game:victory', data: { ... } })

// ❌ INCORRECT
socket.send({ event: 'join', data: { ... } })           // Missing namespace
socket.send({ event: 'playerJoin', data: { ... } })     // camelCase instead of colon
socket.send({ event: 'player_join', data: { ... } })    // snake_case
socket.send({ type: 'player:join', data: { ... } })     // "type" instead of "event"
```

**Valid Namespaces:**
- `player:` - Player actions (join, ready, disconnect)
- `territory:` - Territory actions (select, update)
- `action:` - Game actions (attack, defend)
- `battle:` - Battle events (start, progress, result)
- `game:` - Game state (start, stateUpdate, victory)
- `lobby:` - Lobby events (update)
- `error` - Error events (no namespace)

#### API Endpoint Naming

⚠️ **REST conventions with plural resources:**

```typescript
// ✅ CORRECT
POST   /api/rooms              // Collection: plural
POST   /api/rooms/:code/join   // Action after resource
GET    /health                 // Singular for non-resource

// Query params: camelCase
GET /api/rooms?maxPlayers=10

// Path params: camelCase
GET /api/rooms/:roomCode

// ❌ INCORRECT
POST /api/createRoom           // Verb in endpoint
POST /api/room                 // Singular for collection
GET  /api/rooms/:room_code     // snake_case param
```

#### Folder Organization

⚠️ **Domain-based organization (NOT type-based):**

```
✅ CORRECT - Organization by domain
frontend/src/components/
├── game/           # Game-related components
│   ├── GameMap.vue
│   ├── GameHeader.vue
│   └── GameActionHistory.vue
├── battle/         # Battle-related components
│   ├── BattleProgress.vue
│   └── BattleSummary.vue
├── lobby/          # Lobby-related components
│   └── LobbyPlayerList.vue
└── ui/             # Generic reusable UI
    ├── Button.vue
    └── Card.vue

❌ INCORRECT - Organization by type
components/
├── maps/
│   └── GameMap.vue
├── headers/
│   └── GameHeader.vue
├── progress/
│   └── BattleProgress.vue
└── lists/
    └── LobbyPlayerList.vue
```

**Test Co-location:**
```
✅ CORRECT - Tests next to source
backend/src/managers/
├── GameEngine.ts
├── GameEngine.test.ts      # Co-located
├── RoomManager.ts
└── RoomManager.test.ts

❌ INCORRECT - Separate test folder
backend/
├── src/managers/GameEngine.ts
└── tests/managers/GameEngine.test.ts
```

#### JSON Conventions

**Key Casing:**
```typescript
// ✅ CORRECT - camelCase keys
{
  "playerId": "uuid",
  "twitchUsername": "SamStreamer",
  "territoryIds": ["T1", "T2"]
}

// ❌ INCORRECT
{
  "player_id": "uuid",           // snake_case
  "TwitchUsername": "Sam"        // PascalCase
}
```

**Date Format:**
```typescript
// ✅ CORRECT - ISO 8601
{
  "createdAt": "2026-01-08T18:30:00.000Z"
}

// ❌ INCORRECT
{
  "createdAt": 1704652200000,              // Unix timestamp
  "createdAt": "08/01/2026 18:30:00"      // Custom format
}
```

**API Response Format:**
```typescript
// ✅ CORRECT - Direct data
POST /api/rooms
Response 201: { "roomCode": "VENDETTA", "roomId": "uuid" }

// Error responses
Response 400: {
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data",
    "details": { ... }
  }
}

// ❌ INCORRECT - Wrapped response
{
  "success": true,
  "data": { "roomCode": "VENDETTA" }
}
```

**WebSocket Message Format:**
```typescript
// ✅ CORRECT - { event, data } structure
{
  "event": "battle:progress",
  "data": { "attackerForce": 150 }
}

// ❌ INCORRECT
{
  "type": "battle",              // "type" instead of "event"
  "action": "progress",          // Split event name
  "payload": { ... }             // "payload" instead of "data"
}
```

#### Documentation Rules

**Comment Style:**
- Use comments ONLY for non-obvious logic or business rules
- NO commenting obvious code (self-documenting names preferred)
- Backend: Document complex algorithms (combat formule, etc.)
- Frontend: Document tricky Vue reactivity or Canvas rendering logic

```typescript
// ✅ CORRECT - Comment explains WHY, not WHAT
// Dual counting compensates for Twitch IRC 2-4 sec delay
const optimisticCounter = ref(0)  // Client UI feedback
const authoritativeCounter = ref(0) // Server calculation

// ❌ INCORRECT - Obvious comments
const players = ref([]) // Array of players
function addPlayer(player) { } // Adds a player
```

---

### Critical Don't-Miss Rules

#### Anti-Patterns That Will Break The Architecture

🚨 **NEVER DO THESE - They violate core architectural decisions:**

**1. Using Socket.io instead of native WebSocket**
```typescript
// ❌ CRITICAL ERROR - Socket.io forbidden
import { Server } from 'socket.io'
const io = new Server(server)

// ✅ MUST USE - Native WebSocket
import websocket from '@fastify/websocket'
await fastify.register(websocket)
```
**Why:** Architecture optimized for <200ms latency with native ws://. Socket.io adds overhead, rooms complexity, and fallback protocols we don't need.

**2. Mutating Pinia store state directly**
```typescript
// ❌ CRITICAL ERROR - Direct mutation breaks reactivity
function addTerritory(t: Territory) {
  territories.value.push(t)  // BREAKS VUE 3 REACTIVITY
}

// ✅ MUST USE - Immutable updates
function addTerritory(t: Territory) {
  territories.value = [...territories.value, t]
}
```
**Why:** Vue 3 reactivity requires immutable patterns. Direct mutations cause silent bugs and missing UI updates.

**3. Using Vue Options API**
```typescript
// ❌ CRITICAL ERROR - Options API forbidden
<script lang="ts">
export default {
  data() { return { count: 0 } }
}
</script>

// ✅ MUST USE - Composition API only
<script setup lang="ts">
const count = ref(0)
</script>
```
**Why:** Architecture built on Composition API patterns. Options API incompatible with stores, composables, and type safety patterns.

**4. Using Zod parse() on frontend**
```typescript
// ❌ WRONG - parse() throws on frontend
const player = PlayerSchema.parse(formData) // Throws error = bad UX

// ✅ CORRECT - safeParse() for UX feedback
const result = PlayerSchema.safeParse(formData)
if (!result.success) {
  showValidationErrors(result.error)
}
```
**Why:** Frontend needs graceful validation with user feedback. Backend uses parse() for security (throws caught by error handler).

**5. Skipping server-side validation**
```typescript
// ❌ CRITICAL SECURITY ERROR - Never trust client
fastify.post('/api/rooms', async (request) => {
  const room = await createRoom(request.body) // No validation
})

// ✅ MUST VALIDATE - Always use Zod on server
fastify.post('/api/rooms', async (request) => {
  const validated = CreateRoomSchema.parse(request.body)
  const room = await createRoom(validated)
})
```
**Why:** Client validation is for UX. Server validation is for security. ALWAYS validate server-side.

**6. Using console.log for logging**
```typescript
// ❌ WRONG - No structured logging
console.log('Game started', roomCode)

// ✅ CORRECT - Pino structured logging
fastify.log.info({ roomCode, players: 8 }, 'Game started')
```
**Why:** Pino provides structured JSON logs, log levels, performance optimization, and production log parsing.

**7. Using PixiJS/WebGL for 20×20 grid**
```typescript
// ❌ WRONG - Overkill for simple grid
import * as PIXI from 'pixi.js'
const app = new PIXI.Application()

// ✅ CORRECT - Canvas 2D native
const ctx = canvas.getContext('2d')
ctx.fillRect(x, y, width, height)
```
**Why:** Canvas 2D maintains 60 FPS for 20×20 grid. WebGL adds 200KB+ bundle size for zero performance benefit.

**8. Using 'any' type in TypeScript**
```typescript
// ❌ WRONG - Disables type checking
function handleData(data: any) { }

// ✅ CORRECT - Use unknown or proper types
function handleData(data: unknown) {
  const validated = DataSchema.parse(data)
}
```
**Why:** TypeScript strict mode required. 'any' defeats entire purpose of type safety.

---

#### Edge Cases You Must Handle

🎯 **These edge cases WILL happen in production:**

**1. Twitch IRC 2-4 Second Delay**
```typescript
// ✅ REQUIRED - Dual counting pattern
const optimisticCounter = ref(0)      // Client UI (instant feedback)
const authoritativeCounter = ref(0)   // Server IRC (final calculation)

// Battle result uses ONLY authoritativeCounter
const winner = authoritativeCounter.value > defenderCounter.value
```
**Why:** Twitch IRC delay is incompressible. Dual counting gives instant UX while maintaining fairness.

**2. WebSocket Reconnection**
```typescript
// ✅ REQUIRED - Auto-reconnect with exponential backoff
ws.value.onclose = () => {
  connected.value = false
  setTimeout(() => reconnect(), backoff) // Retry with backoff
}
```
**Why:** Network interruptions happen. Detect disconnect <5 sec, resync state <2 sec (NFR requirements).

**3. Room Cleanup (Memory Leaks)**
```typescript
// ✅ REQUIRED - TTL garbage collection
class RoomManager {
  private rooms = new Map<string, { game: Game, lastActivity: Date }>()

  cleanupStaleRooms() {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity.getTime() > 30 * 60 * 1000) {
        this.rooms.delete(code) // 30 min TTL
      }
    }
  }
}
```
**Why:** In-memory state grows infinitely without cleanup. 30 min TTL prevents memory leaks.

**4. Concurrent Battle Locks**
```typescript
// ✅ REQUIRED - State machine prevents concurrent battles
function canAttack(territoryId: string): boolean {
  const territory = getTerritoire(territoryId)
  return !territory.isAttacking && !territory.isUnderAttack
}
```
**Why:** Territory can't simultaneously attack AND be attacked. State machine prevents race conditions.

**5. Rage-Quit Handling**
```typescript
// ✅ REQUIRED - Free territories on disconnect
socket.on('close', () => {
  const player = getPlayerByConnection(connectionId)
  player.territories.forEach(t => {
    t.ownerId = 'BOT' // Convert to free zone
  })
  broadcastToRoom(roomCode, 'player:disconnect', { playerId: player.id })
})
```
**Why:** Disconnected players freeze gameplay. Auto-convert to BOT territories enables game continuation.

---

#### Security Rules (Production)

🔒 **Security requirements for production deployment:**

**1. Input Validation Everywhere**
- ✅ Client: Zod `safeParse()` for UX
- ✅ Server: Zod `parse()` for security
- ✅ WebSocket: Validate ALL events with schemas
- ❌ NEVER trust any client input

**2. Error Message Sanitization**
```typescript
// ✅ CORRECT - Generic error to client
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.fatal(error) // Log full error server-side
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Une erreur est survenue' }
  })
})

// ❌ WRONG - Expose stack trace
return reply.status(500).send({ error: error.stack })
```

**3. CORS Configuration**
```typescript
// ✅ CORRECT - Environment-based CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN // http://localhost:5173 (dev) or domain (prod)
})

// ❌ WRONG - Allow all origins
await fastify.register(cors, { origin: '*' })
```

**4. Environment Variables**
- ✅ Use `.env` files for config
- ✅ Add `.env` to `.gitignore`
- ❌ NEVER commit secrets to git
- ❌ NEVER hardcode API keys or tokens

---

#### Performance Gotchas

⚡ **Performance patterns to avoid:**

**1. Canvas Full Clears Every Frame**
```typescript
// ❌ SLOW - Full clear every frame
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // Redraw everything
}

// ✅ FASTER - Only redraw changed areas
function render() {
  changedTerritories.forEach(t => {
    ctx.clearRect(t.x, t.y, t.width, t.height)
    ctx.fillRect(t.x, t.y, t.width, t.height)
  })
}
```

**2. WebSocket Message Flooding**
```typescript
// ❌ BAD - Send every message instantly
twitchClient.on('message', (msg) => {
  broadcastToRoom('battle:progress', { messages: count++ })
})

// ✅ GOOD - Throttle updates
const throttledBroadcast = throttle(() => {
  broadcastToRoom('battle:progress', currentStats)
}, 500) // Max 2 updates/sec
```

**3. Pinia Store Performance**
```typescript
// ❌ SLOW - Creates new computed every call
territories.value.filter(t => t.ownerId === playerId)

// ✅ FAST - Memoized computed property
const playerTerritories = computed(() => (playerId: string) =>
  territories.value.filter(t => t.ownerId === playerId)
)
```

**4. Twitch IRC Parsing**
```typescript
// ✅ GRACEFUL - Handle typos, case, spaces
function parseCommand(message: string): Command | null {
  const normalized = message.trim().toUpperCase()
  if (normalized.includes('ATTACK') || normalized.includes('ATK')) {
    return { type: 'attack' }
  }
  if (normalized.includes('DEFEND') || normalized.includes('DEF')) {
    return { type: 'defend' }
  }
  return null // Ignore invalid
}
```

---

#### Implementation Checklist

Before implementing ANY feature, verify:

- [ ] Using native WebSocket (NOT Socket.io)
- [ ] Pinia stores use immutable updates (spread operators)
- [ ] Vue components use Composition API (NOT Options API)
- [ ] Zod validation on client (safeParse) AND server (parse)
- [ ] Custom error classes (NOT generic Error)
- [ ] Pino logging (NOT console.log)
- [ ] Canvas 2D native (NOT PixiJS/WebGL)
- [ ] TypeScript strict mode (NO any types)
- [ ] WebSocket events use namespace:action format
- [ ] File names follow convention (PascalCase .vue, camelCase .ts)
- [ ] Imports use shared package (NOT relative paths to ../shared)
- [ ] Error handling with try/catch + custom errors
- [ ] Loading states with boolean flags
- [ ] Edge cases handled (reconnection, cleanup, concurrent actions)

---

## Usage Guidelines

### For AI Agents

**Before implementing ANY code:**

1. ✅ **Read this entire file** - All rules are critical and prevent common mistakes
2. ✅ **Follow ALL rules exactly** - No exceptions unless explicitly discussed with user
3. ✅ **When in doubt, ask** - Prefer clarification over assumptions
4. ✅ **Refer to architecture.md** - For detailed architectural decisions and context
5. ✅ **Check the Implementation Checklist** - Before submitting any code

**Critical reminders:**
- NEVER use Socket.io (use native WebSocket)
- NEVER mutate Pinia store state directly (use spread operators)
- NEVER use Vue Options API (use Composition API only)
- NEVER skip Zod validation on server-side
- NEVER use `any` type in TypeScript

### For Humans

**Maintenance:**
- ✅ Update this file when technology stack changes
- ✅ Add new patterns as they emerge during development
- ✅ Remove rules that become obvious or outdated
- ✅ Review quarterly to keep content lean and relevant

**Best practices:**
- Keep this file focused on **unobvious** rules agents might miss
- Remove redundant information that agents already know
- Prioritize rules that prevent bugs or architectural violations
- Use specific examples with ✅/❌ patterns

---

## Document Summary

This project context file captures **50+ critical implementation rules** from the architecture document that AI agents must follow to ensure consistent, high-quality code across all features.

**Key Focus Areas:**
- ⚡ Native WebSocket (`ws://`) for <200ms real-time performance
- 🔄 Immutable Pinia stores for Vue 3 reactivity
- 🔒 Strict TypeScript with Zod validation everywhere
- ⏱️ Dual counting pattern for Twitch IRC 2-4s delay compensation
- 🎨 Canvas 2D native rendering (NOT PixiJS/WebGL)

**Architecture Context:**
- Full architectural decisions: `_bmad-output/planning-artifacts/architecture.md`
- Project requirements: `_bmad-output/planning-artifacts/prd.md`
- This context file: `_bmad-output/project-context.md`

**Last Updated:** 2026-01-08
