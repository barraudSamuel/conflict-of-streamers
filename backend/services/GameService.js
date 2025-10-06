import GameManager from '../managers/GameManager.js';
import AttackManager from '../managers/AttackManager.js';
import PlayerManager from '../managers/PlayerManager.js';
import MapService from './MapService.js';

/**
 * GameService - Logique métier du jeu
 * Orchestre les managers pour les opérations complexes
 */
class GameService {

    /**
     * Créer une nouvelle partie complète
     */
    async createGame(adminId, twitchUsername, settings = {}) {
        // Créer le joueur admin s'il n'existe pas
        if (!PlayerManager.playerExists(adminId)) {
            PlayerManager.createPlayer(adminId, twitchUsername);
        }

        // Créer la partie
        const game = GameManager.createGame(adminId, twitchUsername, settings);

        // Marquer le joueur comme online
        PlayerManager.setPlayerOnline(adminId, true);

        return {
            game: game.toJSON(),
            player: PlayerManager.getPlayer(adminId).toJSON()
        };
    }

    /**
     * Rejoindre une partie existante
     */
    async joinGame(code, playerId, twitchUsername) {
        // Vérifier si le username Twitch est déjà pris
        const existingPlayer = PlayerManager.getPlayerByTwitch(twitchUsername);
        if (existingPlayer && existingPlayer.id !== playerId) {
            throw new Error('This Twitch username is already in use');
        }

        // Créer le joueur s'il n'existe pas
        if (!PlayerManager.playerExists(playerId)) {
            PlayerManager.createPlayer(playerId, twitchUsername);
        }

        // Rejoindre la partie
        const game = GameManager.joinGame(code, playerId, twitchUsername);

        // Marquer comme online
        PlayerManager.setPlayerOnline(playerId, true);

        return {
            game: game.toJSON(),
            player: PlayerManager.getPlayer(playerId).toJSON()
        };
    }

    /**
     * Démarrer une partie (avec validations)
     */
    async startGame(adminId) {
        const game = GameManager.getGameByPlayerId(adminId);

        if (!game) {
            throw new Error('Game not found');
        }

        if (game.adminId !== adminId) {
            throw new Error('Only the admin can start the game');
        }

        // Vérifier que tous les joueurs ont un territoire
        if (!game.canStartGame()) {
            throw new Error('All players must select a territory before starting');
        }

        // Vérifier que les territoires sont valides
        for (let player of game.players) {
            const territory = Array.from(game.territories.values())
                .find(t => t.ownerId === player.id);

            if (!territory) {
                throw new Error(`Player ${player.twitchUsername} has no territory`);
            }

            if (!MapService.validateTerritory(territory.id)) {
                throw new Error(`Invalid territory: ${territory.id}`);
            }
        }

        // Démarrer le jeu
        GameManager.startGame(adminId);

        return {
            game: game.toJSON(),
            message: 'Game started successfully'
        };
    }

    /**
     * Initier une attaque (avec toutes les validations)
     */
    async initiateAttack(gameId, attackerId, fromTerritory, toTerritory) {
        const game = GameManager.getGame(gameId);

        if (!game) {
            throw new Error('Game not found');
        }

        // Vérifier que le jeu est en cours
        if (game.status !== 'playing') {
            throw new Error('Game is not in playing state');
        }

        // Vérifier l'adjacence des territoires via le Game (qui a déjà les neighbors)
        if (!game.areTerritoriesAdjacent(fromTerritory, toTerritory)) {
            throw new Error('Territories are not adjacent. You can only attack neighboring territories.');
        }

        // Vérifier que l'attaquant possède le territoire source
        const fromTerr = game.territories.get(fromTerritory);
        if (!fromTerr || fromTerr.ownerId !== attackerId) {
            throw new Error('You do not own the source territory');
        }

        // Vérifier que le territoire cible a un propriétaire différent
        const toTerr = game.territories.get(toTerritory);
        if (!toTerr || !toTerr.ownerId) {
            throw new Error('Target territory has no owner');
        }
        if (toTerr.ownerId === attackerId) {
            throw new Error('Cannot attack your own territory');
        }

        // Vérifier que l'attaquant n'est pas déjà en train d'attaquer
        if (!game.canPlayerAttack(attackerId)) {
            throw new Error('You are already attacking another territory');
        }

        // Vérifier que le territoire n'est pas déjà attaqué
        if (game.isTerritoryUnderAttack(toTerritory)) {
            throw new Error('This territory is already under attack');
        }

        return {
            valid: true,
            fromTerritory: fromTerr,
            toTerritory: toTerr,
            defenderId: toTerr.ownerId
        };
    }

