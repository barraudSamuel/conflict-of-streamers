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

// =====================
// WebSocket Message Wrapper
// =====================

// Generic WebSocket message format: { event, data }
export const WebSocketMessageSchema = z.object({
  event: z.string(),
  data: z.unknown()
})
