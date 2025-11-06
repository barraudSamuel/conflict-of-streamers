import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LANDLOCKED_TERRITORIES = new Set([
    'AD', // Andorra
    'AF', // Afghanistan
    'AM', // Armenia
    'AT', // Austria
    'AZ', // Azerbaijan
    'BF', // Burkina Faso
    'BI', // Burundi
    'BO', // Bolivia
    'BT', // Bhutan
    'BW', // Botswana
    'BY', // Belarus
    'CF', // Central African Rep.
    'CH', // Switzerland
    'CZ', // Czech Rep.
    'ET', // Ethiopia
    'HU', // Hungary
    'KG', // Kyrgyzstan
    'KZ', // Kazakhstan
    'LA', // Laos
    'LI', // Liechtenstein
    'LS', // Lesotho
    'LU', // Luxembourg
    'MD', // Moldova
    'ML', // Mali
    'MN', // Mongolia
    'MW', // Malawi
    'NE', // Niger
    'NP', // Nepal
    'MK', // North Macedonia
    'PY', // Paraguay
    'RS', // Serbia
    'RW', // Rwanda
    'SK', // Slovakia
    'SM', // San Marino
    'SS', // South Sudan
    'SZ', // Eswatini
    'TD', // Chad
    'TJ', // Tajikistan
    'TM', // Turkmenistan
    'UG', // Uganda
    'UZ', // Uzbekistan
    'VA', // Vatican City
    'XK', // Kosovo
    'ZM', // Zambia
    'ZW' // Zimbabwe
]);

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

    isIsland(territoryId) {
        const territory = this.territories.get(territoryId);
        if (!territory) return false;

        const neighbors = Array.isArray(territory.neighbors) ? territory.neighbors : [];
        if (neighbors.length === 0) {
            return true;
        }

        if (neighbors.length === 1) {
            const neighbor = this.territories.get(neighbors[0]);
            if (!neighbor) {
                return true;
            }

            const reciprocalNeighbors = Array.isArray(neighbor.neighbors) ? neighbor.neighbors : [];
            return reciprocalNeighbors.length === 1 && reciprocalNeighbors[0] === territoryId;
        }

        return false;
    }

    hasSeaAccess(territoryId) {
        if (this.isIsland(territoryId)) {
            return true;
        }

        return !LANDLOCKED_TERRITORIES.has(territoryId);
    }

    canAttackBySea(fromTerritory, toTerritory) {
        if (fromTerritory === toTerritory) {
            return false;
        }

        return this.hasSeaAccess(fromTerritory) && this.isIsland(toTerritory);
    }

    getExtendedNeighborIds(territoryId) {
        const territory = this.territories.get(territoryId);
        if (!territory) return [];

        const neighborSet = new Set(Array.isArray(territory.neighbors) ? territory.neighbors : []);

        if (this.hasSeaAccess(territoryId)) {
            for (let [candidateId] of this.territories) {
                if (neighborSet.has(candidateId) || candidateId === territoryId) {
                    continue;
                }

                if (this.canAttackBySea(territoryId, candidateId)) {
                    neighborSet.add(candidateId);
                }
            }
        }

        return Array.from(neighborSet);
    }

    areNeighbors(territory1, territory2) {
        if (!this.territories.has(territory1) || !this.territories.has(territory2)) {
            return false;
        }

        if (this.territories.get(territory1)?.neighbors?.includes(territory2)) {
            return true;
        }

        return (
            this.canAttackBySea(territory1, territory2) ||
            this.canAttackBySea(territory2, territory1)
        );
    }

    getNeighbors(territoryId) {
        const neighborIds = this.getExtendedNeighborIds(territoryId);

        return neighborIds
            .map(id => this.territories.get(id))
            .filter(Boolean);
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

            for (let neighbor of this.getExtendedNeighborIds(current)) {
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
