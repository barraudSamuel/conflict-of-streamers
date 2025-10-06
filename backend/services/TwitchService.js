import tmi from 'tmi.js';
import GameManager from '../managers/GameManager.js';
import AttackManager from '../managers/AttackManager.js';

class TwitchService {
    constructor() {
        this.clients = new Map(); // playerId -> tmi.Client
        this.commandHandlers = new Map();
    }

    // Connecter un streamer à son chat Twitch
    async connectToChannel(playerId, channelName, oauthToken) {
        // Si déjà connecté, déconnecter d'abord
        if (this.clients.has(playerId)) {
            await this.disconnectFromChannel(playerId);
        }

        const client = new tmi.Client({
            options: { debug: false },
            channels: [channelName]
        });

        // Gérer les messages du chat
        client.on('message', (channel, tags, message, self) => {
            if (self) return;

            this.handleChatCommand(playerId, tags.username, message);
        });

        client.on('connected', () => {
            console.log(`✅ Connected to Twitch channel: ${channelName}`);
        });

        client.on('disconnected', (reason) => {
            console.log(`❌ Disconnected from ${channelName}: ${reason}`);
        });

        await client.connect();
        this.clients.set(playerId, client);

        return client;
    }

    async disconnectFromChannel(playerId) {
        const client = this.clients.get(playerId);
        if (client) {
            await client.disconnect();
            this.clients.delete(playerId);
        }
    }

    handleChatCommand(playerId, username, message) {
        const game = GameManager.getGameByPlayerId(playerId);
        if (!game || game.status !== 'playing') return;

        const msg = message.trim().toLowerCase();

        // Commande d'attaque: !attaque <pays> ou !attack <pays>
        if (msg.startsWith('!attaque ') || msg.startsWith('!attack ')) {
            const target = msg.split(' ')[1];

            // Trouver l'attaque où ce joueur est l'attaquant
            for (let [territoryId, attack] of game.activeAttacks) {
                if (attack.attackerId === playerId && attack.status === 'ongoing') {
                    const targetMatch = attack.toTerritory.toLowerCase().includes(target) ||
                        target.includes(attack.toTerritory.toLowerCase());

                    if (targetMatch) {
                        AttackManager.addAttackCommand(game.id, territoryId, username, false);
                        this.notifyCommandProcessed(game.id, 'attack', username, territoryId);
                    }
                }
            }
        }

        // Commande de défense: !defend <pays> ou !defense <pays>
        if (msg.startsWith('!defend ') || msg.startsWith('!defense ') || msg.startsWith('!défend ')) {
            const target = msg.split(' ')[1];

            // Trouver l'attaque où ce joueur est le défenseur
            for (let [territoryId, attack] of game.activeAttacks) {
                if (attack.defenderId === playerId && attack.status === 'ongoing') {
                    const targetMatch = attack.toTerritory.toLowerCase().includes(target) ||
                        target.includes(attack.toTerritory.toLowerCase());

                    if (targetMatch) {
                        AttackManager.addAttackCommand(game.id, territoryId, username, true);
                        this.notifyCommandProcessed(game.id, 'defense', username, territoryId);
                    }
                }
            }
        }
    }

    notifyCommandProcessed(gameId, type, username, territoryId) {
        const handler = this.commandHandlers.get(gameId);
        if (handler) {
            handler(type, username, territoryId);
        }
    }

    setCommandHandler(gameId, handler) {
        this.commandHandlers.set(gameId, handler);
    }

    removeCommandHandler(gameId) {
        this.commandHandlers.delete(gameId);
    }

    // Envoyer un message dans le chat d'un streamer
    async sendMessage(playerId, message) {
        const client = this.clients.get(playerId);
        if (client && client.readyState() === 'OPEN') {
            const channels = client.getChannels();
            if (channels.length > 0) {
                await client.say(channels[0], message);
            }
        }
    }

    // Annoncer le début d'une attaque
    async announceAttack(game, attack) {
        const attacker = game.players.find(p => p.id === attack.attackerId);
        const defender = game.players.find(p => p.id === attack.defenderId);

        if (attacker) {
            await this.sendMessage(
                attack.attackerId,
                `⚔️ Attaque lancée contre ${attack.toTerritory} ! Tapez !attaque ${attack.toTerritory} pour soutenir l'attaque !`
            );
        }

        if (defender) {
            await this.sendMessage(
                attack.defenderId,
                `🛡️ Votre territoire ${attack.toTerritory} est attaqué ! Tapez !defend ${attack.toTerritory} pour le défendre !`
            );
        }
    }

    // Annoncer les résultats d'une attaque
    async announceResults(game, attack) {
        const winner = attack.winner;
        const attacker = game.players.find(p => p.id === attack.attackerId);
        const defender = game.players.find(p => p.id === attack.defenderId);

        let resultMessage = '';
        if (winner === attack.attackerId) {
            resultMessage = `🎉 ${attacker?.twitchUsername} a conquis ${attack.toTerritory} ! (${attack.attackPoints} vs ${attack.defensePoints})`;
        } else if (winner === attack.defenderId) {
            resultMessage = `🛡️ ${defender?.twitchUsername} a défendu ${attack.toTerritory} avec succès ! (${attack.defensePoints} vs ${attack.attackPoints})`;
        } else {
            resultMessage = `⚖️ Égalité ! Le territoire ${attack.toTerritory} reste à ${defender?.twitchUsername}. (${attack.attackPoints} vs ${attack.defensePoints})`;
        }

        // Envoyer aux deux streamers
        if (attacker) {
            await this.sendMessage(attack.attackerId, resultMessage);
        }
        if (defender) {
            await this.sendMessage(attack.defenderId, resultMessage);
        }
    }

    // Déconnecter tous les clients
    async disconnectAll() {
        for (let [playerId, client] of this.clients) {
            await client.disconnect();
        }
        this.clients.clear();
        this.commandHandlers.clear();
    }
}

export default new TwitchService();
