import { z } from 'zod'
import {
  LobbyJoinEventSchema,
  LobbyLeaveEventSchema,
  LobbySyncEventSchema,
  LobbyPlayerJoinedEventSchema,
  LobbyPlayerLeftEventSchema,
  WebSocketErrorEventSchema,
  WebSocketMessageSchema
} from '../schemas/events'

// =====================
// Client → Server Events
// =====================

export type LobbyJoinEvent = z.infer<typeof LobbyJoinEventSchema>
export type LobbyLeaveEvent = z.infer<typeof LobbyLeaveEventSchema>

// =====================
// Server → Client Events
// =====================

export type LobbySyncEvent = z.infer<typeof LobbySyncEventSchema>
export type LobbyPlayerJoinedEvent = z.infer<typeof LobbyPlayerJoinedEventSchema>
export type LobbyPlayerLeftEvent = z.infer<typeof LobbyPlayerLeftEventSchema>
export type WebSocketErrorEvent = z.infer<typeof WebSocketErrorEventSchema>

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

export type LobbyEventName = (typeof LOBBY_EVENTS)[keyof typeof LOBBY_EVENTS]
