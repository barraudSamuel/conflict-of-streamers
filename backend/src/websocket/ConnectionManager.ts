/**
 * WebSocket Connection Manager
 * Manages socket-to-player and room-to-connections mappings
 */

import type { WebSocket } from 'ws'
import { logger } from '../utils/logger'

interface Connection {
  socket: WebSocket
  roomCode: string
  playerId: string
}

class ConnectionManagerClass {
  private connections = new Map<string, Connection>()
  private roomConnections = new Map<string, Set<string>>()

  /**
   * Add a new connection to the manager
   * Note: roomCode is normalized to uppercase for consistency (MEDIUM-3 fix)
   */
  addConnection(connectionId: string, socket: WebSocket, roomCode: string, playerId: string): void {
    const normalizedRoomCode = roomCode.toUpperCase()
    this.connections.set(connectionId, { socket, roomCode: normalizedRoomCode, playerId })

    if (!this.roomConnections.has(normalizedRoomCode)) {
      this.roomConnections.set(normalizedRoomCode, new Set())
    }
    this.roomConnections.get(normalizedRoomCode)!.add(connectionId)

    logger.info({ connectionId, roomCode: normalizedRoomCode, playerId }, 'Connection added')
  }

  /**
   * Remove a connection and return its info (for broadcasting leave events)
   */
  removeConnection(connectionId: string): { roomCode: string; playerId: string } | null {
    const connection = this.connections.get(connectionId)
    if (!connection) return null

    const { roomCode, playerId } = connection
    this.connections.delete(connectionId)
    this.roomConnections.get(roomCode)?.delete(connectionId)

    // Clean up empty room sets
    if (this.roomConnections.get(roomCode)?.size === 0) {
      this.roomConnections.delete(roomCode)
    }

    logger.info({ connectionId, roomCode, playerId }, 'Connection removed')
    return { roomCode, playerId }
  }

  /**
   * Get all connections for a room (for broadcasting)
   * Note: roomCode is normalized to uppercase for consistency
   */
  getConnectionsByRoom(roomCode: string): Connection[] {
    const normalizedRoomCode = roomCode.toUpperCase()
    const connectionIds = this.roomConnections.get(normalizedRoomCode)
    if (!connectionIds) return []

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((c): c is Connection => c !== undefined)
  }

  /**
   * Get connection info by ID
   */
  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId)
  }

  /**
   * Get the number of connections in a room
   * Note: roomCode is normalized to uppercase for consistency
   */
  getRoomConnectionCount(roomCode: string): number {
    return this.roomConnections.get(roomCode.toUpperCase())?.size ?? 0
  }
}

export const connectionManager = new ConnectionManagerClass()
