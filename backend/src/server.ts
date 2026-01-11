import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { randomUUID } from 'crypto'
import { ZodError } from 'zod'
import { ValidationError, AppError, GameError, NotFoundError, UnauthorizedError } from 'shared/errors'
import { LobbyJoinEventSchema, TerritorySelectEventSchema, ConfigUpdateEventSchema, GameStartEventSchema, AttackActionEventSchema } from 'shared/schemas'
import { LOBBY_EVENTS, TERRITORY_EVENTS, CONFIG_EVENTS, GAME_EVENTS, TWITCH_EVENTS, BATTLE_EVENTS } from 'shared/types'
import type { TwitchConnectionState } from 'shared/types'
import { roomRoutes } from './routes/rooms'
import { connectionManager } from './websocket/ConnectionManager'
import { broadcastToRoom } from './websocket/broadcast'
import { roomManager } from './managers/RoomManager'
import { twitchManager } from './managers/TwitchManager'
import { battleCounter } from './managers/BattleCounter'
import { calculateBotDefenderForce, isBotTerritory } from './utils/botResistance'

// Story 4.4: Throttled broadcast tracking
// Limits broadcasts to max 10/sec per battle (100ms interval)
const lastBroadcastTime = new Map<string, number>()
const THROTTLE_INTERVAL_MS = 100

// Story 3.4: Register callback to broadcast Twitch connection status to clients
// This notifies clients when IRC connection has been unavailable for 3+ attempts
twitchManager.onConnectionStatusChange((roomCode: string, state: TwitchConnectionState) => {
  // Only notify if connection has been unavailable for 3+ attempts (AC #4)
  if (state.attemptCount >= 3) {
    broadcastToRoom(roomCode, TWITCH_EVENTS.CONNECTION_STATUS, {
      status: state.status,
      channelName: state.channelName,
      attemptCount: state.attemptCount,
      lastError: state.lastError,
      isTemporarilyUnavailable: true
    })
  }
})

