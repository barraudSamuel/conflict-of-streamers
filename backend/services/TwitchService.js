import tmi from 'tmi.js';
import GameManager from '../managers/GameManager.js';
import AttackManager from '../managers/AttackManager.js';
import ReinforcementManager from '../managers/ReinforcementManager.js';
import { getTwitchAvatar } from '../utils/picture-profile.js';

const READY_STATE_OPEN = 'OPEN';

class TwitchService {
    constructor() {
        this.gameClients = new Map(); // gameId -> Map<playerId, { client, channel }>
        this.playerToGame = new Map(); // playerId -> gameId
        this.playerChannels = new Map(); // playerId -> channel
        this.commandHandlers = new Map();
    }

    normalizeChannel(channel) {
        if (typeof channel !== 'string') {
            return '';
        }
        return channel.trim().replace(/^#/, '').toLowerCase();
    }

    normalizeTarget(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().toLowerCase();
    }

    doesTargetMatch(attack, territoryId, incomingTarget) {
        const normalizedTarget = this.normalizeTarget(incomingTarget);
        if (!normalizedTarget) {
            return false;
        }

        const candidates = [
            attack.toTerritoryName,
            attack.toTerritory,
            territoryId
        ].map((candidate) => this.normalizeTarget(candidate));

        return candidates.some((candidate) => {
            if (!candidate) return false;
            return candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate);
        });
    }

    registerClient(gameId, playerId, channel, client) {
        if (!this.gameClients.has(gameId)) {
            this.gameClients.set(gameId, new Map());
        }
        const gameMap = this.gameClients.get(gameId);
        gameMap.set(playerId, { client, channel });
        this.playerToGame.set(playerId, gameId);
        this.playerChannels.set(playerId, channel);
    }

    getClientEntry(playerId) {
        const gameId = this.playerToGame.get(playerId);
        if (!gameId) return null;
        const gameMap = this.gameClients.get(gameId);
        if (!gameMap) return null;
        return gameMap.get(playerId) ?? null;
    }

    async connectToChannel(gameId, playerId, channelName) {
        const normalizedChannel = this.normalizeChannel(channelName);
        if (!gameId || !playerId || !normalizedChannel) {
            return null;
        }

        const currentEntry = this.getClientEntry(playerId);
        if (currentEntry && currentEntry.channel === normalizedChannel) {
            return currentEntry.client;
        }

        await this.disconnectFromChannel(playerId);

        const client = new tmi.Client({
            options: { debug: false },
            connection: { secure: true, reconnect: true },
            channels: [normalizedChannel]
        });

        client.on('message', async (channel, tags, message, self) => {
            if (self) return;
            try {
                await this.handleChatCommand(gameId, playerId, tags, message);
            } catch (error) {
                console.error(`Failed to handle Twitch chat command: ${error.message}`);
            }
        });

        client.on('connected', () => {
            console.log(`✅ Connected to Twitch channel: ${normalizedChannel}`);
        });

        client.on('disconnected', (reason) => {
            console.log(`❌ Disconnected from ${normalizedChannel}: ${reason}`);
        });

        await client.connect();
        this.registerClient(gameId, playerId, normalizedChannel, client);

        return client;
    }

    async disconnectFromChannel(playerId) {
        const entry = this.getClientEntry(playerId);
        if (!entry) {
            this.playerToGame.delete(playerId);
            this.playerChannels.delete(playerId);
            return;
        }

        const { client } = entry;
        const gameId = this.playerToGame.get(playerId);

        try {
            await client.disconnect();
        } catch (error) {
            console.warn(`Failed to disconnect Twitch client for player ${playerId}: ${error.message}`);
        }

        if (gameId && this.gameClients.has(gameId)) {
            const gameMap = this.gameClients.get(gameId);
            gameMap.delete(playerId);
            if (gameMap.size === 0) {
                this.gameClients.delete(gameId);
            }
        }

        this.playerToGame.delete(playerId);
        this.playerChannels.delete(playerId);
    }

    async disconnectGame(gameId) {
        const gameMap = this.gameClients.get(gameId);
        if (!gameMap) return;

        for (let playerId of gameMap.keys()) {
            await this.disconnectFromChannel(playerId);
        }
        this.gameClients.delete(gameId);
    }

    async disconnectAll() {
        for (let gameId of this.gameClients.keys()) {
            await this.disconnectGame(gameId);
        }
        this.commandHandlers.clear();
    }

    async syncGameChannels(game) {
        if (!game || !game.id) {
            return;
        }

        const desiredPlayers = new Map();
        const players = Array.isArray(game.players) ? game.players : [];

        for (let player of players) {
            const normalized = this.normalizeChannel(player?.twitchUsername);
            if (!player?.id || !normalized) continue;
            desiredPlayers.set(player.id, { normalized, raw: player.twitchUsername });
        }

        const existingEntries = this.gameClients.get(game.id);
        if (existingEntries) {
            for (let [playerId, entry] of existingEntries) {
                const desired = desiredPlayers.get(playerId);
                if (!desired || desired.normalized !== entry.channel) {
                    await this.disconnectFromChannel(playerId);
                }
            }
        }

        for (let [playerId, { raw, normalized }] of desiredPlayers) {
            const entry = this.getClientEntry(playerId);
            if (!entry || entry.channel !== normalized) {
                try {
                    await this.connectToChannel(game.id, playerId, raw);
                } catch (error) {
                    console.error(`Failed to connect to Twitch channel ${raw}: ${error.message}`);
                }
            }
        }

        if (desiredPlayers.size === 0) {
            await this.disconnectGame(game.id);
        }
    }

