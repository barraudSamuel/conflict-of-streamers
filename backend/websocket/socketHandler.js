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
                    gameId
                }));
                break;

            case 'game:update':
                // Envoyer une mise à jour du jeu à tous les joueurs
                const game = GameManager.getGame(payload.gameId);
                if (game) {
                    broadcastToGame(payload.gameId, {
                        type: 'game:state',
                        game: game.toJSON()
                    });
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
                        const finishedAttack = attackGame.activeAttacks.get(toTerritory);
                        if (finishedAttack) {
                            TwitchService.announceResults(attackGame, finishedAttack);
                        }
                    }
                );

                // Annoncer l'attaque dans les chats
                await TwitchService.announceAttack(attackGame, attack);

                // Setup command handler pour cette partie (une seule fois)
                if (!TwitchService.commandHandlers.has(gameId)) {
                    TwitchService.setCommandHandler(gameId, (commandType, username, territoryId) => {
                        broadcastToGame(gameId, {
                            type: 'command:received',
                            commandType,
                            username,
                            territoryId,
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

            case 'twitch:connect':
                // Connecter au chat Twitch
                const { channelName, oauthToken } = payload;
                try {
                    await TwitchService.connectToChannel(playerId, channelName, oauthToken);
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
                break;

            case 'game:start':
                // Démarrer la partie
                const startedGame = GameManager.startGame(payload.adminId);
                broadcastToGame(startedGame.id, {
                    type: 'game:started',
                    game: startedGame.toJSON()
                });
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
                }
                break;

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

function broadcastToGame(gameId, message) {
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
