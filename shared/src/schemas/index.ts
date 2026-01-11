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
export { PlayerSchema, PLAYER_COLORS, BOT_TERRITORY_COLOR, GRID_LINE_COLOR, TERRITORY_BORDER_COLOR } from './player'
export { GameSchema, GameConfigSchema, DEFAULT_GAME_CONFIG } from './game'
export { TerritorySchema, CellSchema, TerritorySizeSchema, TerritorySelectionSchema, TerritoryStatsSchema } from './territory'
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
  TerritoryReleasedEventSchema,
  ConfigUpdateEventSchema,
  ConfigUpdatedEventSchema,
  GameStartEventSchema,
  GameStartedEventSchema,
  GameStateInitEventSchema,
  TerritoryUpdateEventSchema,
  TwitchErrorEventSchema,
  TwitchConnectionStatusEventSchema,
  // Story 4.2: Battle events
  AttackActionEventSchema,
  AttackFailedEventSchema,
  AttackFailedCodeSchema,
  BattleStartEventSchema,
  BattleEndEventSchema,
  // Story 4.8: Battle summary schemas
  TopContributorSchema,
  BattleSideStatsSchema,
  BattleSummarySchema,
  CONFIG_LIMITS
} from './events'
