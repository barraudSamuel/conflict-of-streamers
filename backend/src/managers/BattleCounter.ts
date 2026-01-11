/**
 * BattleCounter (Story 3.2 + 3.3 + 4.4 + 4.5 + 4.8)
 * Counts and tracks Twitch chat commands during battles
 *
 * Provides:
 * - Per-battle command counting (attack/defend)
 * - Command storage for leaderboard analysis (top 5 spammers)
 * - Stats retrieval for force calculation (Story 4.6)
 * - Story 3.3: Unique user tracking for balancing formula (FR14, FR21)
 * - Story 4.4: Force calculation with territory bonuses (AR4, FR21-FR22)
 * - Story 4.5: Recent commands for message feed display (FR26-FR27)
 * - Story 4.8: Battle summary generation for post-battle display (FR30-FR33)
 */

import { logger } from '../utils/logger'
import { normalizeUsername } from '../utils/uniqueUserTracker'
import type {
  ParsedCommand,
  TwitchBattleStats,
  TwitchBattleStatsSerializable,
  UserCommandStats,
  UserSpamStats,
  FeedMessage,
  BattleSummary,
  TopContributor,
  BattleSideStats
} from 'shared/types'

/** Maximum commands stored per battle to prevent memory issues */
const MAX_COMMANDS_PER_BATTLE = 2000

/**
 * Story 4.4: Force calculation constants
 * Formula: Force = (messages × MESSAGE_WEIGHT) + (uniqueUsers × territoryBonus)
 */
const MESSAGE_WEIGHT = 0.7

/**
 * Story 4.4 + 4.5: Extended battle stats with territory bonuses and feed tracking
 */
interface BattleWithBonuses extends TwitchBattleStats {
  attackerTerritoryBonus: number
  defenderTerritoryBonus: number
  /** Story 4.5: Index of last command sent in broadcast (for incremental feed updates) */
  lastSentCommandIndex: number
}

class BattleCounterClass {
  private battles = new Map<string, BattleWithBonuses>()

  /**
   * Initialize counter for a new battle
   * Story 3.3: Now includes unique user tracking
   * Story 4.4: Added territory bonuses for force calculation
   * @param battleId - Unique identifier for the battle
   * @param attackerBonus - Territory attack bonus (from territory.stats.attackBonus)
   * @param defenderBonus - Territory defense bonus (from territory.stats.defenseBonus)
   */
  startBattle(battleId: string, attackerBonus: number = 1.0, defenderBonus: number = 1.0): void {
    if (this.battles.has(battleId)) {
      logger.warn({ battleId }, 'Battle already exists, resetting counter')
    }

    this.battles.set(battleId, {
      battleId,
      attackCount: 0,
      defendCount: 0,
      commands: [],
      startedAt: Date.now(),
      // Story 3.3: Unique user tracking
      uniqueAttackers: new Set<string>(),
      uniqueDefenders: new Set<string>(),
      userMessageCounts: new Map<string, UserCommandStats>(),
      // Story 4.4: Territory bonuses for force calculation
      attackerTerritoryBonus: attackerBonus,
      defenderTerritoryBonus: defenderBonus,
      // Story 4.5: Track last sent command for incremental feed
      lastSentCommandIndex: 0
    })

    logger.info({ battleId, attackerBonus, defenderBonus }, 'Battle counter initialized')
  }

