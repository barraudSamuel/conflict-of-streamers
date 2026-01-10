// Shared TypeScript types
// Export all type definitions here

// Placeholder type
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// Export all entity types
export type { Player } from './player'
export type { Game, GameConfig } from './game'
export type { Territory, Cell, TerritorySize, TerritorySelection } from './territory'
export type { Battle, BattleStats } from './battle'
export type {
  CreateRoomRequest,
  CreateRoomResponse,
  Creator,
  Room,
  RoomExistsResponse,
  PlayerInRoom,
  RoomState,
  JoinRoomRequest,
  JoinRoomResponse
} from './room'

// WebSocket event types
export type {
  LobbyJoinEvent,
  LobbyLeaveEvent,
  LobbySyncEvent,
  LobbyPlayerJoinedEvent,
  LobbyPlayerLeftEvent,
  WebSocketErrorEvent,
  WebSocketMessage,
  LobbyEventName,
  TerritorySelectEvent,
  TerritorySelectedEvent,
  TerritoryReleasedEvent,
  TerritoryEventName,
  ConfigUpdateEvent,
  ConfigUpdatedEvent,
  ConfigEventName,
  GameStartEvent,
  GameStartedEvent,
  GameEventName,
  TwitchErrorEvent,
  TwitchEventName
} from './events'
export { LOBBY_EVENTS, TERRITORY_EVENTS, CONFIG_EVENTS, GAME_EVENTS, TWITCH_EVENTS, CONFIG_LIMITS } from './events'

// Twitch integration types (Story 3.1 + 3.2)
export type {
  TwitchMessage,
  TwitchConnectionStatus,
  TwitchState,
  CommandType,
  ParsedCommand,
  TwitchBattleStats,
  CommandCallback
} from './twitch'
