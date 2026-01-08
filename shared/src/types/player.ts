import { z } from 'zod'
import { PlayerSchema } from '../schemas/player'

export type Player = z.infer<typeof PlayerSchema>