  /**
   * Add a parsed command to the battle counter
   * Story 3.3: Now tracks unique users per command type
   * @param battleId - Battle to add command to
   * @param command - Parsed command from Twitch chat
   */
  addCommand(battleId: string, command: ParsedCommand): void {
    const battle = this.battles.get(battleId)
    if (!battle) {
      // Command for unknown battle - log at debug level (not error)
      logger.debug({ battleId, command: command.type }, 'Command received for unknown battle')
      return
    }

    // Story 3.3: Normalize username for unique user tracking
    const normalizedUsername = normalizeUsername(command.username)

    // Story 3.3 Fix: Skip empty usernames (edge case protection)
    if (!normalizedUsername) {
      logger.debug({ battleId, rawUsername: command.username }, 'Skipping command with empty username')
      return
    }

    // Increment appropriate counter and track unique user
    if (command.type === 'ATTACK') {
      battle.attackCount++
      battle.uniqueAttackers.add(normalizedUsername)
    } else {
      battle.defendCount++
      battle.uniqueDefenders.add(normalizedUsername)
    }

    // Story 3.3: Update per-user message counts
    let userStats = battle.userMessageCounts.get(normalizedUsername)
    if (!userStats) {
      userStats = {
        attackCount: 0,
        defendCount: 0,
        displayName: command.displayName
      }
      battle.userMessageCounts.set(normalizedUsername, userStats)
    }

    if (command.type === 'ATTACK') {
      userStats.attackCount++
    } else {
      userStats.defendCount++
    }

    // Store command for later analysis (top 5 spammers, etc.)
    // Limit array size to prevent memory issues with very active chats
    if (battle.commands.length < MAX_COMMANDS_PER_BATTLE) {
      battle.commands.push(command)
    }

    logger.debug({
      battleId,
      type: command.type,
      username: command.username,
      attackCount: battle.attackCount,
      defendCount: battle.defendCount,
      uniqueAttackers: battle.uniqueAttackers.size,
      uniqueDefenders: battle.uniqueDefenders.size
    }, 'Command counted')
  }

  /**
   * Get current stats for a battle
   * @param battleId - Battle to get stats for
   * @returns Current battle stats or null if battle not found
   */
  getStats(battleId: string): TwitchBattleStats | null {
    return this.battles.get(battleId) ?? null
  }

  /**
   * End battle and return final stats
   * Story 3.3: Now includes unique user counts in logging
   * Removes battle from tracking after returning stats
   * @param battleId - Battle to end
   * @returns Final battle stats or null if battle not found
   */
  endBattle(battleId: string): TwitchBattleStats | null {
    const stats = this.battles.get(battleId)
    if (stats) {
      this.battles.delete(battleId)
      logger.info({
        battleId,
        attackCount: stats.attackCount,
        defendCount: stats.defendCount,
        uniqueAttackers: stats.uniqueAttackers.size,
        uniqueDefenders: stats.uniqueDefenders.size,
        totalCommands: stats.commands.length,
        durationMs: Date.now() - stats.startedAt
      }, 'Battle ended')
    }
    return stats ?? null
  }

  /**
   * Story 3.3: Get unique attacker count for a battle
   * @param battleId - Battle to get count for
   * @returns Number of unique attackers or 0 if battle not found
   */
  getUniqueAttackerCount(battleId: string): number {
    return this.battles.get(battleId)?.uniqueAttackers.size ?? 0
  }

  /**
   * Story 3.3: Get unique defender count for a battle
   * @param battleId - Battle to get count for
   * @returns Number of unique defenders or 0 if battle not found
   */
  getUniqueDefenderCount(battleId: string): number {
    return this.battles.get(battleId)?.uniqueDefenders.size ?? 0
  }

  /**
   * Story 3.3: Get per-user message counts for a battle
   * @param battleId - Battle to get counts for
   * @returns Map of username -> stats or null if battle not found
   */
  getUserMessageCounts(battleId: string): Map<string, UserCommandStats> | null {
    return this.battles.get(battleId)?.userMessageCounts ?? null
  }

