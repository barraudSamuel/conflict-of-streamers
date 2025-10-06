import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MapService {
    constructor() {
        this.territories = new Map();
        this.loadTerritories();
    }

    loadTerritories() {
        try {
            const dataPath = join(__dirname, '../data/territories.json');
            const data = JSON.parse(readFileSync(dataPath, 'utf8'));

            for (let territory of data.territories) {
                this.territories.set(territory.id, territory);
            }

            console.log(`✅ Loaded ${this.territories.size} territories`);
        } catch (error) {
            console.error('❌ Failed to load territories:', error);
            // Données par défaut minimales si le fichier n'existe pas
            this.loadDefaultTerritories();
        }
    }

    loadDefaultTerritories() {
        const defaults = [
            { id: 'FR', name: 'France', code: 'FR', neighbors: ['ES', 'IT', 'DE', 'BE', 'GB'] },
            { id: 'DE', name: 'Germany', code: 'DE', neighbors: ['FR', 'PL', 'CZ', 'AT', 'CH', 'NL', 'BE'] },
            { id: 'ES', name: 'Spain', code: 'ES', neighbors: ['FR', 'PT'] },
            { id: 'IT', name: 'Italy', code: 'IT', neighbors: ['FR', 'CH', 'AT', 'SI'] },
            { id: 'GB', name: 'United Kingdom', code: 'GB', neighbors: ['FR', 'IE'] },
            { id: 'US', name: 'United States', code: 'US', neighbors: ['CA', 'MX'] }
        ];

        for (let territory of defaults) {
            this.territories.set(territory.id, territory);
        }
    }

    getTerritory(id) {
        return this.territories.get(id);
    }

    getAllTerritories() {
        return Array.from(this.territories.values());
    }

    areNeighbors(territory1, territory2) {
        const terr1 = this.territories.get(territory1);
        if (!terr1) return false;

        return terr1.neighbors.includes(territory2);
    }

    getNeighbors(territoryId) {
        const territory = this.territories.get(territoryId);
        if (!territory) return [];

        return territory.neighbors.map(id => this.territories.get(id)).filter(Boolean);
    }

    validateTerritory(territoryId) {
        return this.territories.has(territoryId);
    }

    getRandomAvailableTerritories(count, excludeIds = []) {
        const available = Array.from(this.territories.keys())
            .filter(id => !excludeIds.includes(id));

        const shuffled = available.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    getTerritoryStats(game) {
        const stats = {
            total: this.territories.size,
            occupied: 0,
            byPlayer: new Map()
        };

        for (let [id, territory] of game.territories) {
            if (territory.ownerId) {
                stats.occupied++;
                const count = stats.byPlayer.get(territory.ownerId) || 0;
                stats.byPlayer.set(territory.ownerId, count + 1);
            }
        }

        return stats;
    }

    findPath(fromTerritory, toTerritory, maxDepth = 5) {
        // BFS pour trouver un chemin entre deux territoires
        const queue = [[fromTerritory]];
        const visited = new Set([fromTerritory]);

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current === toTerritory) {
                return path;
            }

            if (path.length >= maxDepth) {
                continue;
            }

            const territory = this.territories.get(current);
            if (!territory) continue;

            for (let neighbor of territory.neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }

        return null; // Pas de chemin trouvé
    }

    calculateDistance(territory1, territory2) {
        // Distance basée sur le plus court chemin
        const path = this.findPath(territory1, territory2);
        return path ? path.length - 1 : Infinity;
    }
}

export default new MapService();
