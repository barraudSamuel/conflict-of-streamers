/**
 * Story 4.6: BOT Territory Resistance Calculation (FR38-FR40)
 *
 * When attacking an unowned territory (BOT), the defender force is simulated
 * based on territory size. This provides passive resistance that scales with
 * territory value - larger territories are harder to capture from BOTs.
 *
 * Formula: BOT Force = BOT_BASE_FORCE × size_multiplier × defenseBonus
 *
 * Note: BOT territories have no unique users or messages (no one is defending),
 * so this simulates a minimal defense that attackers must overcome.
 */

import type { TerritorySize } from 'shared/types'

/**
 * Base force for BOT territories (simulated defender strength)
 * This represents the minimum effort required to capture any BOT territory
 */
export const BOT_BASE_FORCE = 5

/**
 * Size-based resistance multipliers for BOT territories (FR38-FR40)
 *
 * - Small BOT territories: Lowest resistance (easy first captures)
 * - Medium BOT territories: Moderate resistance
 * - Large BOT territories: Highest resistance (strategic value)
 */
export const BOT_RESISTANCE_MULTIPLIERS: Record<TerritorySize, number> = {
  small: 0.3,   // ~3-4 force (very easy to capture)
  medium: 0.5,  // ~3-4 force (easy to capture)
  large: 0.8    // ~4-5 force (slightly harder but still manageable)
}

/**
 * Calculate the defender force for a BOT territory
 *
 * @param size - Territory size ('small' | 'medium' | 'large')
 * @param defenseBonus - Territory's defense bonus from stats (higher for small)
 * @returns Simulated defender force (rounded to integer)
 *
 * @example
 * // Small territory with high defenseBonus (2.2):
 * calculateBotDefenderForce('small', 2.2) // = round(5 × 0.3 × 2.2) = round(3.3) = 3
 *
 * // Large territory with low defenseBonus (0.7):
 * calculateBotDefenderForce('large', 0.7) // = round(5 × 0.8 × 0.7) = round(2.8) = 3
 */
export function calculateBotDefenderForce(
  size: TerritorySize,
  defenseBonus: number = 1.0
): number {
  const multiplier = BOT_RESISTANCE_MULTIPLIERS[size]
  return Math.round(BOT_BASE_FORCE * multiplier * defenseBonus)
}

/**
 * Check if a territory is a BOT territory (unowned)
 *
 * @param ownerId - Territory owner ID (null for BOT territories)
 * @returns true if territory is unowned (BOT)
 */
export function isBotTerritory(ownerId: string | null): boolean {
  return ownerId === null
}
