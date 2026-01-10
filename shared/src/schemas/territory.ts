import { z } from 'zod'

// Cell coordinate on the 20x20 grid (0-indexed)
export const CellSchema = z.object({
  x: z.number().int().min(0).max(19),
  y: z.number().int().min(0).max(19)
})

// Territory size categories
export const TerritorySizeSchema = z.enum(['small', 'medium', 'large'])

// Territory stats for battle mechanics (FR22 - inversely proportional to size)
export const TerritoryStatsSchema = z.object({
  attackBonus: z.number(), // Higher for large territories
  defenseBonus: z.number() // Higher for small territories
})

// Core territory schema for territory selection and gameplay
export const TerritorySchema = z.object({
  id: z.string(), // Simple string ID like 'T1', 'T2', etc.
  name: z.string(),
  cells: z.array(CellSchema).min(1), // Array of cells forming the territory shape
  size: TerritorySizeSchema, // small (3-5 cells), medium (6-10), large (11-15)
  ownerId: z.string().nullable(), // Player ID or null if unowned (BOT territory)
  color: z.string().nullable(), // Player color or null if neutral
  adjacentTerritoryIds: z.array(z.string()), // For battle mechanics
  stats: TerritoryStatsSchema.optional(), // Battle stats (FR22)
  isUnderAttack: z.boolean().default(false), // Currently being attacked
  isAttacking: z.boolean().default(false) // Currently attacking another territory
})

// Lightweight territory for selection phase (without gameplay fields)
export const TerritorySelectionSchema = z.object({
  territoryId: z.string(),
  playerId: z.string(),
  color: z.string()
})
