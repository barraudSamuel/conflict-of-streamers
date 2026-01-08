import { z } from 'zod'

// 8 neon player colors (exact hex values)
export const PLAYER_COLORS = [
  '#FF3B3B', '#00F5FF', '#FFE500', '#00FF7F',
  '#FF00FF', '#9D4EDD', '#FF6B35', '#00FFA3'
] as const

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
