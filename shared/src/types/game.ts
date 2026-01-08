import { z } from 'zod'
import { GameSchema, GameConfigSchema } from '../schemas/game'

export type Game = z.infer<typeof GameSchema>
export type GameConfig = z.infer<typeof GameConfigSchema>
