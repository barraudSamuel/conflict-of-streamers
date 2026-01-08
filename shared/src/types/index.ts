// Shared TypeScript types
// Export all type definitions here

// Placeholder type
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// Export all entity types
export type { Player } from './player'
export type { Game, GameConfig } from './game'
export type { Territory } from './territory'
export type { Battle, BattleStats } from './battle'
