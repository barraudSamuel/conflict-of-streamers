import { z } from 'zod'

// GameConfig sub-schema with exact defaults and refinements
export const GameConfigSchema = z.object({
  battleDuration: z.number().int().positive().default(30),
  cooldownBetweenActions: z.number().int().nonnegative().default(10),
  forceMultiplier: z.number().positive().default(0.7),
  territoryBonusRange: z.tuple([
    z.number().positive(),
    z.number().positive()
  ])
    .refine(([min, max]) => min < max, {
      message: "territoryBonusRange[0] must be less than territoryBonusRange[1]"
    })
    .default([1.0, 2.5])
})

export const GameSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^[A-Z2-9]{6,10}$/).describe('6-10 uppercase, excludes O,0,I,1'),
  creatorId: z.string().uuid(),
  status: z.enum(['lobby', 'playing', 'finished']),
  config: GameConfigSchema,
  playerIds: z.array(z.string().uuid()),
  territoryIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})
