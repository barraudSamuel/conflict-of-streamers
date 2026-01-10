import { z } from 'zod'
import { TerritorySchema, CellSchema, TerritorySizeSchema, TerritorySelectionSchema } from '../schemas/territory'

export type Territory = z.infer<typeof TerritorySchema>
export type Cell = z.infer<typeof CellSchema>
export type TerritorySize = z.infer<typeof TerritorySizeSchema>
export type TerritorySelection = z.infer<typeof TerritorySelectionSchema>
