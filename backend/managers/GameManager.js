import { Game } from '../models/Game.js';
import { Player } from '../models/Player.js';
import PlayerManager from './PlayerManager.js';

class GameManager {
    constructor() {
        this.games = new Map();
        this.playerToGame = new Map(); // playerId -> gameId
    }

    createGame(adminId, twitchUsername, settings) {
        const game = new Game(adminId, twitchUsername, settings);
        const adminRecord = PlayerManager.createPlayer(adminId, twitchUsername);
        const adminColor = adminRecord?.color;
        const admin = new Player(adminId, twitchUsername, adminColor, true);
        game.addPlayer(admin);

        this.games.set(game.id, game);
        this.playerToGame.set(adminId, game.id);

        return game;
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    getGameByCode(code) {
        return Array.from(this.games.values()).find(g => g.code === code);
    }

    getGameByPlayerId(playerId) {
        const gameId = this.playerToGame.get(playerId);
        return gameId ? this.games.get(gameId) : null;
    }

    joinGame(code, playerId, twitchUsername) {
        const game = this.getGameByCode(code);
        if (!game) {
            throw new Error('Game not found');
        }

        // Vérifier si le joueur est déjà dans une partie
        const existingGameId = this.playerToGame.get(playerId);
        if (existingGameId && existingGameId !== game.id) {
            throw new Error('Player already in another game');
        }

        const playerRecord = PlayerManager.createPlayer(playerId, twitchUsername);
        const playerColor = playerRecord?.color;
        const player = new Player(playerId, twitchUsername, playerColor, false);
        game.addPlayer(player);
        this.playerToGame.set(playerId, game.id);

        return game;
    }

    leaveGame(playerId) {
        const game = this.getGameByPlayerId(playerId);
        if (!game) return null;

        game.removePlayer(playerId);
        this.playerToGame.delete(playerId);

        // Si le créateur part ou s'il n'y a plus de joueurs, supprimer la partie
        if (game.adminId === playerId || game.players.length === 0) {
            this.deleteGame(game.id);
        }

        return game;
    }

    deleteGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;

        // Nettoyer les références des joueurs
        for (let player of game.players) {
            this.playerToGame.delete(player.id);
        }

        this.games.delete(gameId);
    }

    assignTerritory(playerId, territoryId) {
        const game = this.getGameByPlayerId(playerId);
        if (!game) {
            throw new Error('Player not in a game');
        }

        game.assignTerritory(playerId, territoryId);
        return game;
    }

    updatePlayerReady(playerId, isReady) {
        const game = this.getGameByPlayerId(playerId);
        if (!game) {
            throw new Error('Player not in a game');
        }

        const player = game.players.find(p => p.id === playerId);
        if (player) {
            player.isReady = isReady;
        }

        return game;
    }

    startGame(adminId) {
        const game = this.getGameByPlayerId(adminId);
        if (!game) {
            throw new Error('Game not found');
        }

        if (game.adminId !== adminId) {
            throw new Error('Only admin can start the game');
        }

        game.startGame();
        return game;
    }

    updateGameSettings(gameId, adminId, settings) {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        if (game.adminId !== adminId) {
            throw new Error('Only admin can update the settings');
        }

        game.updateSettings(settings);
        return game;
    }

    getAllGames() {
        return Array.from(this.games.values()).map(g => g.toJSON());
    }

    // Nettoyage des parties terminées (à appeler périodiquement)
    cleanupOldGames(maxAge = 3600000) { // 1 heure par défaut
        const now = Date.now();
        for (let [gameId, game] of this.games) {
            if (game.status === 'finished' && (now - game.finishedAt) > maxAge) {
                this.deleteGame(gameId);
            }
        }
    }
}

export default new GameManager();