  /**
   * Story 3.3: Get top spammers for leaderboard (Story 4.8)
   * @param battleId - Battle to get top spammers for
   * @param limit - Maximum number of spammers to return (default 5)
   * @returns Array of UserSpamStats sorted by total messages descending
   */
  getTopSpammers(battleId: string, limit: number = 5): UserSpamStats[] {
    const battle = this.battles.get(battleId)
    if (!battle) return []

    const spammers: UserSpamStats[] = []
    for (const [username, stats] of battle.userMessageCounts) {
      spammers.push({
        username,
        displayName: stats.displayName,
        totalMessages: stats.attackCount + stats.defendCount,
        attackMessages: stats.attackCount,
        defendMessages: stats.defendCount
      })
    }

    // Sort by total messages descending
    spammers.sort((a, b) => b.totalMessages - a.totalMessages)

    return spammers.slice(0, limit)
  }

  /**
   * Story 3.3: Serialize battle stats for WebSocket transmission
   * Converts Set/Map to arrays for JSON serialization
   * @param battleId - Battle to serialize stats for
   * @returns Serializable stats or null if battle not found
   */
  serializeStats(battleId: string): TwitchBattleStatsSerializable | null {
    const battle = this.battles.get(battleId)
    if (!battle) return null

    return {
      battleId: battle.battleId,
      attackCount: battle.attackCount,
      defendCount: battle.defendCount,
      uniqueAttackerCount: battle.uniqueAttackers.size,
      uniqueDefenderCount: battle.uniqueDefenders.size,
      uniqueAttackers: Array.from(battle.uniqueAttackers),
      uniqueDefenders: Array.from(battle.uniqueDefenders),
      userMessageCounts: Array.from(battle.userMessageCounts.entries()).map(
        ([username, stats]) => ({ username, stats })
      ),
      startedAt: battle.startedAt,
      commandCount: battle.commands.length
    }
  }

  /**
   * Check if battle is currently active
   * @param battleId - Battle to check
   * @returns true if battle exists and is being tracked
   */
  hasBattle(battleId: string): boolean {
    return this.battles.has(battleId)
  }

  /**
   * Get all active battle IDs (for debugging)
   * @returns Array of active battle IDs
   */
  getActiveBattles(): string[] {
    return Array.from(this.battles.keys())
  }

  /**
   * Story 4.4: Calculate current forces for a battle (AR4, FR21-FR22)
   * Formula: Force = (messages × 0.7) + (uniqueUsers × territoryBonus)
   * @param battleId - Battle to calculate forces for
   * @returns Force values or null if battle not found
   */
  getForces(battleId: string): { attackerForce: number; defenderForce: number } | null {
    const battle = this.battles.get(battleId)
    if (!battle) return null

    // Apply formula: Force = (messages × MESSAGE_WEIGHT) + (uniqueUsers × territoryBonus)
    const attackerForce = Math.round(
      (battle.attackCount * MESSAGE_WEIGHT) +
      (battle.uniqueAttackers.size * battle.attackerTerritoryBonus)
    )

    const defenderForce = Math.round(
      (battle.defendCount * MESSAGE_WEIGHT) +
      (battle.uniqueDefenders.size * battle.defenderTerritoryBonus)
    )

    return { attackerForce, defenderForce }
  }

  /**
   * Story 4.4: Get current progress data for broadcasting
   * Used for battle:progress WebSocket events
   * @param battleId - Battle to get progress for
   * @returns Progress data or null if battle not found
   */
  getProgressData(battleId: string): {
    battleId: string
    attackerForce: number
    defenderForce: number
    attackerMessages: number
    defenderMessages: number
    attackerUniqueUsers: number
    defenderUniqueUsers: number
  } | null {
    const battle = this.battles.get(battleId)
    if (!battle) return null

    const forces = this.getForces(battleId)
    if (!forces) return null

    return {
      battleId,
      attackerForce: forces.attackerForce,
      defenderForce: forces.defenderForce,
      attackerMessages: battle.attackCount,
      defenderMessages: battle.defendCount,
      attackerUniqueUsers: battle.uniqueAttackers.size,
      defenderUniqueUsers: battle.uniqueDefenders.size
    }
  }

