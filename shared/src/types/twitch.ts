/**
 * Twitch Integration Types (Story 3.1 + 3.2)
 * Types for Twitch IRC connection and message handling
 */

export interface TwitchMessage {
  channel: string
  username: string
  displayName: string
  message: string
  timestamp: number
  userId?: string
}

export type TwitchConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface TwitchState {
  status: TwitchConnectionStatus
  channelName: string | null
  lastError?: string
}

/**
 * Story 3.2: Command parsing types
 * Types for parsing and counting Twitch chat commands
 */

/**
 * Valid command types recognized by the Twitch chat parser.
 * - 'ATTACK': Viewer wants to attack a territory (aliases: ATK, ATTAQUE)
 * - 'DEFEND': Viewer wants to defend a territory (aliases: DEF, DEFENSE, DEFENCE)
 */
export type CommandType = 'ATTACK' | 'DEFEND'

/** Parsed command extracted from a Twitch chat message */
export interface ParsedCommand {
  /** Command type (ATTACK or DEFEND) */
  type: CommandType
  /** Target territory identifier (normalized to uppercase) */
  territoryId: string
  /** Twitch username (login name) */
  username: string
  /** Twitch display name */
  displayName: string
  /** Timestamp when command was parsed (ms since epoch) */
  timestamp: number
  /** Original raw message from chat */
  rawMessage: string
}

/** Stats for counting commands during a battle - used by BattleCounter */
export interface TwitchBattleStats {
  /** Unique battle identifier */
  battleId: string
  /** Number of valid ATTACK commands received */
  attackCount: number
  /** Number of valid DEFEND commands received */
  defendCount: number
  /** All parsed commands for leaderboard analysis */
  commands: ParsedCommand[]
  /** Battle start timestamp (ms since epoch) */
  startedAt: number
}

/** Callback type for command listeners */
export type CommandCallback = (roomCode: string, command: ParsedCommand) => void
