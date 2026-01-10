/**
 * BattleCounter (Story 3.2 + 3.3)
 * Counts and tracks Twitch chat commands during battles
 *
 * Provides:
 * - Per-battle command counting (attack/defend)
 * - Command storage for leaderboard analysis (top 5 spammers)
 * - Stats retrieval for force calculation (Story 4.6)
 * - Story 3.3: Unique user tracking for balancing formula (FR14, FR21)
 */

import { logger } from '../utils/logger'
import { normalizeUsername } from '../utils/uniqueUserTracker'
import type {
  ParsedCommand,
  TwitchBattleStats,
  TwitchBattleStatsSerializable,
  UserCommandStats,
  UserSpamStats
} from 'shared/types'

/** Maximum commands stored per battle to prevent memory issues */
const MAX_COMMANDS_PER_BATTLE = 2000

class BattleCounterClass {
  private battles = new Map<string, TwitchBattleStats>()

  /**
   * Initialize counter for a new battle
   * Story 3.3: Now includes unique user tracking
   * @param battleId - Unique identifier for the battle
   */
  startBattle(battleId: string): void {
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
      userMessageCounts: new Map<string, UserCommandStats>()
    })

    logger.info({ battleId }, 'Battle counter initialized')
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
}

// Export singleton instance
export const battleCounter = new BattleCounterClass()