    /**
     * Obtenir l'état complet d'une partie
     */
    getGameState(gameId) {
        const game = GameManager.getGame(gameId);

        if (!game) {
            throw new Error('Game not found');
        }

        const players = game.players.map(p => {
            const playerData = PlayerManager.getPlayer(p.id);
            return {
                ...p,
                isOnline: PlayerManager.isPlayerOnline(p.id),
                stats: PlayerManager.getPlayerStats(p.id, game)
            };
        });

        const territories = Array.from(game.territories.values()).map(t => ({
            ...t.toJSON ? t.toJSON() : t,
            isUnderAttack: game.isTerritoryUnderAttack(t.id),
            neighbors: MapService.getNeighbors(t.id).map(n => n.id)
        }));

        return {
            ...game.toJSON(),
            players,
            territories,
            activeAttacks: game.getActiveAttacks().map(a => a.toJSON()),
            leaderboard: this.getGameLeaderboard(game)
        };
    }

    /**
     * Obtenir le classement des joueurs dans une partie
     */
    getGameLeaderboard(game) {
        return game.players
            .map(p => {
                const stats = PlayerManager.getPlayerStats(p.id, game);
                return {
                    playerId: p.id,
                    twitchUsername: p.twitchUsername,
                    color: p.color,
                    score: p.score,
                    territoriesOwned: stats?.territoriesOwned || 0
                };
            })
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({
                rank: index + 1,
                ...p
            }));
    }

    /**
     * Vérifier la condition de victoire
     */
    checkVictoryCondition(game) {
        if (game.status !== 'playing') {
            return null;
        }

        const territoryOwners = new Set();
        for (let territory of game.territories.values()) {
            if (territory.ownerId) {
                territoryOwners.add(territory.ownerId);
            }
        }

        // Victoire par élimination (un seul joueur possède tous les territoires)
        if (territoryOwners.size === 1) {
            const winnerId = Array.from(territoryOwners)[0];
            const winner = game.players.find(p => p.id === winnerId);

            return {
                type: 'elimination',
                winner: winner.toJSON(),
                message: `${winner.twitchUsername} has conquered all territories!`
            };
        }

        // Victoire par score (si temps écoulé ou seuil atteint)
        if (game.settings.victoryCondition === 'score' && game.settings.victoryThreshold) {
            const topPlayer = this.getGameLeaderboard(game)[0];
            if (topPlayer.score >= game.settings.victoryThreshold) {
                const winner = game.players.find(p => p.id === topPlayer.playerId);
                return {
                    type: 'score',
                    winner: winner.toJSON(),
                    score: topPlayer.score,
                    message: `${winner.twitchUsername} reached ${topPlayer.score} points!`
                };
            }
        }

        // Victoire par temps (si temps écoulé)
        if (game.settings.timeLimit && game.startedAt) {
            const elapsed = Date.now() - game.startedAt;
            if (elapsed >= game.settings.timeLimit * 1000) {
                const topPlayer = this.getGameLeaderboard(game)[0];
                const winner = game.players.find(p => p.id === topPlayer.playerId);
                return {
                    type: 'time',
                    winner: winner.toJSON(),
                    score: topPlayer.score,
                    message: `Time's up! ${winner.twitchUsername} wins with ${topPlayer.score} points!`
                };
            }
        }

        return null;
    }

    /**
     * Terminer une partie
     */
    async endGame(gameId, reason = 'manual') {
        const game = GameManager.getGame(gameId);

        if (!game) {
            throw new Error('Game not found');
        }

        // Vérifier la condition de victoire
        const victory = this.checkVictoryCondition(game);

        // Terminer le jeu
        game.endGame();

        // Nettoyer les attaques en cours
        for (let territoryId of game.activeAttacks.keys()) {
            AttackManager.cancelAttack(gameId, territoryId);
        }

        const finalLeaderboard = this.getGameLeaderboard(game);

        return {
            game: game.toJSON(),
            victory,
            leaderboard: finalLeaderboard,
            reason
        };
    }

    /**
     * Statistiques générales du serveur
     */
    getServerStats() {
        return {
            games: {
                total: GameManager.games.size,
                byStatus: {
                    lobby: Array.from(GameManager.games.values()).filter(g => g.status === 'lobby').length,
                    playing: Array.from(GameManager.games.values()).filter(g => g.status === 'playing').length,
                    finished: Array.from(GameManager.games.values()).filter(g => g.status === 'finished').length
                }
            },
            players: {
                total: PlayerManager.getPlayerCount(),
                online: PlayerManager.getOnlinePlayerCount()
            },
            attacks: {
                active: Array.from(GameManager.games.values())
                    .reduce((sum, game) => sum + game.activeAttacks.size, 0)
            }
        };
    }
}

export default new GameService();
