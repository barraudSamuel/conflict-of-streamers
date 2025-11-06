import { Attack } from '../models/Attack.js';
import GameManager from './GameManager.js';

class AttackManager {
    constructor() {
        this.attackTimers = new Map(); // attackId -> interval
    }

    canAttack(game, attackerId, fromTerritory, toTerritory) {
        if (!game) {
            return { valid: false, error: 'Game not in playing state' };
        }

        // Vérifier que le jeu est en cours
        if (game.status !== 'playing') {
            return { valid: false, error: 'Game not in playing state' };
        }

        // Vérifier que l'attaquant n'est pas déjà en train d'attaquer
        if (!game.canPlayerAttack(attackerId)) {
            return { valid: false, error: 'You are already attacking another territory' };
        }

        // Vérifier que le territoire cible n'est pas déjà attaqué
        if (game.isTerritoryUnderAttack(toTerritory)) {
            return { valid: false, error: 'This territory is already under attack' };
        }

        // Vérifier que l'attaquant possède le territoire source
        const fromTerr = game.territories.get(fromTerritory);
        if (!fromTerr || fromTerr.ownerId !== attackerId) {
            return { valid: false, error: 'You do not own the source territory' };
        }
        if (fromTerr.isUnderAttack) {
            return { valid: false, error: 'Source territory is currently under attack' };
        }
        if (fromTerr.isAttacking) {
            return { valid: false, error: 'Source territory is already attacking another territory' };
        }

        // Vérifier que le territoire cible existe et appartient à un autre joueur
        const toTerr = game.territories.get(toTerritory);
        if (!toTerr) {
            return { valid: false, error: 'Target territory does not exist' };
        }
        if (toTerr.ownerId === attackerId) {
            return { valid: false, error: 'Cannot attack your own territory' };
        }
        if (!toTerr.ownerId) {
            return { valid: false, error: 'Target territory has no owner' };
        }
        if (game.isTerritoryAttacking(toTerritory)) {
            return { valid: false, error: 'This territory is currently attacking another territory' };
        }

        // TODO: Vérifier que les territoires sont adjacents
        if (!game.areTerritoriesAdjacent(fromTerritory, toTerritory)) {
            return { valid: false, error: 'Territories are not adjacent. You can only attack neighboring territories.' };
        }

        return { valid: true };
    }

    startAttack(gameId, attackerId, fromTerritory, toTerritory, onUpdate, onFinish) {
        const game = GameManager.getGame(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        const validation = this.canAttack(game, attackerId, fromTerritory, toTerritory);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const toTerr = game.territories.get(toTerritory);
        const defenderId = toTerr.ownerId;
        const fromTerr = game.territories.get(fromTerritory);

        if (!fromTerr) {
            throw new Error('Source territory not found');
        }

        const neighbors = Array.isArray(toTerr.neighbors) ? toTerr.neighbors : [];
        const attackFrontiers = neighbors.filter((neighborId) => {
            const neighbor = game.territories.get(neighborId);
            return neighbor?.ownerId === attackerId;
        }).length;

        const defenseFrontiers = neighbors.filter((neighborId) => {
            const neighbor = game.territories.get(neighborId);
            return neighbor?.ownerId === defenderId;
        }).length;

        const attackOptions = {
            baseDefense: toTerr.defensePower ?? 0,
            attackAmplifier: game.settings?.messageAttackBonus ?? 1,
            defenseAmplifier: game.settings?.messageDefenseBonus ?? 1,
            attackFrontiers,
            defenseFrontiers,
            attackFrontierFactor: game.settings?.frontierAttackBonus ?? 1,
            defenseFrontierFactor: game.settings?.frontierDefenseBonus ?? 1
        };

        const attack = new Attack(
            attackerId,
            defenderId,
            { id: fromTerritory, name: fromTerr.name ?? fromTerritory },
            { id: toTerritory, name: toTerr.name ?? toTerritory },
            game.settings.attackDuration,
            attackOptions
        );

        // Ajouter l'attaque au jeu
        game.addAttack(toTerritory, attack);

        // Timer pour les updates en temps réel
        const interval = setInterval(() => {
            if (attack.isFinished()) {
                this.finishAttack(gameId, attack.id, toTerritory, onFinish);
            } else {
                onUpdate(attack.toJSON());
            }
        }, 1000);

        this.attackTimers.set(attack.id, interval);

        return attack;
    }

    addAttackCommand(gameId, territoryId, participant, isDefense = false) {
        const game = GameManager.getGame(gameId);
        if (!game) return false;

        const attack = game.activeAttacks.get(territoryId);
        if (!attack || attack.status !== 'ongoing') {
            return false;
        }

        const basePoints = game.settings.pointsPerCommand ?? 1;
        const multiplier = participant && typeof participant === 'object' && participant.isSubscriber ? 2 : 1;
        const points = basePoints * multiplier;

        if (isDefense) {
            attack.addDefensePoint(participant, points);
        } else {
            attack.addAttackPoint(participant, points);
        }

        return true;
    }

    finishAttack(gameId, attackId, territoryId, callback) {
        const game = GameManager.getGame(gameId);
        if (!game) return;

        const attack = game.activeAttacks.get(territoryId);
        if (!attack) return;

        // Arrêter le timer
        const interval = this.attackTimers.get(attackId);
        if (interval) {
            clearInterval(interval);
            this.attackTimers.delete(attackId);
        }

        // Déterminer le gagnant
        const winner = attack.finish();

        const territory = game.territories.get(attack.toTerritory);

        // Transférer le territoire si l'attaquant gagne
        if (winner === attack.attackerId) {
            if (territory) {
                territory.ownerId = attack.attackerId;

                // Ajouter des points au gagnant
                const winnerPlayer = game.players.find(p => p.id === winner);
                if (winnerPlayer) {
                    winnerPlayer.addScore(100);
                }
            }
        } else if (winner === attack.defenderId) {
            // Points pour le défenseur qui a réussi à défendre
            const defenderPlayer = game.players.find(p => p.id === winner);
            if (defenderPlayer) {
                defenderPlayer.addScore(50);
            }
        }

        if (territory) {
            territory.isUnderAttack = false;
        }

        const attackData = attack.toJSON();
        game.removeAttack(territoryId);

        // Vérifier si le jeu est terminé (un joueur possède tout)
        const owners = new Set();
        for (let territory of game.territories.values()) {
            if (territory.ownerId) {
                owners.add(territory.ownerId);
            }
        }

        if (owners.size === 1) {
            game.endGame();
        }

        if (callback) {
            callback(attackData, game.toJSON());
        }

        return attack;
    }

    cancelAttack(gameId, territoryId, options = {}) {
        const game = GameManager.getGame(gameId);
        if (!game) return null;

        const attack = game.activeAttacks.get(territoryId);
        if (!attack) return null;

        const interval = this.attackTimers.get(attack.id);
        if (interval) {
            clearInterval(interval);
            this.attackTimers.delete(attack.id);
        }

        const { cancelledBy = null, reason = 'manual' } = options || {};
        attack.cancel(cancelledBy, reason);

        const attackData = attack.toJSON();
        game.removeAttack(territoryId);

        return attackData;
    }

    getAttack(gameId, territoryId) {
        const game = GameManager.getGame(gameId);
        if (!game) return null;
        return game.activeAttacks.get(territoryId);
    }

    getAllAttacks(gameId) {
        const game = GameManager.getGame(gameId);
        if (!game) return [];
        return game.getActiveAttacks();
    }
}

export default new AttackManager();
