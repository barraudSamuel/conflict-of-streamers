import { z } from 'zod'
import { PlayerInRoomSchema, ROOM_CODE_REGEX } from './room'
import { GameConfigSchema } from './game'

// =====================
// Client → Server Events
// =====================

// Client sends to join lobby WebSocket channel
export const LobbyJoinEventSchema = z.object({
  roomCode: z.string().regex(ROOM_CODE_REGEX),
  playerId: z.string().uuid()
})

// Client sends to leave lobby (explicit leave, not disconnect)
export const LobbyLeaveEventSchema = z.object({})

// Client sends to select a territory
export const TerritorySelectEventSchema = z.object({
  territoryId: z.string()
})

// =====================
// Server → Client Events
// =====================

// Server sends current lobby state to joining player
export const LobbySyncEventSchema = z.object({
  players: z.array(PlayerInRoomSchema),
  config: GameConfigSchema
})

// Server broadcasts when a new player joins
export const LobbyPlayerJoinedEventSchema = PlayerInRoomSchema

// Server broadcasts when a player leaves
export const LobbyPlayerLeftEventSchema = z.object({
  playerId: z.string().uuid(),
  reason: z.enum(['left', 'disconnected'])
})

// Server sends error to client
export const WebSocketErrorEventSchema = z.object({
  code: z.string(),
  message: z.string()
})

// Server broadcasts when a player selects a territory
export const TerritorySelectedEventSchema = z.object({
  playerId: z.string(),
  territoryId: z.string(),
  color: z.string()
})

// Server broadcasts when a player releases a territory (changes selection)
export const TerritoryReleasedEventSchema = z.object({
  playerId: z.string(),
  territoryId: z.string()
})

// =====================
// Config Events
// =====================

// Validation limits for config fields (Story 2.6)
export const CONFIG_LIMITS = {
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
} as const

// Client sends to update game configuration (creator only)
export const ConfigUpdateEventSchema = z.object({
  battleDuration: z.number()
    .int()
    .min(CONFIG_LIMITS.battleDuration.min)
    .max(CONFIG_LIMITS.battleDuration.max)
    .optional(),
  cooldownBetweenActions: z.number()
    .int()
    .min(CONFIG_LIMITS.cooldownBetweenActions.min)
    .max(CONFIG_LIMITS.cooldownBetweenActions.max)
    .optional()
}).refine(
  (data) => data.battleDuration !== undefined || data.cooldownBetweenActions !== undefined,
  { message: 'At least one config field must be provided' }
)

// Server broadcasts updated configuration to all players
export const ConfigUpdatedEventSchema = z.object({
  battleDuration: z.number().int(),
  cooldownBetweenActions: z.number().int()
})

// =====================
// Game Events (Story 2.7 + Story 4.1)
// =====================

// Client sends to start the game (creator only)
// No payload needed - server knows roomCode from connection
export const GameStartEventSchema = z.object({})

// Server broadcasts when game starts
export const GameStartedEventSchema = z.object({
  roomCode: z.string(),
  startedAt: z.string().datetime(),
  players: z.array(PlayerInRoomSchema),
  config: GameConfigSchema
})

// Story 4.1: Server sends initial game state with map (after game:started)
export const GameStateInitEventSchema = z.object({
  territories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    cells: z.array(z.object({ x: z.number(), y: z.number() })),
    size: z.enum(['small', 'medium', 'large']),
    ownerId: z.string().nullable(),
    color: z.string().nullable(),
    adjacentTerritoryIds: z.array(z.string()),
    stats: z.object({
      attackBonus: z.number(),
      defenseBonus: z.number()
    }).optional(),
    isUnderAttack: z.boolean().default(false),
    isAttacking: z.boolean().default(false)
  })),
  players: z.array(PlayerInRoomSchema),
  config: GameConfigSchema
})

// Story 4.1: Server broadcasts territory ownership change
export const TerritoryUpdateEventSchema = z.object({
  territoryId: z.string(),
  newOwnerId: z.string().nullable(),
  previousOwnerId: z.string().nullable(),
  newColor: z.string().nullable()
})

// =====================
// Twitch Events (Story 3.1 + 3.4)
// =====================

// Server broadcasts when Twitch IRC connection fails
export const TwitchErrorEventSchema = z.object({
  code: z.enum(['TWITCH_CONNECTION_FAILED', 'TWITCH_DISCONNECTED', 'TWITCH_ERROR']),
  message: z.string()
})

// Story 3.4: Server broadcasts Twitch IRC connection status changes
export const TwitchConnectionStatusEventSchema = z.object({
  /** Current connection status */
  status: z.enum(['connecting', 'connected', 'disconnected', 'reconnecting', 'error']),
  /** Twitch channel name */
  channelName: z.string(),
  /** Number of reconnection attempts */
  attemptCount: z.number().int().nonnegative(),
  /** Last error message if connection failed */
  lastError: z.string().nullable(),
  /** True if connection has been unavailable for 3+ attempts */
  isTemporarilyUnavailable: z.boolean()
})

// =====================
// Battle Events (Story 4.2)
// =====================

// Client sends to initiate attack on adjacent territory
export const AttackActionEventSchema = z.object({
  fromTerritoryId: z.string(),  // Attacking territory (player's own)
  toTerritoryId: z.string()     // Target territory (adjacent)
})

// Error codes for attack validation failures
export const AttackFailedCodeSchema = z.enum([
  'NOT_ADJACENT',           // Territory not adjacent
  'ALREADY_ATTACKING',      // Territory is already attacking another
  'UNDER_ATTACK',           // Territory is currently being attacked
  'COOLDOWN_ACTIVE',        // Cooldown period not elapsed
  'NOT_YOUR_TERRITORY',     // Player doesn't own the attacking territory
  'INVALID_TARGET',         // Target territory doesn't exist or is own territory
  'GAME_NOT_STARTED'        // Game hasn't started yet
])

// Server sends when attack validation fails
export const AttackFailedEventSchema = z.object({
  code: AttackFailedCodeSchema,
  message: z.string(),                    // Localized French message
  cooldownRemaining: z.number().optional() // Seconds remaining if cooldown
})

// Server broadcasts when battle starts
export const BattleStartEventSchema = z.object({
  battleId: z.string(),
  attackerId: z.string(),                  // Player ID of attacker
  defenderId: z.string().nullable(),       // Player ID of defender (null for BOT)
  attackerTerritoryId: z.string(),
  defenderTerritoryId: z.string(),
  duration: z.number().int().positive(),   // Battle duration in seconds
  startTime: z.string().datetime(),        // ISO timestamp
  command: z.object({
    attack: z.string(),                     // "ATTACK T15" command text
    defend: z.string()                      // "DEFEND T15" command text
  })
})

// Server broadcasts when battle ends (Story 4.7 - defined here for completeness)
export const BattleEndEventSchema = z.object({
  battleId: z.string(),
  winnerId: z.string().nullable(),          // Player ID of winner (null if defender was BOT)
  attackerWon: z.boolean(),
  attackerForce: z.number(),
  defenderForce: z.number(),
  territoryTransferred: z.boolean(),
  transferredTerritoryId: z.string().optional()
})

// =====================
// WebSocket Message Wrapper
// =====================

// Generic WebSocket message format: { event, data }
export const WebSocketMessageSchema = z.object({
  event: z.string(),
  data: z.unknown()
})
