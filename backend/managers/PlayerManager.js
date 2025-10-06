import { Player } from '../models/Player.js';

class PlayerManager {
    constructor() {
        this.players = new Map(); // playerId -> Player
        this.twitchToPlayer = new Map(); // twitchUsername -> playerId
        this.onlinePlayers = new Set(); // playerIds actuellement connectés
    }

    createPlayer(playerId, twitchUsername, color = null) {
        if (this.players.has(playerId)) {
            return this.players.get(playerId);
        }

        const player = new Player(playerId, twitchUsername, color);
        this.players.set(playerId, player);
        this.twitchToPlayer.set(twitchUsername.toLowerCase(), playerId);

        return player;
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    getPlayerByTwitch(twitchUsername) {
        const playerId = this.twitchToPlayer.get(twitchUsername.toLowerCase());
        return playerId ? this.players.get(playerId) : null;
    }

    playerExists(playerId) {
        return this.players.has(playerId);
    }

    deletePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.twitchToPlayer.delete(player.twitchUsername.toLowerCase());
            this.players.delete(playerId);
            this.onlinePlayers.delete(playerId);
        }
    }

    setPlayerOnline(playerId, isOnline = true) {
        const player = this.players.get(playerId);
        if (player) {
            player.isConnected = isOnline;
            if (isOnline) {
                this.onlinePlayers.add(playerId);
            } else {
                this.onlinePlayers.delete(playerId);
            }
        }
    }

    isPlayerOnline(playerId) {
        return this.onlinePlayers.has(playerId);
    }

    getOnlinePlayers() {
        return Array.from(this.onlinePlayers)
            .map(id => this.players.get(id))
            .filter(Boolean);
    }

    getAllPlayers() {
        return Array.from(this.players.values());
    }

    getPlayerCount() {
        return this.players.size;
    }

    getOnlinePlayerCount() {
        return this.onlinePlayers.size;
    }

    // Mettre à jour le score d'un joueur
    updatePlayerScore(playerId, points) {
        const player = this.players.get(playerId);
        if (player) {
            player.addScore(points);
            return player;
        }
        return null;
    }

    // Obtenir le classement des joueurs par score
    getLeaderboard(limit = 10) {
        return Array.from(this.players.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((player, index) => ({
                rank: index + 1,
                ...player.toJSON()
            }));
    }

    // Réinitialiser les scores de tous les joueurs
    resetAllScores() {
        for (let player of this.players.values()) {
            player.score = 0;
        }
    }

    // Obtenir les statistiques d'un joueur
    getPlayerStats(playerId, game) {
        const player = this.players.get(playerId);
        if (!player || !game) return null;

        const stats = {
            playerId: player.id,
            twitchUsername: player.twitchUsername,
            score: player.score,
            territoriesOwned: 0,
            territoriesConquered: 0,
            territoriesLost: 0,
            isConnected: player.isConnected
        };

        // Compter les territoires possédés actuellement
        for (let territory of game.territories.values()) {
            if (territory.ownerId === playerId) {
                stats.territoriesOwned++;
            }

            // Compter les territoires conquis (dans l'historique)
            if (territory.history) {
                for (let entry of territory.history) {
                    if (entry.playerId === playerId) {
                        stats.territoriesLost++;
                    }
                }
            }
        }

        return stats;
    }

    // Vérifier si un nom Twitch est déjà utilisé
    isTwitchUsernameTaken(twitchUsername) {
        return this.twitchToPlayer.has(twitchUsername.toLowerCase());
    }

    // Obtenir tous les joueurs d'un jeu spécifique
    getPlayersInGame(game) {
        return game.players.map(p => this.players.get(p.id)).filter(Boolean);
    }

    // Nettoyer les joueurs inactifs
    cleanupInactivePlayers(inactiveThreshold = 3600000) { // 1 heure par défaut
        const now = Date.now();
        const toDelete = [];

        for (let [playerId, player] of this.players) {
            if (!player.isConnected && (now - player.joinedAt) > inactiveThreshold) {
                toDelete.push(playerId);
            }
        }

        for (let playerId of toDelete) {
            this.deletePlayer(playerId);
        }

        return toDelete.length;
    }

    // Exporter les données des joueurs
    exportPlayerData() {
        return {
            players: Array.from(this.players.entries()).map(([id, player]) => ({
                id,
                data: player.toJSON()
            })),
            onlinePlayers: Array.from(this.onlinePlayers),
            totalPlayers: this.players.size,
            onlineCount: this.onlinePlayers.size
        };
    }

    // Importer les données des joueurs (pour persistance)
    importPlayerData(data) {
        if (!data || !data.players) return;

        for (let entry of data.players) {
            const player = new Player(entry.data.id, entry.data.twitchUsername, entry.data.color);
            player.score = entry.data.score || 0;
            player.isReady = entry.data.isReady || false;
            player.territories = entry.data.territories || [];
            player.isConnected = data.onlinePlayers?.includes(entry.data.id) || false;

            this.players.set(entry.data.id, player);
            this.twitchToPlayer.set(player.twitchUsername.toLowerCase(), player.id);

            if (player.isConnected) {
                this.onlinePlayers.add(player.id);
            }
        }
    }
}

export default new PlayerManager();
