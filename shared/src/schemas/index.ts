// Shared Zod validation schemas
// Export all schemas here
import { z } from 'zod'

// Placeholder schema
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Export all entity schemas
export { PlayerSchema, PLAYER_COLORS } from './player'
export { GameSchema, GameConfigSchema } from './game'
export { TerritorySchema } from './territory'
export { BattleSchema, BattleStatsSchema } from './battle'
