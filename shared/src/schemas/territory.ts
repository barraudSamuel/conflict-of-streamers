import { z } from 'zod'

export const TerritorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid().nullable(),
  size: z.number().int().positive(),
  position: z.object({
    x: z.number().int().min(0).max(19),
    y: z.number().int().min(0).max(19)
  }),
  adjacentTerritoryIds: z.array(z.string().uuid()),
  attackPower: z.number().nonnegative(),
  defensePower: z.number().nonnegative(),
  isAttacking: z.boolean(),
  isUnderAttack: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})
