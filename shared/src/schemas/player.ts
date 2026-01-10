import { z } from 'zod'

// 8 neon player colors (exact hex values)
export const PLAYER_COLORS = [
  '#FF3B3B', '#00F5FF', '#FFE500', '#00FF7F',
  '#FF00FF', '#9D4EDD', '#FF6B35', '#00FFA3'
] as const

// BOT/neutral territory color (Story 4.1 - FR38)
export const BOT_TERRITORY_COLOR = '#4a4a4a'

// Grid rendering colors
export const GRID_LINE_COLOR = '#1a1a1a'
export const TERRITORY_BORDER_COLOR = '#2d2d2d'

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  pseudo: z.string().min(3).max(20),
  twitchAvatarUrl: z.string().url(),
  color: z.enum(PLAYER_COLORS),
  status: z.enum(['waiting', 'ready', 'playing', 'eliminated']),
  territoryIds: z.array(z.string().uuid()).max(20).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})
