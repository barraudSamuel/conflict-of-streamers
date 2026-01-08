import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'

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
