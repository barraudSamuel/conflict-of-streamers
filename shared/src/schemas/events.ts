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
// Game Events (Story 2.7)
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

// =====================
// Twitch Events (Story 3.1)
// =====================

// Server broadcasts when Twitch IRC connection fails
export const TwitchErrorEventSchema = z.object({
  code: z.enum(['TWITCH_CONNECTION_FAILED', 'TWITCH_DISCONNECTED', 'TWITCH_ERROR']),
  message: z.string()
})

// =====================
// WebSocket Message Wrapper
// =====================

// Generic WebSocket message format: { event, data }
export const WebSocketMessageSchema = z.object({
  event: z.string(),
  data: z.unknown()
})
