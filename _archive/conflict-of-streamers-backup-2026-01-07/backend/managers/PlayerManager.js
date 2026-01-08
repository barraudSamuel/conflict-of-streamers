import { Player, PLAYER_COLORS } from '../models/Player.js';
import { getTwitchAvatar } from '../utils/picture-profile.js';

function generateRandomHexColor() {
    return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
}

class PlayerManager {
    constructor() {
        this.players = new Map(); // playerId -> Player
        this.twitchToPlayer = new Map(); // twitchUsername -> playerId
        this.onlinePlayers = new Set(); // playerIds actuellement connectés
    }

    async createPlayer(playerId, twitchUsername, color = null) {
        const normalizedUsername = typeof twitchUsername === 'string' ? twitchUsername.trim() : '';
        const lookupKey = normalizedUsername.toLowerCase();

        if (this.players.has(playerId)) {
            const existing = this.players.get(playerId);
            const existingUsername = existing?.twitchUsername ? existing.twitchUsername.toLowerCase() : null;
            if (existingUsername && existingUsername !== lookupKey) {
                this.twitchToPlayer.delete(existing.twitchUsername.toLowerCase());
            }

            existing.twitchUsername = twitchUsername;

            if (!existing.color || this.isColorInUse(existing.color, playerId)) {
                existing.color = this.assignColor(color || existing.color, playerId);
            }

            if (lookupKey) {
                this.twitchToPlayer.set(lookupKey, playerId);
                const shouldRefreshAvatar = !existing.avatarUrl || existingUsername !== lookupKey;
                if (shouldRefreshAvatar) {
                    try {
                        const avatarUrl = await getTwitchAvatar(normalizedUsername);
                        if (avatarUrl) {
                            existing.avatarUrl = avatarUrl;
                        }
                    } catch (error) {
                        // Silently ignore avatar fetch issues to avoid blocking player creation
                    }
                }
            }

            return existing;
        }

        const assignedColor = this.assignColor(color);
        let avatarUrl = null;
        if (lookupKey) {
            try {
                avatarUrl = await getTwitchAvatar(normalizedUsername);
            } catch (error) {
                avatarUrl = null;
            }
        }

        const player = new Player(playerId, twitchUsername, assignedColor, false, avatarUrl);
        this.players.set(playerId, player);
        if (lookupKey) {
            this.twitchToPlayer.set(lookupKey, playerId);
        }

        return player;
    }

    assignColor(preferredColor = null, playerId = null) {
        const sanitized = typeof preferredColor === 'string' ? preferredColor.trim() : null;

        if (sanitized && !this.isColorInUse(sanitized, playerId)) {
            return sanitized;
        }

        const available = PLAYER_COLORS.filter(color => !this.isColorInUse(color, playerId));
        if (available.length > 0) {
            return available[Math.floor(Math.random() * available.length)];
        }

        let candidate;
        do {
            candidate = generateRandomHexColor();
        } while (this.isColorInUse(candidate, playerId));

        return candidate;
    }

    isColorInUse(color, ignorePlayerId = null) {
        if (!color) {
            return false;
        }

        const normalizedColor = color.trim();

        for (let [id, player] of this.players) {
            if (ignorePlayerId !== null && id === ignorePlayerId) {
                continue;
            }
            if (player.color === normalizedColor) {
                return true;
            }
        }

        return false;
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    getPlayerByTwitch(twitchUsername) {
        if (!twitchUsername) {
            return null;
        }
        const playerId = this.twitchToPlayer.get(twitchUsername.toLowerCase());
        return playerId ? this.players.get(playerId) : null;
    }

    playerExists(playerId) {
        return this.players.has(playerId);
    }

    deletePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            if (player.twitchUsername) {
                this.twitchToPlayer.delete(player.twitchUsername.toLowerCase());
            }
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
        if (!twitchUsername) {
            return false;
        }
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
    async importPlayerData(data) {
        if (!data || !data.players) return;

        for (let entry of data.players) {
            const playerData = entry?.data;
            if (!playerData?.id || !playerData?.twitchUsername) {
                continue;
            }

            const player = await this.createPlayer(playerData.id, playerData.twitchUsername, playerData.color);
            player.score = playerData.score || 0;
            player.isReady = playerData.isReady || false;
            player.territories = playerData.territories || [];

            const isConnected = Array.isArray(data.onlinePlayers)
                ? data.onlinePlayers.includes(playerData.id)
                : Boolean(playerData.isConnected);

            player.isConnected = isConnected;

            if (isConnected) {
                this.onlinePlayers.add(player.id);
            } else {
                this.onlinePlayers.delete(player.id);
            }
        }
    }
}

export default new PlayerManager();
