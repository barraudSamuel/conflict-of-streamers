import { z } from 'zod'
import {
  CreateRoomRequestSchema,
  CreateRoomResponseSchema,
  CreatorSchema,
  RoomSchema,
  RoomExistsResponseSchema,
  PlayerInRoomSchema,
  RoomStateSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema
} from '../schemas/room'

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>
export type CreateRoomResponse = z.infer<typeof CreateRoomResponseSchema>
export type Creator = z.infer<typeof CreatorSchema>
export type Room = z.infer<typeof RoomSchema>
export type RoomExistsResponse = z.infer<typeof RoomExistsResponseSchema>
export type PlayerInRoom = z.infer<typeof PlayerInRoomSchema>
export type RoomState = z.infer<typeof RoomStateSchema>
export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>
export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>
