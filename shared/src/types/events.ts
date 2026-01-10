import { z } from 'zod'
import {
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
  TwitchErrorEventSchema,
  CONFIG_LIMITS
} from '../schemas/events'

// Re-export CONFIG_LIMITS for frontend validation
export { CONFIG_LIMITS }

// =====================
// Client → Server Events
// =====================

export type LobbyJoinEvent = z.infer<typeof LobbyJoinEventSchema>
export type LobbyLeaveEvent = z.infer<typeof LobbyLeaveEventSchema>
export type TerritorySelectEvent = z.infer<typeof TerritorySelectEventSchema>
export type ConfigUpdateEvent = z.infer<typeof ConfigUpdateEventSchema>

// =====================
// Server → Client Events
// =====================

export type LobbySyncEvent = z.infer<typeof LobbySyncEventSchema>
export type LobbyPlayerJoinedEvent = z.infer<typeof LobbyPlayerJoinedEventSchema>
export type LobbyPlayerLeftEvent = z.infer<typeof LobbyPlayerLeftEventSchema>
export type WebSocketErrorEvent = z.infer<typeof WebSocketErrorEventSchema>
export type TerritorySelectedEvent = z.infer<typeof TerritorySelectedEventSchema>
export type TerritoryReleasedEvent = z.infer<typeof TerritoryReleasedEventSchema>
export type ConfigUpdatedEvent = z.infer<typeof ConfigUpdatedEventSchema>

// =====================
// Game Events (Story 2.7)
// =====================

export type GameStartEvent = z.infer<typeof GameStartEventSchema>
export type GameStartedEvent = z.infer<typeof GameStartedEventSchema>

// =====================
// Twitch Events (Story 3.1)
// =====================

export type TwitchErrorEvent = z.infer<typeof TwitchErrorEventSchema>

// =====================
// WebSocket Message Wrapper
// =====================

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>

// =====================
// Event Name Constants
// =====================

export const LOBBY_EVENTS = {
  // Client → Server
  JOIN: 'lobby:join',
  LEAVE: 'lobby:leave',

  // Server → Client
  SYNC: 'lobby:sync',
  PLAYER_JOINED: 'lobby:playerJoined',
  PLAYER_LEFT: 'lobby:playerLeft',

  // Error
  ERROR: 'error'
} as const

export const TERRITORY_EVENTS = {
  // Client → Server
  SELECT: 'territory:select',

  // Server → Client
  SELECTED: 'territory:selected',
  RELEASED: 'territory:released'
} as const

export const CONFIG_EVENTS = {
  // Client → Server
  UPDATE: 'config:update',

  // Server → Client
  UPDATED: 'config:updated'
} as const

export const GAME_EVENTS = {
  // Client → Server
  START: 'game:start',

  // Server → Client
  STARTED: 'game:started'
} as const

export const TWITCH_EVENTS = {
  // Server → Client (Story 3.1)
  ERROR: 'twitch:error'
} as const

export type LobbyEventName = (typeof LOBBY_EVENTS)[keyof typeof LOBBY_EVENTS]
export type TerritoryEventName = (typeof TERRITORY_EVENTS)[keyof typeof TERRITORY_EVENTS]
export type ConfigEventName = (typeof CONFIG_EVENTS)[keyof typeof CONFIG_EVENTS]
export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS]
export type TwitchEventName = (typeof TWITCH_EVENTS)[keyof typeof TWITCH_EVENTS]
