import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { ZodError } from 'zod'
import { ValidationError, AppError, GameError, NotFoundError, UnauthorizedError } from 'shared/errors'

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

// WebSocket endpoint
fastify.get('/ws', { websocket: true }, (socket, req) => {
  fastify.log.info('WebSocket client connected')

  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      fastify.log.info({ event: data.event }, 'WebSocket message received')

      // Echo back for now
      socket.send(JSON.stringify({
        event: 'echo',
        data: { received: data }
      }))
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to parse WebSocket message')
    }
  })

  socket.on('close', () => {
    fastify.log.info('WebSocket client disconnected')
  })

  socket.on('error', (error) => {
    fastify.log.error({ err: error }, 'WebSocket error')
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
