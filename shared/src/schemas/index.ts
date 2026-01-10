// Shared Zod validation schemas
// Export all schemas here
import { z } from 'zod'

// Placeholder schema
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Export all entity schemas
export { PlayerSchema, PLAYER_COLORS } from './player'
export { GameSchema, GameConfigSchema } from './game'
export { TerritorySchema, CellSchema, TerritorySizeSchema, TerritorySelectionSchema } from './territory'
export { BattleSchema, BattleStatsSchema } from './battle'
export {
  ROOM_CODE_REGEX,
  CreateRoomRequestSchema,
  CreateRoomResponseSchema,
  CreatorSchema,
  RoomSchema,
  RoomExistsResponseSchema,
  PlayerInRoomSchema,
  RoomStateSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema
} from './room'

// WebSocket event schemas
export {
  LobbyJoinEventSchema,
  LobbyLeaveEventSchema,
  LobbySyncEventSchema,
  LobbyPlayerJoinedEventSchema,
  LobbyPlayerLeftEventSchema,
  WebSocketErrorEventSchema,
  WebSocketMessageSchema,
  TerritorySelectEventSchema,
  TerritorySelectedEventSchema,
  TerritoryReleasedEventSchema
} from './events'
