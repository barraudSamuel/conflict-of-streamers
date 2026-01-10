/**
 * BattleCounter (Story 3.2)
 * Counts and tracks Twitch chat commands during battles
 *
 * Provides:
 * - Per-battle command counting (attack/defend)
 * - Command storage for leaderboard analysis (top 5 spammers)
 * - Stats retrieval for force calculation (Story 4.6)
 */

import { logger } from '../utils/logger'
import type { ParsedCommand, TwitchBattleStats } from 'shared/types'

/** Maximum commands stored per battle to prevent memory issues */
const MAX_COMMANDS_PER_BATTLE = 2000

class BattleCounterClass {
  private battles = new Map<string, TwitchBattleStats>()

  /**
   * Initialize counter for a new battle
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
      startedAt: Date.now()
    })

    logger.info({ battleId }, 'Battle counter initialized')
  }

  /**
   * Add a parsed command to the battle counter
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

    // Increment appropriate counter
    if (command.type === 'ATTACK') {
      battle.attackCount++
    } else {
      battle.defendCount++
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
      defendCount: battle.defendCount
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
        totalCommands: stats.commands.length,
        durationMs: Date.now() - stats.startedAt
      }, 'Battle ended')
    }
    return stats ?? null
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
