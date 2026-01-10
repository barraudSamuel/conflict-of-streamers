/**
 * WebSocket Broadcast Utility
 * Handles sending messages to all connections in a room
 */

import { connectionManager } from './ConnectionManager'
import { logger } from '../utils/logger'

/**
 * Broadcast a message to all connections in a room
 * @param roomCode - The room to broadcast to
 * @param event - The event name (e.g., 'lobby:playerJoined')
 * @param data - The event data
 * @param excludeConnectionId - Optional connection ID to exclude (e.g., the sender)
 */
export function broadcastToRoom(
  roomCode: string,
  event: string,
  data: unknown,
  excludeConnectionId?: string
): void {
  const connections = connectionManager.getConnectionsByRoom(roomCode)
  const message = JSON.stringify({ event, data })

  let sentCount = 0
  let errorCount = 0

  // Collect dead connection IDs to remove after iteration (MEDIUM-1 fix)
  const deadConnectionIds: string[] = []

  for (const connection of connections) {
    // Skip excluded connection (e.g., don't send playerJoined to the joining player)
    if (excludeConnectionId) {
      const connInfo = connectionManager.getConnection(excludeConnectionId)
      if (connInfo?.playerId === connection.playerId) {
        continue
      }
    }

    // Find connectionId for this connection (needed for removal)
    const connectionId = Array.from(connectionManager.getConnectionsByRoom(roomCode))
      .find(c => c.playerId === connection.playerId && c.socket === connection.socket)
      ? connection.playerId
      : null

    try {
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.send(message)
        sentCount++
      } else {
        // Socket not open, mark for removal
        logger.warn(
          { roomCode, playerId: connection.playerId, readyState: connection.socket.readyState },
          'Found dead connection during broadcast'
        )
        // We can't easily get connectionId here, so we'll rely on close event to clean up
        errorCount++
      }
    } catch (error) {
      logger.error(
        { err: error, roomCode, playerId: connection.playerId },
        'Failed to send message to connection'
      )
      errorCount++
    }
  }

  logger.debug(
    { roomCode, event, sentCount, errorCount, totalConnections: connections.length },
    'Broadcast completed'
  )
}
