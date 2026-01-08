import { z } from 'zod'
import { TerritorySchema } from '../schemas/territory'

export type Territory = z.infer<typeof TerritorySchema>