    async buildViewerInfo(tags) {
        const rawUsername = typeof tags?.username === 'string' ? tags.username : '';
        const rawDisplayName = typeof tags?.['display-name'] === 'string' ? tags['display-name'] : '';
        const rawUserId = typeof tags?.['user-id'] === 'string' ? tags['user-id'] : '';
        const userId = rawUserId && rawUserId.trim() !== '' ? rawUserId.trim() : null;
        const usernameBase = rawUsername && rawUsername.trim() !== '' ? rawUsername.trim() : null;
        const displayNameBase = rawDisplayName && rawDisplayName.trim() !== '' ? rawDisplayName.trim() : null;

        const username = usernameBase ?? displayNameBase ?? (userId ? `viewer-${userId}` : 'viewer');
        const displayName = displayNameBase ?? username;
        const avatarLookup = usernameBase ?? displayNameBase;
        let avatarUrl = null;

        if (avatarLookup) {
            try {
                avatarUrl = await getTwitchAvatar(avatarLookup);
            } catch (error) {
                avatarUrl = null;
            }
        }

        return {
            id: userId,
            username,
            displayName,
            color: typeof tags?.color === 'string' ? tags.color : null,
            avatarUrl
        };
    }

    async handleChatCommand(gameId, playerId, tags, message) {
        const game = GameManager.getGame(gameId);
        if (!game || game.status !== 'playing') return;

        const msg = typeof message === 'string' ? message.trim().toLowerCase() : '';
        if (!msg) return;

        const viewer = await this.buildViewerInfo(tags);
        const username = viewer.username;

        const processAttackCommand = (territoryId, isDefense) => {
            const added = AttackManager.addAttackCommand(game.id, territoryId, viewer, isDefense);
            if (added) {
                const updatedAttack = game.activeAttacks.get(territoryId);
                this.notifyCommandProcessed(
                    game.id,
                    isDefense ? 'defense' : 'attack',
                    username,
                    territoryId,
                    {
                        attack: updatedAttack ? updatedAttack.toJSON() : null,
                        viewer
                    }
                );
            }
        };

        if (msg.startsWith('!attaque ') || msg.startsWith('!attack ')) {
            const target = msg.split(' ')[1];
            for (let [territoryId, attack] of game.activeAttacks) {
                if (attack.attackerId === playerId && attack.status === 'ongoing') {
                    const targetMatch = this.doesTargetMatch(attack, territoryId, target);
                    if (targetMatch) {
                        processAttackCommand(territoryId, false);
                    }
                }
            }
        }

        if (
            msg.startsWith('!defend ') ||
            msg.startsWith('!defense ') ||
            msg.startsWith('!défend ')
        ) {
            const target = msg.split(' ')[1];
            for (let [territoryId, attack] of game.activeAttacks) {
                if (attack.defenderId === playerId && attack.status === 'ongoing') {
                    const targetMatch = this.doesTargetMatch(attack, territoryId, target);
                    if (targetMatch) {
                        processAttackCommand(territoryId, true);
                    }
                }
            }
        }

        if (
            msg.startsWith('!renfort ') ||
            msg.startsWith('!reinforce ') ||
            msg.startsWith('!boost ')
        ) {
            const target = msg.split(' ')[1];
            for (let [territoryId, reinforcement] of game.activeReinforcements) {
                if (reinforcement.initiatorId === playerId && reinforcement.status === 'ongoing') {
                    const synthetic = {
                        toTerritoryName: reinforcement.territoryName,
                        toTerritory: reinforcement.territoryId
                    };
                    const targetMatch = this.doesTargetMatch(synthetic, territoryId, target);
                    if (targetMatch) {
                        const updated = ReinforcementManager.addContribution(
                            game.id,
                            territoryId,
                            viewer.username,
                            game.settings?.pointsPerCommand ?? 1
                        );
                        if (updated) {
                            this.notifyCommandProcessed(
                                game.id,
                                'reinforcement',
                                viewer.username,
                                territoryId,
                                {
                                    reinforcement: updated,
                                    viewer
                                }
                            );
                        }
                    }
                }
            }
        }
    }

    notifyCommandProcessed(gameId, type, username, territoryId, payload = {}) {
        const handler = this.commandHandlers.get(gameId);
        if (handler) {
            handler(type, username, territoryId, payload);
        }
    }

    setCommandHandler(gameId, handler) {
        this.commandHandlers.set(gameId, handler);
    }

    removeCommandHandler(gameId) {
        this.commandHandlers.delete(gameId);
    }

