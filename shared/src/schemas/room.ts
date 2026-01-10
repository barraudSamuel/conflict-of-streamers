import { z } from 'zod'
import { GameConfigSchema } from './game'
import { PLAYER_COLORS } from './player'

// Room code pattern: 6-10 uppercase alphanumeric (excluding I, O, 0, 1 for readability)
export const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6,10}$/

// Create Room Request Schema (from frontend to backend)
export const CreateRoomRequestSchema = z.object({
  creatorPseudo: z.string().min(3).max(20).trim(),
  config: GameConfigSchema.pick({
    battleDuration: true,
    cooldownBetweenActions: true
  }).partial() // All config fields optional, use defaults
})

// Creator data in response
export const CreatorSchema = z.object({
  id: z.string().uuid(),
  pseudo: z.string().min(3).max(20),
  color: z.enum(PLAYER_COLORS),
  avatarUrl: z.string()
})

// Create Room Response Schema (from backend to frontend)
export const CreateRoomResponseSchema = z.object({
  roomCode: z.string().regex(ROOM_CODE_REGEX),
  roomId: z.string().uuid(),
  creator: CreatorSchema
})

// Room Schema for full room state
export const RoomSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(ROOM_CODE_REGEX),
  creatorId: z.string().uuid(),
  status: z.enum(['lobby', 'playing', 'finished']),
  config: GameConfigSchema,
  playerIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Room exists check response
export const RoomExistsResponseSchema = z.object({
  exists: z.boolean(),
  roomCode: z.string().optional()
})

// Player in room (for join response and lobby)
export const PlayerInRoomSchema = z.object({
  id: z.string().uuid(),
  pseudo: z.string().min(3).max(20),
  color: z.enum(PLAYER_COLORS),
  avatarUrl: z.string(),
  isCreator: z.boolean(),
  isReady: z.boolean()
})

// Room state for lobby (includes all players)
export const RoomStateSchema = z.object({
  roomCode: z.string().regex(ROOM_CODE_REGEX),
  roomId: z.string().uuid(),
  players: z.array(PlayerInRoomSchema),
  config: GameConfigSchema
})

// Join Room Request Schema (from frontend to backend)
export const JoinRoomRequestSchema = z.object({
  pseudo: z.string().min(3).max(20).trim()
})

// Join Room Response Schema (from backend to frontend)
export const JoinRoomResponseSchema = z.object({
  player: PlayerInRoomSchema,
  room: RoomStateSchema
})
