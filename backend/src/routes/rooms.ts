/**
 * Room Routes - REST API for room management
 * POST /api/rooms - Create a new room
 * POST /api/rooms/:code/join - Join an existing room
 * GET /api/rooms/:code/exists - Check if room exists
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { CreateRoomRequestSchema, JoinRoomRequestSchema, ROOM_CODE_REGEX } from 'shared/schemas'
import { ValidationError } from 'shared/errors'
import type { CreateRoomRequest, CreateRoomResponse, RoomExistsResponse, JoinRoomRequest, JoinRoomResponse } from 'shared/types'
import { roomManager } from '../managers/RoomManager'

/**
 * Validates room code format
 */
function validateRoomCode(code: string): void {
  if (!ROOM_CODE_REGEX.test(code.toUpperCase())) {
    throw new ValidationError('Format de code invalide (6-10 caractères alphanumériques)')
  }
}

export async function roomRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // POST /api/rooms - Create a new room
  fastify.post<{
    Body: CreateRoomRequest
    Reply: CreateRoomResponse
  }>('/api/rooms', async (request, reply) => {
    // Validate request body with Zod (throws ZodError on failure)
    const validated = CreateRoomRequestSchema.parse(request.body)

    fastify.log.info({ pseudo: validated.creatorPseudo }, 'Creating new room')

    // Create room
    const { room, creator } = roomManager.createRoom(validated)

    fastify.log.info(
      { roomCode: room.code, roomId: room.id, creatorId: creator.id },
      'Room created successfully'
    )

    // Return response
    return reply.status(201).send({
      roomCode: room.code,
      roomId: room.id,
      creator
    })
  })

  // POST /api/rooms/:code/join - Join an existing room
  fastify.post<{
    Params: { code: string }
    Body: JoinRoomRequest
    Reply: JoinRoomResponse
  }>('/api/rooms/:code/join', async (request, reply) => {
    const { code } = request.params

    // Validate room code format
    validateRoomCode(code)

    // Validate request body with Zod (throws ZodError on failure)
    const validated = JoinRoomRequestSchema.parse(request.body)

    fastify.log.info({ roomCode: code, pseudo: validated.pseudo }, 'Player joining room')

    // Add player to room (throws NotFoundError, GameError on failure)
    const { player, roomState } = roomManager.addPlayer(code, validated.pseudo)

    fastify.log.info(
      { roomCode: code, playerId: player.id, pseudo: validated.pseudo, playerCount: roomState.players.length },
      'Player joined room successfully'
    )

    return reply.send({
      player,
      room: roomState
    })
  })

  // GET /api/rooms/:code/exists - Check if room exists
  fastify.get<{
    Params: { code: string }
    Reply: RoomExistsResponse
  }>('/api/rooms/:code/exists', async (request, reply) => {
    const { code } = request.params

    // Validate room code format
    validateRoomCode(code)

    const exists = roomManager.roomExists(code)

    fastify.log.info({ roomCode: code, exists }, 'Room existence check')

    return reply.send({
      exists,
      roomCode: exists ? code.toUpperCase() : undefined
    })
  })
}
