import { z } from 'zod'
import { BattleSchema, BattleStatsSchema } from '../schemas/battle'

export type Battle = z.infer<typeof BattleSchema>
export type BattleStats = z.infer<typeof BattleStatsSchema>
