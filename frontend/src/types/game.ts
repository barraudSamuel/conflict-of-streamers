export interface ActionLogFragment {
  text: string
  color?: string | null
}

export interface ActionLogEntry {
  id: string
  timestamp: number
  variant: 'info' | 'success' | 'error'
  parts: ActionLogFragment[]
}

export interface PlayerSummary {
  id: string
  twitchUsername: string
  color: string | null
  avatarUrl: string | null
  score: number
  territories: number
  isCurrent: boolean
  isAdmin: boolean
  connected: boolean
}

export interface RankingEntry extends PlayerSummary {
  rank: number
}

export interface BattleBalance {
  attackPercent: number
  defensePercent: number
}

export interface AttackParticipantSummary {
  id: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  messages: number
}

export interface AttackStats {
  attack: any
  remaining: number
  messages: number
  participants: number
  attackPoints: number
  defensePoints: number
  baseDefense: number
  topAttackers: AttackParticipantSummary[]
  topDefenders: AttackParticipantSummary[]
}

export interface ReinforcementStats {
  reinforcement: any
  remaining: number
  messages: number
  participants: number
  accumulatedBonus: number
  baseDefense: number
}

export interface LegendEntry {
  id: string
  label: string
  color?: string
  avatarUrl?: string | null
}

export interface GameInfoItem {
  label: string
  value: string
}

export interface AttackResult {
  attack: any
  outcome: 'win' | 'loss' | 'draw'
}
