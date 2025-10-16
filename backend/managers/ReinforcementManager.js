import { Reinforcement } from '../models/Reinforcement.js';
import GameManager from './GameManager.js';

class ReinforcementManager {
    constructor() {
        this.reinforcementTimers = new Map(); // reinforcementId -> interval
    }

    canReinforce(game, playerId, territoryId) {
        if (!game) {
            return { valid: false, error: 'Game not found' };
        }

        if (game.status !== 'playing') {
            return { valid: false, error: 'Game is not in playing state' };
        }

        if (!playerId || !territoryId) {
            return { valid: false, error: 'Player and territory are required' };
        }

        const territory = game.territories.get(territoryId);
        if (!territory) {
            return { valid: false, error: 'Territory not found' };
        }

        if (territory.ownerId !== playerId) {
            return { valid: false, error: 'You must own the territory to reinforce it' };
        }

        if (game.isTerritoryUnderAttack(territoryId)) {
            return { valid: false, error: 'Cannot reinforce while the territory is under attack' };
        }

        if (game.isTerritoryUnderReinforcement(territoryId)) {
            return { valid: false, error: 'This territory is already reinforced' };
        }

        return { valid: true, territory };
    }

    startReinforcement(gameId, playerId, territoryId, callbacks = {}) {
        const game = GameManager.getGame(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        const validation = this.canReinforce(game, playerId, territoryId);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const territory = validation.territory;
        const options = {
            baseDefense: territory.defensePower ?? 0,
            initialBonus: territory.reinforcementBonus ?? 0,
            reinforcementAmplifier: game.settings?.messageReinforcementBonus ?? 1
        };

        const reinforcement = new Reinforcement(
            playerId,
            territory,
            game.settings?.reinforcementDuration ?? 60,
            options
        );

        game.addReinforcement(territoryId, reinforcement);
        territory.isReinforced = true;
        territory.reinforcementBonus = reinforcement.accumulatedBonus;

        if (typeof callbacks.onStart === 'function') {
            callbacks.onStart(reinforcement.toJSON());
        }

        const interval = setInterval(() => {
            if (reinforcement.isFinished()) {
                this.finishReinforcement(gameId, territoryId, callbacks);
            } else if (typeof callbacks.onTick === 'function') {
                callbacks.onTick(reinforcement.toJSON());
            }
        }, 1000);

        this.reinforcementTimers.set(reinforcement.id, interval);

        return reinforcement;
    }

    addContribution(gameId, territoryId, username, points = 1) {
        const game = GameManager.getGame(gameId);
        if (!game) {
            return null;
        }

        const reinforcement = game.activeReinforcements.get(territoryId);
        if (!reinforcement || reinforcement.status !== 'ongoing') {
            return null;
        }

        const bonus = reinforcement.addContribution(username, points);

        const territory = game.territories.get(territoryId);
        if (territory) {
            territory.reinforcementBonus = bonus;
            territory.defensePower = bonus;
            territory.isReinforced = true;
        }

        return reinforcement.toJSON();
    }

    finishReinforcement(gameId, territoryId, callbacks = {}) {
        const game = GameManager.getGame(gameId);
        if (!game) {
            return null;
        }

        const reinforcement = game.activeReinforcements.get(territoryId);
        if (!reinforcement) {
            return null;
        }

        const timer = this.reinforcementTimers.get(reinforcement.id);
        if (timer) {
            clearInterval(timer);
            this.reinforcementTimers.delete(reinforcement.id);
        }

        reinforcement.finish();

        const territory = game.territories.get(territoryId);
        if (territory) {
            territory.reinforcementBonus = reinforcement.accumulatedBonus;
            territory.defensePower = reinforcement.accumulatedBonus;
            territory.isReinforced = true;
        }

        game.removeReinforcement(territoryId);

        if (typeof callbacks.onFinish === 'function') {
            callbacks.onFinish(reinforcement.toJSON(), game.toJSON());
        }

        return reinforcement;
    }

    cancelReinforcement(gameId, territoryId, options = {}, callbacks = {}) {
        const game = GameManager.getGame(gameId);
        if (!game) {
            return null;
        }

        const reinforcement = game.activeReinforcements.get(territoryId);
        if (!reinforcement) {
            return null;
        }

        const timer = this.reinforcementTimers.get(reinforcement.id);
        if (timer) {
            clearInterval(timer);
            this.reinforcementTimers.delete(reinforcement.id);
        }

        const { cancelledBy = null, reason = 'manual' } = options;
        reinforcement.cancel(cancelledBy, reason);

        const territory = game.territories.get(territoryId);
        if (territory) {
            territory.isReinforced = false;
            territory.reinforcementBonus = reinforcement.baseDefense;
            territory.defensePower = reinforcement.baseDefense;
        }
        game.removeReinforcement(territoryId);

        if (typeof callbacks.onCancel === 'function') {
            callbacks.onCancel(reinforcement.toJSON(), game.toJSON());
        }

        return reinforcement.toJSON();
    }

    getReinforcement(gameId, territoryId) {
        const game = GameManager.getGame(gameId);
        if (!game) {
            return null;
        }

        const reinforcement = game.activeReinforcements.get(territoryId);
        return reinforcement ? reinforcement.toJSON() : null;
    }
}

export default new ReinforcementManager();
