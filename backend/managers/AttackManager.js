import { Attack } from '../models/Attack.js';
import GameManager from './GameManager.js';

class AttackManager {
    constructor() {
        this.attackTimers = new Map(); // attackId -> interval
    }

    canAttack(game, attackerId, fromTerritory, toTerritory) {
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

        // TODO: Vérifier que les territoires sont adjacents
        // if (!this.areAdjacent(fromTerritory, toTerritory)) {
        //   return { valid: false, error: 'Territories are not adjacent' };
        // }

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

        const attack = new Attack(
            attackerId,
            defenderId,
            fromTerritory,
            toTerritory,
            game.settings.attackDuration
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

    addAttackCommand(gameId, territoryId, userId, isDefense = false) {
        const game = GameManager.getGame(gameId);
        if (!game) return false;

        const attack = game.activeAttacks.get(territoryId);
        if (!attack || attack.status !== 'ongoing') {
            return false;
        }

        const points = game.settings.pointsPerCommand;

        if (isDefense) {
            attack.addDefensePoint(userId, points);
        } else {
            attack.addAttackPoint(userId, points);
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

        // Transférer le territoire si l'attaquant gagne
        if (winner === attack.attackerId) {
            const territory = game.territories.get(attack.toTerritory);
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

        game.removeAttack(territoryId);

        if (callback) {
            callback(attack.toJSON(), game.toJSON());
        }

        return attack;
    }

    cancelAttack(gameId, territoryId) {
        const game = GameManager.getGame(gameId);
        if (!game) return;

        const attack = game.activeAttacks.get(territoryId);
        if (!attack) return;

        const interval = this.attackTimers.get(attack.id);
        if (interval) {
            clearInterval(interval);
            this.attackTimers.delete(attack.id);
        }

        game.removeAttack(territoryId);
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