// Story 4.4 + 4.5: Register callback to count Twitch commands and broadcast battle progress
// This wires TwitchManager parsed commands to BattleCounter for force calculation
// Story 4.5: Extended to include recentCommands for message feed display (FR26-FR27)
twitchManager.onCommand((roomCode, command) => {
  // Find active battle matching the territory from the command
  const activeBattles = roomManager.getActiveBattles(roomCode)

  for (const battle of activeBattles) {
    // Match command to battle based on territory
    // ATTACK commands count for attacker if target territory matches
    // DEFEND commands count for defender if target territory matches
    if (command.territoryId === battle.defenderTerritoryId) {
      // This command is for this battle
      battleCounter.addCommand(battle.id, command)

      // Story 4.4: Throttled broadcast of battle progress
      const now = Date.now()
      const lastBroadcast = lastBroadcastTime.get(battle.id) ?? 0

      if (now - lastBroadcast >= THROTTLE_INTERVAL_MS) {
        lastBroadcastTime.set(battle.id, now)

        // Get current progress and broadcast
        const progressData = battleCounter.getProgressData(battle.id)
        if (progressData) {
          // Story 4.5: Include recent commands for message feed display
          const recentCommands = battleCounter.getRecentCommands(battle.id, 10)
          broadcastToRoom(roomCode, BATTLE_EVENTS.PROGRESS, {
            ...progressData,
            recentCommands
          })
        }
      }
      break // Command matched to a battle, no need to check others
    }
  }
})

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

          // Story 4.1: If game is in progress, also send game state with territories
          const room = roomManager.getRoom(roomCode)
          if (room && room.status === 'playing') {
            const gameState = roomManager.getGameState(roomCode)
            if (gameState) {
              socket.send(JSON.stringify({
                event: GAME_EVENTS.STATE_INIT,
                data: {
                  territories: gameState.territories,
                  players: roomState.players,
                  config: roomState.config
                }
              }))
            }
          }

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

        case CONFIG_EVENTS.UPDATE: {
          // Validate config update data
          const parseResult = ConfigUpdateEventSchema.safeParse(data)
          if (!parseResult.success) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'VALIDATION_ERROR', message: 'Invalid config data' }
            }))
            return
          }

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

          // Try to update config (RoomManager validates creator and room status)
          const result = roomManager.updateConfig(roomCode, playerId, parseResult.data)

          if (!result.success) {
            const errorMessages: Record<string, string> = {
              'ROOM_NOT_FOUND': 'Room not found',
              'NOT_CREATOR': 'Only the creator can modify game configuration',
              'GAME_STARTED': 'Configuration cannot be changed after game has started',
              'INVALID_CONFIG': 'Invalid configuration values'
            }
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: {
                code: result.error ?? 'CONFIG_UPDATE_FAILED',
                message: errorMessages[result.error ?? ''] ?? 'Failed to update configuration'
              }
            }))
            return
          }

          // Broadcast updated config to all players in room
          broadcastToRoom(roomCode, CONFIG_EVENTS.UPDATED, {
            battleDuration: result.config!.battleDuration,
            cooldownBetweenActions: result.config!.cooldownBetweenActions
          })

          fastify.log.info({ connectionId, roomCode, playerId, config: result.config }, 'Config updated')
          break
        }

        case GAME_EVENTS.START: {
          // Validate game start data (empty payload, just for consistency)
          const parseResult = GameStartEventSchema.safeParse(data)
          if (!parseResult.success) {
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: { code: 'VALIDATION_ERROR', message: 'Invalid game start data' }
            }))
            return
          }

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

          // Try to start game (RoomManager validates creator, status, and territory selections)
          const result = roomManager.startGame(roomCode, playerId)

          if (!result.success) {
            const errorMessages: Record<string, string> = {
              'ROOM_NOT_FOUND': 'Room not found',
              'NOT_CREATOR': 'Only the creator can start the game',
              'GAME_STARTED': 'Game has already started',
              'NOT_ALL_READY': 'All players must select a territory before starting'
            }
            socket.send(JSON.stringify({
              event: LOBBY_EVENTS.ERROR,
              data: {
                code: result.error ?? 'START_FAILED',
                message: errorMessages[result.error ?? ''] ?? 'Failed to start game'
              }
            }))
            return
          }

          // Get final room state for broadcast
          const roomState = roomManager.getRoomState(roomCode)

          // Broadcast game started to all players in room
          broadcastToRoom(roomCode, GAME_EVENTS.STARTED, {
            roomCode,
            startedAt: new Date().toISOString(),
            players: roomState?.players ?? [],
            config: roomState?.config
          })

          // Story 4.1: Send initial game state with territories
          const gameState = roomManager.getGameState(roomCode)
          if (gameState) {
            broadcastToRoom(roomCode, GAME_EVENTS.STATE_INIT, {
              territories: gameState.territories,
              players: roomState?.players ?? [],
              config: roomState?.config
            })
          }

          // Connect to creator's Twitch chat (Story 3.1)
          const creator = roomState?.players.find(p => p.isCreator)
          if (creator) {
            try {
              await twitchManager.connect(roomCode, creator.pseudo)
            } catch (error) {
              // Log error but don't fail game start
              fastify.log.error({ roomCode, err: error }, 'Twitch IRC connection failed')

              // Notify clients of Twitch connection failure (Story 3.1)
              broadcastToRoom(roomCode, TWITCH_EVENTS.ERROR, {
                code: 'TWITCH_CONNECTION_FAILED',
                message: 'Connexion au chat Twitch echouee'
              })
            }
          }

          fastify.log.info({ connectionId, roomCode, playerId }, 'Game started')
          break
        }

        // Story 4.2: Handle attack action
        case BATTLE_EVENTS.ATTACK: {
          // Validate attack data
          const parseResult = AttackActionEventSchema.safeParse(data)
          if (!parseResult.success) {
            socket.send(JSON.stringify({
              event: BATTLE_EVENTS.ATTACK_FAILED,
              data: { code: 'INVALID_DATA', message: 'Données d\'attaque invalides' }
            }))
            return
          }

          // Get connection info
          const connectionInfo = connectionManager.getConnection(connectionId)
          if (!connectionInfo) {
            socket.send(JSON.stringify({
              event: BATTLE_EVENTS.ATTACK_FAILED,
              data: { code: 'NOT_JOINED', message: 'Vous devez d\'abord rejoindre la partie' }
            }))
            return
          }

          const { roomCode, playerId } = connectionInfo
          const { fromTerritoryId, toTerritoryId } = parseResult.data

          // Validate attack
          const validation = roomManager.validateAttack(roomCode, playerId, fromTerritoryId, toTerritoryId)
          if (!validation.valid) {
            socket.send(JSON.stringify({
              event: BATTLE_EVENTS.ATTACK_FAILED,
              data: {
                code: validation.code,
                message: validation.message,
                cooldownRemaining: validation.cooldownRemaining
              }
            }))
            return
          }

          // Story 4.4: Get territory bonuses for force calculation before starting battle
          const gameState = roomManager.getGameState(roomCode)
          const attackerTerritory = gameState?.territories.find(t => t.id === fromTerritoryId)
          const defenderTerritory = gameState?.territories.find(t => t.id === toTerritoryId)

          // Get territory bonuses (default to 1.0 if not found)
          const attackerBonus = attackerTerritory?.stats?.attackBonus ?? 1.0
          const defenderBonus = defenderTerritory?.stats?.defenseBonus ?? 1.0

          // Start battle with callback for when battle ends
          const battleEvent = roomManager.startBattle(
            roomCode,
            playerId,
            fromTerritoryId,
            toTerritoryId,
            (endRoomCode: string, battleId: string) => {
              // Story 4.4 + 4.6: Get final forces from BattleCounter before clearing
              const startTime = Date.now()
              const forces = battleCounter.getForces(battleId)
              let attackerForce = forces?.attackerForce ?? 0
              let defenderForce = forces?.defenderForce ?? 0

              // Story 4.6: Apply BOT resistance if defender territory is unowned
              const endGameState = roomManager.getGameState(endRoomCode)
              const endBattle = roomManager.getActiveBattle(endRoomCode, battleId)
              if (endGameState && endBattle) {
                const defenderTerr = endGameState.territories.find(t => t.id === endBattle.defenderTerritoryId)
                if (defenderTerr && isBotTerritory(defenderTerr.ownerId)) {
                  // BOT territory - use calculated resistance instead of IRC counter
                  defenderForce = calculateBotDefenderForce(
                    defenderTerr.size,
                    defenderTerr.stats?.defenseBonus ?? 1.0
                  )
                }
              } else {
                // Story 4.6 Code Review: Log warning if battle context unavailable
                fastify.log.warn({
                  battleId,
                  roomCode: endRoomCode,
                  hasGameState: !!endGameState,
                  hasActiveBattle: !!endBattle
                }, 'BOT resistance check skipped: battle context unavailable')
              }

              const attackerWon = attackerForce > defenderForce
              const forceCalculationMs = Date.now() - startTime

              // Story 4.6: Log performance (NFR3 - must be < 500ms)
              fastify.log.debug({
                battleId,
                forceCalculationMs,
                attackerForce,
                defenderForce
              }, 'Force calculation completed')

              // Story 4.4 + 4.9: Clean up BattleCounter and throttle timer
              battleCounter.clearBattle(battleId)
              lastBroadcastTime.delete(battleId)

              // Battle end callback
              const battle = roomManager.endBattle(endRoomCode, battleId)
              if (battle) {
                // Story 4.7: Territory transfer logic
                let territoryTransferred = false
                let transferredTerritoryId: string | undefined

                if (attackerWon) {
                  // Get attacker's color from room state
                  const roomState = roomManager.getRoomState(endRoomCode)
                  const attackerPlayer = roomState?.players.find(p => p.id === battle.attackerId)

                  // Verify attacker is still in the room (edge case: disconnected during battle)
                  if (attackerPlayer) {
                    const attackerColor = attackerPlayer.color

                    // Transfer territory ownership
                    const transferResult = roomManager.updateTerritoryOwner(
                      endRoomCode,
                      battle.defenderTerritoryId,
                      battle.attackerId,
                      attackerColor
                    )

                    if (transferResult.success) {
                      territoryTransferred = true
                      transferredTerritoryId = battle.defenderTerritoryId

                      fastify.log.info({
                        battleId,
                        territoryId: battle.defenderTerritoryId,
                        previousOwnerId: transferResult.previousOwnerId,
                        newOwnerId: battle.attackerId
                      }, 'Territory transferred after battle victory')
                    } else {
                      // Story 4.7: Log transfer failure for debugging
                      fastify.log.error({
                        battleId,
                        territoryId: battle.defenderTerritoryId,
                        attackerId: battle.attackerId
                      }, 'Territory transfer failed unexpectedly')
                    }
                  } else {
                    // Attacker disconnected during battle - treat as defender win
                    fastify.log.warn({
                      battleId,
                      attackerId: battle.attackerId
                    }, 'Territory transfer skipped: attacker no longer in room')
                  }
                }

                // Story 4.7: Start timing for NFR1 latency measurement (< 200ms)
                const broadcastStartTime = Date.now()

                // Broadcast battle:end event with real forces and transfer status (Story 4.4 + 4.7)
                broadcastToRoom(endRoomCode, BATTLE_EVENTS.END, {
                  battleId,
                  winnerId: attackerWon ? battle.attackerId : battle.defenderId,
                  attackerWon,
                  attackerForce,
                  defenderForce,
                  territoryTransferred,
                  ...(transferredTerritoryId && { transferredTerritoryId })
                })

                // Get updated game state for territory status broadcast
                const updatedGameState = roomManager.getGameState(endRoomCode)
                if (updatedGameState) {
                  // Story 4.7: Broadcast territory update for transferred territory (with ownership change)
                  if (territoryTransferred && transferredTerritoryId) {
                    const attackerPlayer = roomManager.getPlayer(endRoomCode, battle.attackerId)
                    broadcastToRoom(endRoomCode, GAME_EVENTS.TERRITORY_UPDATE, {
                      territoryId: transferredTerritoryId,
                      newOwnerId: battle.attackerId,
                      previousOwnerId: battle.defenderId,  // null for BOT territories
                      newColor: attackerPlayer?.color ?? null
                    })
                  }

                  // Broadcast territory updates (battle flags reset) for attacker territory
                  broadcastToRoom(endRoomCode, GAME_EVENTS.TERRITORY_UPDATE, {
                    territoryId: battle.attackerTerritoryId,
                    newOwnerId: updatedGameState.territories.find(t => t.id === battle.attackerTerritoryId)?.ownerId ?? null,
                    previousOwnerId: null,
                    newColor: updatedGameState.territories.find(t => t.id === battle.attackerTerritoryId)?.color ?? null
                  })

                  // Only broadcast defender territory update if NOT transferred (avoid duplicate)
                  if (!territoryTransferred) {
                    broadcastToRoom(endRoomCode, GAME_EVENTS.TERRITORY_UPDATE, {
                      territoryId: battle.defenderTerritoryId,
                      newOwnerId: updatedGameState.territories.find(t => t.id === battle.defenderTerritoryId)?.ownerId ?? null,
                      previousOwnerId: null,
                      newColor: updatedGameState.territories.find(t => t.id === battle.defenderTerritoryId)?.color ?? null
                    })
                  }
                }
                // Story 4.7: Log timing for NFR1 compliance (should be < 200ms)
                const broadcastDuration = Date.now() - broadcastStartTime
                fastify.log.info({
                  roomCode: endRoomCode,
                  battleId,
                  attackerForce,
                  defenderForce,
                  attackerWon,
                  territoryTransferred,
                  transferredTerritoryId,
                  broadcastDurationMs: broadcastDuration,
                  nfr1Compliant: broadcastDuration < 200
                }, 'Battle ended via timeout')
              }
            }
          )

          if (!battleEvent) {
            socket.send(JSON.stringify({
              event: BATTLE_EVENTS.ATTACK_FAILED,
              data: { code: 'GAME_NOT_STARTED', message: 'Erreur lors du démarrage du combat' }
            }))
            return
          }

          // Story 4.4: Initialize BattleCounter with territory bonuses
          battleCounter.startBattle(battleEvent.battleId, attackerBonus, defenderBonus)

          // Broadcast battle start to all players in room
          broadcastToRoom(roomCode, BATTLE_EVENTS.START, battleEvent)

          fastify.log.info({
            connectionId,
            roomCode,
            playerId,
            battleId: battleEvent.battleId,
            fromTerritoryId,
            toTerritoryId
          }, 'Attack initiated, battle started')
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
