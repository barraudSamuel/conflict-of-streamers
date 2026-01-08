import { z } from 'zod'

// BattleStats sub-schema with array constraints
export const BattleStatsSchema = z.object({
  messageCount: z.number().int().nonnegative(),
  uniqueUserCount: z.number().int().nonnegative(),
  force: z.number().nonnegative(),
  topSpammers: z.array(z.object({
    pseudo: z.string(),
    messageCount: z.number().int().nonnegative()
  })).max(5).default([])
})

export const BattleSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  attackerTerritoryId: z.string().uuid(),
  defenderTerritoryId: z.string().uuid(),
  attackerPlayerId: z.string().uuid(),
  defenderPlayerId: z.string().uuid().nullable(),
  status: z.enum(['in_progress', 'completed']),
  duration: z.number().int().positive(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  attackerStats: BattleStatsSchema,
  defenderStats: BattleStatsSchema,
  winnerId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})
