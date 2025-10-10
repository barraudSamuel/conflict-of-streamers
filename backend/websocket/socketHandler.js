import GameManager from '../managers/GameManager.js';
import AttackManager from '../managers/AttackManager.js';
import TwitchService from '../services/TwitchService.js';

const connections = new Map(); // playerId -> WebSocket
const gameConnections = new Map(); // gameId -> Set<playerId>

export function setupWebSocket(connection, req) {
    let playerId = null;
    let gameId = null;

    console.log('🔌 New WebSocket connection');

    connection.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            await handleMessage(connection, data);
        } catch (error) {
            connection.send(JSON.stringify({
                type: 'error',
                error: error.message
            }));
        }
    });

    connection.on('close', () => {
        console.log(`🔌 WebSocket closed for player: ${playerId}`);
        if (playerId) {
            connections.delete(playerId);

            if (gameId) {
                const gamePlayers = gameConnections.get(gameId);
                if (gamePlayers) {
                    gamePlayers.delete(playerId);
                    if (gamePlayers.size === 0) {
                        gameConnections.delete(gameId);
                    }
                }
            }

            if (gameId) {
                broadcastToGame(gameId, {
                    type: 'player:disconnected',
                    playerId
                });
            }
        }
    });

    async function handleMessage(socket, data) {
        const { type, payload } = data;

        switch (type) {
            case 'register':
                // Enregistrer la connexion
                playerId = payload.playerId;
                gameId = payload.gameId;
                connections.set(playerId, socket);

                if (!gameConnections.has(gameId)) {
                    gameConnections.set(gameId, new Set());
                }
                gameConnections.get(gameId).add(playerId);

                socket.send(JSON.stringify({
                    type: 'registered',
                    playerId,
                    gameId,
                    connectedPlayerIds: Array.from(gameConnections.get(gameId) || [])
                }));

                broadcastToGame(gameId, {
                    type: 'player:connected',
                    playerId
                });

                const registerGame = GameManager.getGame(gameId);
                if (registerGame) {
                    await TwitchService.syncGameChannels(registerGame);
                }
                break;

            case 'game:update':
                // Envoyer une mise à jour du jeu à tous les joueurs
                const game = GameManager.getGame(payload.gameId);
                if (game) {
                    broadcastToGame(payload.gameId, {
                        type: 'game:state',
                        game: game.toJSON()
                    });
                    await TwitchService.syncGameChannels(game);
                }
                break;

            case 'attack:start':
                // Démarrer une attaque
                const { attackerId, fromTerritory, toTerritory } = payload;
                gameId = GameManager.getGameByPlayerId(attackerId)?.id;

                if (!gameId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Game not found'
                    }));
                    return;
                }

                const attackGame = GameManager.getGame(gameId);
                if (attackGame) {
                    await TwitchService.syncGameChannels(attackGame);
                }

                const attack = AttackManager.startAttack(
                    gameId,
                    attackerId,
                    fromTerritory,
                    toTerritory,
                    (attackData) => {
                        // Mise à jour en temps réel
                        broadcastToGame(gameId, {
                            type: 'attack:update',
                            attack: attackData,
                            territoryId: toTerritory
                        });
                    },
                    (attackData, gameData) => {
                        // Attaque terminée
                        broadcastToGame(gameId, {
                            type: 'attack:finished',
                            attack: attackData,
                            territoryId: toTerritory,
                            game: gameData
                        });

                        // Annoncer les résultats dans les chats Twitch
                        if (attackData) {
                            TwitchService.announceResults(attackGame, attackData);
                        }
                    }
                );

                // Annoncer l'attaque dans les chats
                await TwitchService.announceAttack(attackGame, attack);

                // Setup command handler pour cette partie (une seule fois)
                if (!TwitchService.commandHandlers.has(gameId)) {
                    TwitchService.setCommandHandler(gameId, (commandType, username, territoryId, attackData) => {
                        broadcastToGame(gameId, {
                            type: 'command:received',
                            commandType,
                            username,
                            territoryId,
                            attack: attackData,
                            timestamp: Date.now()
                        });
                    });
                }

                broadcastToGame(gameId, {
                    type: 'attack:started',
                    attack: attack.toJSON(),
                    territoryId: toTerritory
                });
                break;

            case 'attack:cancel': {
                if (!playerId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Player not registered'
                    }));
                    break;
                }

                const targetTerritoryId = payload?.territoryId;
                const expectedAttackId = payload?.attackId;

                if (!targetTerritoryId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'territoryId is required to cancel an attack'
                    }));
                    break;
                }

                const cancelGame = GameManager.getGameByPlayerId(playerId);
                if (!cancelGame) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Game not found'
                    }));
                    break;
                }

                const activeAttack = AttackManager.getAttack(cancelGame.id, targetTerritoryId);
                if (!activeAttack) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'No active attack found for this territory'
                    }));
                    break;
                }

                if (expectedAttackId && activeAttack.id !== expectedAttackId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Attack identifier mismatch'
                    }));
                    break;
                }

                if (activeAttack.attackerId !== playerId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Only the attacker can cancel this attack'
                    }));
                    break;
                }

                const cancelledAttack = AttackManager.cancelAttack(cancelGame.id, targetTerritoryId, {
                    cancelledBy: playerId,
                    reason: 'attacker_cancelled'
                });

                if (!cancelledAttack) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Failed to cancel the attack'
                    }));
                    break;
                }

                const cancelBroadcast = {
                    type: 'attack:cancelled',
                    attack: cancelledAttack,
                    territoryId: targetTerritoryId,
                    cancelledBy: playerId,
                    reason: 'attacker_cancelled',
                    game: cancelGame.toJSON()
                };

                broadcastToGame(cancelGame.id, cancelBroadcast);

                await TwitchService.syncGameChannels(cancelGame);
                await TwitchService.announceAttackCancellation(cancelGame, cancelledAttack);
                break;
            }

            case 'twitch:connect':
                // Connecter au chat Twitch
                const { channelName } = payload;
                try {
                    const targetGameId = gameId || GameManager.getGameByPlayerId(playerId)?.id;
                    if (!targetGameId) {
                        throw new Error('Game context not found for player');
                    }

                    await TwitchService.connectToChannel(targetGameId, playerId, channelName);

                    const currentGame = GameManager.getGame(targetGameId);
                    if (currentGame) {
                        await TwitchService.syncGameChannels(currentGame);
                    }

                    socket.send(JSON.stringify({
                        type: 'twitch:connected',
                        channelName
                    }));
                } catch (error) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: `Failed to connect to Twitch: ${error.message}`
                    }));
                }
                break;

            case 'twitch:disconnect':
                // Déconnecter du chat Twitch
                await TwitchService.disconnectFromChannel(playerId);
                socket.send(JSON.stringify({
                    type: 'twitch:disconnected'
                }));
                break;

            case 'player:ready':
                // Mettre à jour le statut ready d'un joueur
                const updatedGame = GameManager.updatePlayerReady(payload.playerId, payload.isReady);
                broadcastToGame(updatedGame.id, {
                    type: 'player:ready',
                    playerId: payload.playerId,
                    isReady: payload.isReady,
                    game: updatedGame.toJSON()
                });
                await TwitchService.syncGameChannels(updatedGame);
                break;

            case 'territory:assign':
                // Assigner un territoire
                const gameWithTerritory = GameManager.assignTerritory(payload.playerId, payload.territoryId);
                broadcastToGame(gameWithTerritory.id, {
                    type: 'territory:assigned',
                    playerId: payload.playerId,
                    territoryId: payload.territoryId,
                    game: gameWithTerritory.toJSON()
                });
                await TwitchService.syncGameChannels(gameWithTerritory);
                break;

            case 'game:start':
                // Démarrer la partie
                const startedGame = GameManager.startGame(payload.adminId);
                broadcastToGame(startedGame.id, {
                    type: 'game:started',
                    game: startedGame.toJSON()
                });
                await TwitchService.syncGameChannels(startedGame);
                break;

            case 'player:leave':
                // Joueur quitte la partie
                const leftGame = GameManager.leaveGame(payload.playerId);
                if (leftGame) {
                    broadcastToGame(leftGame.id, {
                        type: 'player:left',
                        playerId: payload.playerId,
                        game: leftGame.toJSON()
                    });
                    await TwitchService.syncGameChannels(leftGame);
                }
                break;

            case 'player:kick': {
                if (!playerId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Player not registered'
                    }));
                    break;
                }

                const targetId = payload?.targetId;
                if (!targetId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'targetId is required'
                    }));
                    break;
                }

                const adminGame = GameManager.getGameByPlayerId(playerId);
                if (!adminGame) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Game not found'
                    }));
                    break;
                }

                if (adminGame.adminId !== playerId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Only the admin can remove players'
                    }));
                    break;
                }

                if (targetId === playerId) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Cannot remove yourself'
                    }));
                    break;
                }

                const targetGame = GameManager.getGameByPlayerId(targetId);
                if (!targetGame || targetGame.id !== adminGame.id) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Target player not found in this game'
                    }));
                    break;
                }

                const updatedGame = GameManager.leaveGame(targetId);
                if (!updatedGame) {
                    socket.send(JSON.stringify({
                        type: 'error',
                        error: 'Unable to remove player'
                    }));
                    break;
                }

                const targetSocket = connections.get(targetId);
                if (targetSocket && targetSocket.readyState === 1) {
                    broadcastToPlayer(targetId, {
                        type: 'player:kick-notice',
                        gameId: updatedGame.id
                    });

                    setTimeout(() => {
                        if (targetSocket.readyState === 1) {
                            targetSocket.close();
                        }
                    }, 50);
                } else {
                    broadcastToPlayer(targetId, {
                        type: 'player:kick-notice',
                        gameId: updatedGame.id
                    });
                }

                broadcastToGame(updatedGame.id, {
                    type: 'player:kicked',
                    playerId: targetId,
                    game: updatedGame.toJSON()
                });
                await TwitchService.syncGameChannels(updatedGame);
                break;
            }

            case 'ping':
                socket.send(JSON.stringify({ type: 'pong' }));
                break;

            default:
                socket.send(JSON.stringify({
                    type: 'error',
                    error: `Unknown message type: ${type}`
                }));
        }
    }
}

export function broadcastToGame(gameId, message) {
    const players = gameConnections.get(gameId);
    if (!players) return;

    const messageStr = JSON.stringify(message);

    for (let playerId of players) {
        const socket = connections.get(playerId);
        if (socket && socket.readyState === 1) { // OPEN
            socket.send(messageStr);
        }
    }
}

export function broadcastToPlayer(playerId, message) {
    const socket = connections.get(playerId);
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(message));
    }
}
