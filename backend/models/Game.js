import { v4 as uuidv4 } from 'uuid';
import MapService from '../services/MapService.js';

const DEFAULT_SETTINGS = {
    attackDuration: 120,
    defenseDuration: 120,
    reinforcementDuration: 60,
    botBaseDefense: 200,
    botFrontierMultiplier: 0.2,
    messageAttackBonus: 50,
    messageDefenseBonus: 40,
    messageReinforcementBonus: 100,
    frontierAttackBonus: 20,
    frontierDefenseBonus: 10,
    conquestCooldown: 5,
    defenseCooldown: 5,
    pointsPerCommand: 1,
    maxPlayers: 8
};

const NUMERIC_CONSTRAINTS = {
    attackDuration: { min: 10, max: 3600 },
    defenseDuration: { min: 10, max: 3600 },
    reinforcementDuration: { min: 10, max: 3600 },
    botBaseDefense: { min: 0, max: 100000 },
    botFrontierMultiplier: { min: 0, max: 10 },
    messageAttackBonus: { min: 0, max: 100000 },
    messageDefenseBonus: { min: 0, max: 100000 },
    messageReinforcementBonus: { min: 0, max: 100000 },
    frontierAttackBonus: { min: 0, max: 100000 },
    frontierDefenseBonus: { min: 0, max: 100000 },
    conquestCooldown: { min: 0, max: 1440 },
    defenseCooldown: { min: 0, max: 1440 },
    pointsPerCommand: { min: 0, max: 100000 },
    maxPlayers: { min: 2, max: 20 }
};

function sanitizeSettings(input = {}, base = DEFAULT_SETTINGS) {
    const settings = { ...base };

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (!(key in input)) {
            continue;
        }

        const raw = input[key];
        if (raw === '' || raw === null || raw === undefined) {
            continue;
        }

        const numericValue = Number(raw);
        if (!Number.isFinite(numericValue)) {
            continue;
        }

        const { min, max } = NUMERIC_CONSTRAINTS[key] || {};
        let sanitized = numericValue;

        if (typeof min === 'number' && sanitized < min) {
            sanitized = min;
        }

        if (typeof max === 'number' && sanitized > max) {
            sanitized = max;
        }

        if (key === 'maxPlayers') {
            sanitized = Math.round(sanitized);
        }

        settings[key] = sanitized;
    }

    return settings;
}

export class Game {
    constructor(adminId, adminTwitchUsername, settings = {}) {
        this.id = uuidv4();
        this.code = this.generateCode();
        this.adminId = adminId;
        this.adminTwitchUsername = adminTwitchUsername;
        this.status = 'lobby'; // lobby | playing | finished
        this.settings = sanitizeSettings(settings, DEFAULT_SETTINGS);
        this.players = [];
        this.territories = new Map();
        this.activeAttacks = new Map(); // territoryId -> Attack (plusieurs attaques simultanées)
        this.createdAt = Date.now();
        this.startedAt = null;
        this.finishedAt = null;
        this.commandCounts = new Map(); // Pour tracker les commandes par user

        // Initialiser tous les territoires depuis MapService
        this.initializeTerritories();
    }

    getBotOwnerId(territoryId) {
        return `bot:${territoryId}`;
    }

    isBotTerritory(territory) {
        return typeof territory.ownerId === 'string' && territory.ownerId.startsWith('bot:');
    }

    assignBotDefenses() {
        const baseDefense = typeof this.settings.botBaseDefense === 'number'
            ? this.settings.botBaseDefense
            : DEFAULT_SETTINGS.botBaseDefense;
        const frontierMultiplier = typeof this.settings.botFrontierMultiplier === 'number'
            ? this.settings.botFrontierMultiplier
            : DEFAULT_SETTINGS.botFrontierMultiplier;

        for (let territory of this.territories.values()) {
            if (!territory.ownerId) {
                const borders = Array.isArray(territory.neighbors) ? territory.neighbors : [];
                const defenseValue = Math.round(baseDefense * (1 + frontierMultiplier * borders.length));

                territory.ownerId = this.getBotOwnerId(territory.id);
                territory.attackPower = 0;
                territory.defensePower = defenseValue;
                territory.isBotControlled = true;
            } else if (this.isBotTerritory(territory)) {
                // Ensure pre-existing bot-controlled territories get refreshed values
                const borders = Array.isArray(territory.neighbors) ? territory.neighbors : [];
                territory.defensePower = Math.round(baseDefense * (1 + frontierMultiplier * borders.length));
                territory.isBotControlled = true;
            } else {
                territory.isBotControlled = false;
            }
        }
    }

    generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    addPlayer(player) {
        if (this.status !== 'lobby') {
            throw new Error('Cannot add player: game already started');
        }
        if (this.players.length >= this.settings.maxPlayers) {
            throw new Error('Game is full');
        }
        if (this.players.find(p => p.id === player.id)) {
            throw new Error('Player already in game');
        }
        this.players.push(player);
    }

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            // Libérer le territoire si assigné
            for (let [territoryId, territory] of this.territories) {
                if (territory.ownerId === playerId) {
                    territory.ownerId = null;
                }
            }
        }
    }

    assignTerritory(playerId, territoryId) {
        if (this.status !== 'lobby') {
            throw new Error('Cannot assign territory: game already started');
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        // Vérifier si le territoire est déjà pris
        for (let [id, territory] of this.territories) {
            if (territory.ownerId === playerId) {
                territory.ownerId = null; // Libérer l'ancien territoire
            }
            if (id === territoryId && territory.ownerId) {
                throw new Error('Territory already taken');
            }
        }

        // Vérifier que le territoire existe (déjà chargé depuis MapService)
        const territory = this.territories.get(territoryId);
        if (!territory) {
            throw new Error('Territory does not exist');
        }
        if (territory.ownerId) {
            throw new Error('Territory already taken');
        }

        // Assigner le territoire
        territory.ownerId = playerId;
    }

    canStartGame() {
        if (this.players.length < 2) return false;

        // Vérifier que tous les joueurs ont un territoire
        for (let player of this.players) {
            const hasTerritory = Array.from(this.territories.values())
                .some(t => t.ownerId === player.id);
            if (!hasTerritory) return false;
        }

        return true;
    }

    startGame() {
        if (!this.canStartGame()) {
            throw new Error('Cannot start game: requirements not met');
        }
        this.status = 'playing';
        this.startedAt = Date.now();
        this.assignBotDefenses();
    }

    endGame() {
        this.status = 'finished';
        this.finishedAt = Date.now();
        this.activeAttacks.clear();
    }

    updateSettings(settings = {}) {
        this.settings = sanitizeSettings(settings, this.settings);
    }

    // Vérifier si un joueur peut attaquer (pas déjà en attaque)
    canPlayerAttack(playerId) {
        for (let attack of this.activeAttacks.values()) {
            if (attack.attackerId === playerId) {
                return false; // Ce joueur attaque déjà
            }
        }
        return true;
    }

    // Vérifier si un territoire est attaqué
    isTerritoryUnderAttack(territoryId) {
        return this.activeAttacks.has(territoryId);
    }

    // Ajouter une attaque
    addAttack(territoryId, attack) {
        this.activeAttacks.set(territoryId, attack);
    }

    // Retirer une attaque
    removeAttack(territoryId) {
        this.activeAttacks.delete(territoryId);
    }

    // Obtenir toutes les attaques actives
    getActiveAttacks() {
        return Array.from(this.activeAttacks.values());
    }

    initializeTerritories() {
        // Charger tous les territoires depuis MapService avec leurs neighbors
        const allTerritories = MapService.getAllTerritories();

        for (let territory of allTerritories) {
            this.territories.set(territory.id, {
                id: territory.id,
                name: territory.name,
                code: territory.code,
                neighbors: territory.neighbors || [],  // ✅ Copier les voisins
                ownerId: null,
                attackPower: 0,
                defensePower: 0,
                isUnderAttack: false,
                conqueredAt: null,
                history: []
            });
        }
    }

    getAvailableTerritories() {
        const available = [];
        for (let [id, territory] of this.territories) {
            if (!territory.ownerId) {
                available.push(territory);
            }
        }
        return available;
    }

    getPlayerTerritories(playerId) {
        const playerTerritories = [];
        for (let [id, territory] of this.territories) {
            if (territory.ownerId === playerId) {
                playerTerritories.push(territory);
            }
        }
        return playerTerritories;
    }

    areTerritoriesAdjacent(territoryId1, territoryId2) {
        const territory = this.territories.get(territoryId1);
        if (!territory) return false;
        return territory.neighbors && territory.neighbors.includes(territoryId2);
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            adminId: this.adminId,
            adminTwitchUsername: this.adminTwitchUsername,
            status: this.status,
            settings: this.settings,
            players: this.players,
            territories: Array.from(this.territories.entries()).map(([id, data]) => ({
                id,
                ...data
            })),
            activeAttacks: Array.from(this.activeAttacks.entries()).map(([territoryId, attack]) => ({
                territoryId,
                ...attack
            })),
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt
        };
    }
}
