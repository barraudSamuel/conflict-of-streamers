import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { randomUUID } from 'crypto'
import { ZodError } from 'zod'
import { ValidationError, AppError, GameError, NotFoundError, UnauthorizedError } from 'shared/errors'
import { LobbyJoinEventSchema, TerritorySelectEventSchema } from 'shared/schemas'
import { LOBBY_EVENTS, TERRITORY_EVENTS } from 'shared/types'
import { roomRoutes } from './routes/rooms'
import { connectionManager } from './websocket/ConnectionManager'
import { broadcastToRoom } from './websocket/broadcast'
import { roomManager } from './managers/RoomManager'

const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
})

// Register plugins
await fastify.register(cors, {
  origin: CORS_ORIGIN
})

await fastify.register(websocket)

// Global error handler
// IMPORTANT: Check order matters - most specific errors first, then base AppError
// Do not reorder without understanding the inheritance hierarchy:
// ValidationError/GameError/NotFoundError/UnauthorizedError extend AppError
fastify.setErrorHandler((error, request, reply) => {
  // 1. Handle ZodError (from schema validation)
  if (error instanceof ZodError) {
    fastify.log.error({ err: error }, 'Validation error')
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues
      }
    })
  }

  // 2. Handle custom errors (ValidationError, GameError, NotFoundError, UnauthorizedError)
  if (error instanceof ValidationError ||
      error instanceof GameError ||
      error instanceof NotFoundError ||
      error instanceof UnauthorizedError) {
    fastify.log.error({ err: error }, 'Custom error')
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    })
  }

  // 3. Handle base AppError (statusCode 500 default)
  if (error instanceof AppError) {
    fastify.log.error({ err: error, stack: error.stack }, 'Application error')
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    })
  }

  // 4. Unexpected errors (500) - log full stack trace
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorStack = error instanceof Error ? error.stack : undefined
  fastify.log.error({ err: error, stack: errorStack }, 'Unexpected error')
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }
  })
})

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Register room routes
await fastify.register(roomRoutes)

// Helper function to handle disconnection (explicit leave or socket close)
function handleDisconnect(connectionId: string, reason: 'left' | 'disconnected'): void {
  const result = connectionManager.removeConnection(connectionId)
  if (!result) return

  const { roomCode, playerId } = result

  // Optionally remove player from room state on disconnect
  // Note: For now we keep the player in RoomManager for potential reconnection
  // roomManager.removePlayer(roomCode, playerId)

  // Broadcast to remaining players
  broadcastToRoom(roomCode, LOBBY_EVENTS.PLAYER_LEFT, { playerId, reason })
  fastify.log.info({ connectionId, roomCode, playerId, reason }, 'Player left lobby')
}

// WebSocket endpoint - Lobby real-time synchronization
fastify.get('/ws', { websocket: true }, (socket, req) => {
  const connectionId = randomUUID()
  fastify.log.info({ connectionId }, 'WebSocket client connected')

  socket.on('message', async (message) => {
    try {
      const { event, data } = JSON.parse(message.toString())
      fastify.log.debug({ connectionId, event }, 'WebSocket message received')

      switch (event) {
        case LOBBY_EVENTS.JOIN: {
          // Validate join data with Zod
          const parseResult = LobbyJoinEventSchema.safeParse(data)
          if (!parseResult.success) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'VALIDATION_ERROR', message: 'Invalid join data' }
            }))
            return
          }

          const { roomCode, playerId } = parseResult.data

          // Validate player is in room
          if (!roomManager.isPlayerInRoom(roomCode, playerId)) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'INVALID_JOIN', message: 'Player not in room' }
            }))
            return
          }

          // Get room state with null check
          const roomState = roomManager.getRoomState(roomCode)
          if (!roomState) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'ROOM_NOT_FOUND', message: 'Room state unavailable' }
            }))
            return
          }

          // Add connection to manager
          connectionManager.addConnection(connectionId, socket, roomCode, playerId)

          // Send current state to joining player
          socket.send(JSON.stringify({
            event: LOBBY_EVENTS.SYNC,
            data: { players: roomState.players, config: roomState.config }
          }))

          // Get player data for broadcast to others
          const player = roomState.players.find(p => p.id === playerId)
          if (player) {
            broadcastToRoom(roomCode, LOBBY_EVENTS.PLAYER_JOINED, player, connectionId)
          }

          fastify.log.info({ connectionId, roomCode, playerId }, 'Player joined lobby via WebSocket')
          break
        }

        case LOBBY_EVENTS.LEAVE: {
          handleDisconnect(connectionId, 'left')
          break
        }

        case TERRITORY_EVENTS.SELECT: {
          // Validate territory select data
          const parseResult = TerritorySelectEventSchema.safeParse(data)
          if (!parseResult.success) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'VALIDATION_ERROR', message: 'Invalid territory select data' }
            }))
            return
          }

          const { territoryId } = parseResult.data

          // Get connection info
          const connectionInfo = connectionManager.getConnection(connectionId)
          if (!connectionInfo) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'NOT_JOINED', message: 'Must join lobby first' }
            }))
            return
          }

          const { roomCode, playerId } = connectionInfo

          // Try to select territory
          const result = roomManager.selectTerritory(roomCode, playerId, territoryId)

          if (!result.success) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'TERRITORY_UNAVAILABLE', message: 'Territory is not available' }
            }))
            return
          }

          // If player had a previous selection, broadcast release first
          if (result.previousTerritoryId) {
            broadcastToRoom(roomCode, TERRITORY_EVENTS.RELEASED, {
              playerId,
              territoryId: result.previousTerritoryId
            })
          }

          // Broadcast new selection to all players in room
          broadcastToRoom(roomCode, TERRITORY_EVENTS.SELECTED, {
            playerId,
            territoryId,
            color: result.playerColor
          })

          fastify.log.info({ connectionId, roomCode, playerId, territoryId }, 'Territory selected')
          break
        }

        default:
          fastify.log.warn({ connectionId, event }, 'Unknown WebSocket event')
      }
    } catch (error) {
      fastify.log.error({ err: error, connectionId }, 'Failed to process WebSocket message')
      socket.send(JSON.stringify({
        event: LOBBY_EVENTS.ERROR,
        data: { code: 'PARSE_ERROR', message: 'Invalid message format' }
      }))
    }
  })

  socket.on('close', () => {
    handleDisconnect(connectionId, 'disconnected')
    fastify.log.info({ connectionId }, 'WebSocket client disconnected')
  })

  socket.on('error', (error) => {
    fastify.log.error({ err: error, connectionId }, 'WebSocket error')
  })
})

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST })
  fastify.log.info(`Server running on http://${HOST}:${PORT}`)
  fastify.log.info(`WebSocket endpoint: ws://${HOST}:${PORT}/ws`)
} catch (error) {
  fastify.log.error(error)
  process.exit(1)
}
