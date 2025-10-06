import GameManager from '../managers/GameManager.js';
import AttackManager from '../managers/AttackManager.js';

export default async function gameRoutes(fastify) {

    // Créer une nouvelle partie
    fastify.post('/create', async (request, reply) => {
        try {
            const { adminId, twitchUsername, settings } = request.body;

            if (!adminId || !twitchUsername) {
                return reply.code(400).send({ error: 'adminId and twitchUsername are required' });
            }

            const game = GameManager.createGame(adminId, twitchUsername, settings);

            return {
                success: true,
                game: game.toJSON()
            };
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Obtenir les infos d'une partie
    fastify.get('/:gameId', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const game = GameManager.getGame(gameId);

            if (!game) {
                return reply.code(404).send({ error: 'Game not found' });
            }

            return {
                success: true,
                game: game.toJSON()
            };
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Assigner un territoire à un joueur
    fastify.post('/:gameId/territory', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const { playerId, territoryId } = request.body;

            if (!playerId || !territoryId) {
                return reply.code(400).send({ error: 'playerId and territoryId are required' });
            }

            const game = GameManager.assignTerritory(playerId, territoryId);

            return {
                success: true,
                game: game.toJSON()
            };
        } catch (error) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Marquer un joueur comme prêt
    fastify.post('/:gameId/ready', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const { playerId, isReady } = request.body;

            if (!playerId || typeof isReady !== 'boolean') {
                return reply.code(400).send({ error: 'playerId and isReady are required' });
            }

            const game = GameManager.updatePlayerReady(playerId, isReady);

            return {
                success: true,
                game: game.toJSON()
            };
        } catch (error) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Démarrer la partie
    fastify.post('/:gameId/start', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const { adminId } = request.body;

            if (!adminId) {
                return reply.code(400).send({ error: 'adminId is required' });
            }

            const game = GameManager.startGame(adminId);

            return {
                success: true,
                game: game.toJSON()
            };
        } catch (error) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Lancer une attaque
    fastify.post('/:gameId/attack', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const { attackerId, fromTerritory, toTerritory } = request.body;

            if (!attackerId || !fromTerritory || !toTerritory) {
                return reply.code(400).send({
                    error: 'attackerId, fromTerritory, and toTerritory are required'
                });
            }

            const game = GameManager.getGame(gameId);
            if (!game) {
                return reply.code(404).send({ error: 'Game not found' });
            }

            // Vérifier la validité de l'attaque
            const validation = AttackManager.canAttack(game, attackerId, fromTerritory, toTerritory);
            if (!validation.valid) {
                return reply.code(400).send({ error: validation.error });
            }

            // Note: Le démarrage réel de l'attaque se fait via WebSocket
            // Cette route sert principalement à la validation
            return {
                success: true,
                canAttack: true
            };
        } catch (error) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Obtenir l'état de l'attaque en cours
    fastify.get('/:gameId/attack/current', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const attacks = AttackManager.getAllAttacks(gameId);

            if (attacks.length === 0) {
                return reply.code(404).send({ error: 'No active attacks' });
            }

            return {
                success: true,
                attacks: attacks.map(a => a.toJSON()),
                count: attacks.length
            };
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Quitter une partie
    fastify.post('/:gameId/leave', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const { playerId } = request.body;

            if (!playerId) {
                return reply.code(400).send({ error: 'playerId is required' });
            }

            GameManager.leaveGame(playerId);

            return {
                success: true,
                message: 'Left game successfully'
            };
        } catch (error) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Lister toutes les parties (debug)
    fastify.get('/list/all', async (request, reply) => {
        try {
            const games = GameManager.getAllGames();
            return {
                success: true,
                games,
                count: games.length
            };
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Obtenir la liste des territoires disponibles
    fastify.get('/:gameId/territories/available', async (request, reply) => {
        try {
            const { gameId } = request.params;
            const game = GameManager.getGame(gameId);

            if (!game) {
                return reply.code(404).send({ error: 'Game not found' });
            }

            const available = game.getAvailableTerritories();

            return {
                success: true,
                territories: available,
                count: available.length
            };
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Obtenir les territoires d'un joueur
    fastify.get('/:gameId/territories/player/:playerId', async (request, reply) => {
        try {
            const { gameId, playerId } = request.params;
            const game = GameManager.getGame(gameId);

            if (!game) {
                return reply.code(404).send({ error: 'Game not found' });
            }

            const territories = game.getPlayerTerritories(playerId);

            return {
                success: true,
                territories,
                count: territories.length
            };
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}