  /**
   * Story 4.4: Clear battle data (cleanup on battle end)
   * @param battleId - Battle to clear
   * @returns true if battle was cleared, false if not found
   */
  clearBattle(battleId: string): boolean {
    const existed = this.battles.has(battleId)
    if (existed) {
      this.battles.delete(battleId)
      logger.info({ battleId }, 'Battle counter cleared')
    }
    return existed
  }

  /**
   * Story 4.5: Get recent commands for message feed display (FR26-FR27)
   * Returns only NEW commands since last call (incremental updates)
   * @param battleId - Battle to get commands for
   * @param limit - Maximum number of commands to return (default 10)
   * @returns Array of FeedMessage for frontend display
   */
  getRecentCommands(battleId: string, limit: number = 10): FeedMessage[] {
    const battle = this.battles.get(battleId)
    if (!battle) return []

    // Get only new commands since last broadcast
    const startIndex = battle.lastSentCommandIndex
    const endIndex = battle.commands.length
    const newCommands = battle.commands.slice(startIndex, endIndex)

    // Update the last sent index
    battle.lastSentCommandIndex = endIndex

    // Take only the last `limit` commands and convert to FeedMessage format
    const recentCommands = newCommands.slice(-limit)

    return recentCommands.map((cmd, i) => ({
      id: `${battleId}-${startIndex + i}`,
      username: cmd.username,
      displayName: cmd.displayName,
      commandType: cmd.type,
      side: cmd.type === 'ATTACK' ? 'attacker' as const : 'defender' as const,
      timestamp: cmd.timestamp ?? Date.now()
    }))
  }

  /**
   * Story 4.8: Generate battle summary for post-battle display (FR30-FR33)
   * Returns top 5 contributors and stats for both sides
   * @param battleId - Battle to generate summary for
   * @param isDefenderBot - True if defender was a BOT (no real defender users)
   * @returns BattleSummary object or null if battle not found
   */
  generateBattleSummary(battleId: string, isDefenderBot: boolean = false): BattleSummary | null {
    const battle = this.battles.get(battleId)
    if (!battle) {
      logger.warn({ battleId }, 'Cannot generate summary: battle not found')
      return null
    }

    // Build top contributors list sorted by total messages
    const contributors: TopContributor[] = []
    for (const [username, stats] of battle.userMessageCounts) {
      const totalMessages = stats.attackCount + stats.defendCount
      // Determine which side the user contributed most to
      const side: 'attacker' | 'defender' = stats.attackCount >= stats.defendCount ? 'attacker' : 'defender'

      contributors.push({
        username,
        displayName: stats.displayName,
        messageCount: totalMessages,
        side
      })
    }

    // Sort by message count descending, take top 5
    contributors.sort((a, b) => b.messageCount - a.messageCount)
    const topContributors = contributors.slice(0, 5)

    // Calculate attacker stats
    const attackerStats: BattleSideStats = {
      totalMessages: battle.attackCount,
      uniqueUsers: battle.uniqueAttackers.size,
      // Participation rate: for MVP, 100% if any users participated, 0% otherwise
      // (Would need Twitch channel viewer count for real participation rate)
      participationRate: battle.uniqueAttackers.size > 0 ? 100 : 0
    }

    // Calculate defender stats (null for BOT battles)
    let defenderStats: BattleSideStats | null = null
    if (!isDefenderBot) {
      defenderStats = {
        totalMessages: battle.defendCount,
        uniqueUsers: battle.uniqueDefenders.size,
        participationRate: battle.uniqueDefenders.size > 0 ? 100 : 0
      }
    }

    const summary: BattleSummary = {
      topContributors,
      attackerStats,
      defenderStats
    }

    logger.info({
      battleId,
      topContributorsCount: topContributors.length,
      attackerStats,
      defenderStats,
      isDefenderBot
    }, 'Battle summary generated')

    return summary
  }
}

// Export singleton instance
export const battleCounter = new BattleCounterClass()