    async sendMessage(playerId, message) {
        const entry = this.getClientEntry(playerId);
        if (!entry) return false;
        const { client } = entry;

        if (typeof client.readyState === 'function' && client.readyState() !== READY_STATE_OPEN) {
            return false;
        }

        const channels = client.getChannels();
        const targetChannel = Array.isArray(channels) && channels.length > 0 ? channels[0] : null;
        if (!targetChannel) return false;

        const options = typeof client.getOptions === 'function' ? client.getOptions() : client.opts;
        const identity = options?.identity;
        const hasIdentity = identity && typeof identity.username === 'string' && identity.username !== '' &&
            typeof identity.password === 'string' && identity.password !== '';

        if (!hasIdentity) {
            return false;
        }

        try {
            await client.say(targetChannel, message);
            return true;
        } catch (error) {
            console.warn(`Failed to send Twitch message to ${targetChannel}: ${error.message}`);
            return false;
        }
    }

    async announceAttack(game, attack) {
        const attacker = game.players.find(p => p.id === attack.attackerId);
        const defender = game.players.find(p => p.id === attack.defenderId);

        if (attacker) {
            await this.sendMessage(
                attack.attackerId,
                `⚔️ Attaque lancée contre ${attack.toTerritoryName || attack.toTerritory} ! Tapez !attaque ${attack.toTerritoryName || attack.toTerritory} pour soutenir l'attaque !`
            );
        }

        if (defender) {
            await this.sendMessage(
                attack.defenderId,
                `🛡️ Votre territoire ${attack.toTerritoryName || attack.toTerritory} est attaqué ! Tapez !defend ${attack.toTerritoryName || attack.toTerritory} pour le défendre !`
            );
        }
    }

    async announceAttackCancellation(game, attack) {
        if (!attack) return;

        const territoryLabel = attack.toTerritoryName || attack.toTerritory || attack.territoryId || 'ce territoire';
        const attacker = game.players.find(p => p.id === attack.attackerId);
        const defender = game.players.find(p => p.id === attack.defenderId);

        if (attacker) {
            await this.sendMessage(
                attack.attackerId,
                `⏹️ Attaque annulée sur ${territoryLabel}.`
            );
        }

        if (defender) {
            const attackerName = attacker?.twitchUsername || "L'attaquant";
            await this.sendMessage(
                attack.defenderId,
                `😮‍💨 ${attackerName} a annulé son attaque sur ${territoryLabel}.`
            );
        }
    }

    async announceResults(game, attack) {
        const winner = attack.winner;
        const attacker = game.players.find(p => p.id === attack.attackerId);
        const defender = game.players.find(p => p.id === attack.defenderId);

        let resultMessage = '';
        if (winner === attack.attackerId) {
            resultMessage = `🎉 ${attacker?.twitchUsername} a conquis ${attack.toTerritoryName || attack.toTerritory} ! (${attack.attackPoints} vs ${attack.defensePoints})`;
        } else if (winner === attack.defenderId) {
            resultMessage = `🛡️ ${defender?.twitchUsername} a défendu ${attack.toTerritoryName || attack.toTerritory} avec succès ! (${attack.defensePoints} vs ${attack.attackPoints})`;
        } else {
            resultMessage = `⚖️ Égalité ! Le territoire ${attack.toTerritoryName || attack.toTerritory} reste à ${defender?.twitchUsername}. (${attack.attackPoints} vs ${attack.defensePoints})`;
        }

        if (attacker) {
            await this.sendMessage(attack.attackerId, resultMessage);
        }
        if (defender) {
            await this.sendMessage(attack.defenderId, resultMessage);
        }
    }

    async announceReinforcementStart(game, reinforcement) {
        if (!reinforcement) return;

        const initiator = game.players.find(p => p.id === reinforcement.initiatorId);
        const territoryLabel = reinforcement.territoryName || reinforcement.territoryId || 'ce territoire';

        if (initiator) {
            await this.sendMessage(
                initiator.id,
                `✨ Renfort lancé sur ${territoryLabel} ! Tapez !renfort ${territoryLabel} pour booster la défense.`
            );
        }
    }

    async announceReinforcementCancellation(game, reinforcement) {
        if (!reinforcement) return;

        const initiator = game.players.find(p => p.id === reinforcement.initiatorId);
        const territoryLabel = reinforcement.territoryName || reinforcement.territoryId || 'ce territoire';

        if (initiator) {
            await this.sendMessage(
                initiator.id,
                `⏹️ Renfort annulé sur ${territoryLabel}.`
            );
        }
    }

    async announceReinforcementFinish(game, reinforcement) {
        if (!reinforcement) return;

        const initiator = game.players.find(p => p.id === reinforcement.initiatorId);
        const territoryLabel = reinforcement.territoryName || reinforcement.territoryId || 'ce territoire';
        const bonus = Number(reinforcement.accumulatedBonus) || 0;

        if (initiator) {
            await this.sendMessage(
                initiator.id,
                `💪 Renfort sur ${territoryLabel} terminé ! Défense totale: ${bonus}.`
            );
        }
    }
}

export default new TwitchService();
