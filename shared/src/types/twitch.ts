/**
 * Twitch Integration Types (Story 3.1 + 3.2 + 3.4)
 * Types for Twitch IRC connection, message handling, and reconnection state
 */

export interface TwitchMessage {
  channel: string
  username: string
  displayName: string
  message: string
  timestamp: number
  userId?: string
}

export type TwitchConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

/**
 * Story 3.4: Connection state tracking for reconnection management
 * Tracks per-room Twitch IRC connection state
 */
export interface TwitchConnectionState {
  /** Current connection status */
  status: TwitchConnectionStatus
  /** Twitch channel name this room is connected to */
  channelName: string
  /** Number of reconnection attempts since last successful connection */
  attemptCount: number
  /** Timestamp of last reconnection attempt (ms since epoch) */
  lastAttemptAt: number | null
  /** Last error message if connection failed */
  lastError: string | null
  /** Timestamp when connection was established (ms since epoch) */
  connectedAt: number | null
}

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

  // Story 3.3: Unique user tracking
  /** Set of unique attacker usernames (normalized lowercase) */
  uniqueAttackers: Set<string>
  /** Set of unique defender usernames (normalized lowercase) */
  uniqueDefenders: Set<string>
  /** Per-user message counts for leaderboard */
  userMessageCounts: Map<string, UserCommandStats>
}

/**
 * Story 3.3: Per-user command statistics
 * Tracks individual user's attack/defend message counts
 */
export interface UserCommandStats {
  /** Number of attack commands from this user */
  attackCount: number
  /** Number of defend commands from this user */
  defendCount: number
  /** Display name (for UI rendering) */
  displayName: string
}

/**
 * Story 3.3: User spam stats for top 5 leaderboard (Story 4.8)
 * Used for battle summary display
 */
export interface UserSpamStats {
  /** Normalized username (lowercase) */
  username: string
  /** Twitch display name */
  displayName: string
  /** Total messages (attack + defend) */
  totalMessages: number
  /** Number of attack messages */
  attackMessages: number
  /** Number of defend messages */
  defendMessages: number
}

/**
 * Story 3.3: Serializable version of TwitchBattleStats for JSON/WebSocket
 * Converts Set/Map to arrays for JSON serialization
 */
export interface TwitchBattleStatsSerializable {
  /** Unique battle identifier */
  battleId: string
  /** Number of valid ATTACK commands received */
  attackCount: number
  /** Number of valid DEFEND commands received */
  defendCount: number
  /** Number of unique attackers */
  uniqueAttackerCount: number
  /** Number of unique defenders */
  uniqueDefenderCount: number
  /** Array of unique attacker usernames */
  uniqueAttackers: string[]
  /** Array of unique defender usernames */
  uniqueDefenders: string[]
  /** Per-user message counts as array for JSON */
  userMessageCounts: { username: string; stats: UserCommandStats }[]
  /** Battle start timestamp (ms since epoch) */
  startedAt: number
  /** Total number of commands tracked */
  commandCount: number
}

/** Callback type for command listeners */
export type CommandCallback = (roomCode: string, command: ParsedCommand) => void
