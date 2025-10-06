import { v4 as uuidv4 } from 'uuid';
import MapService from '../services/MapService.js';

export class Game {
    constructor(adminId, settings = {}) {
        this.id = uuidv4();
        this.code = this.generateCode();
        this.adminId = adminId;
        this.status = 'lobby'; // lobby | playing | finished
        this.settings = {
            attackDuration: settings.attackDuration || 30,
            pointsPerCommand: settings.pointsPerCommand || 1,
            maxPlayers: settings.maxPlayers || 8,
            allowDuplicateUsers: settings.allowDuplicateUsers || false
        };
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
    }

    endGame() {
        this.status = 'finished';
        this.finishedAt = Date.now();
        this.activeAttacks.clear();
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
