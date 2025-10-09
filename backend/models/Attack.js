import { v4 as uuidv4 } from 'uuid';

const toTerritoryMeta = (input) => {
    if (input && typeof input === 'object') {
        return {
            id: input.id ?? input.code ?? input.name ?? '',
            name: input.name ?? input.code ?? input.id ?? ''
        };
    }

    if (typeof input === 'string') {
        return { id: input, name: input };
    }

    return { id: '', name: '' };
};

const positiveOr = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const nonNegativeOr = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

export class Attack {
    constructor(attackerId, defenderId, fromTerritory, toTerritory, duration, options = {}) {
        this.id = uuidv4();
        this.attackerId = attackerId;
        this.defenderId = defenderId;

        const fromMeta = toTerritoryMeta(fromTerritory);
        const toMeta = toTerritoryMeta(toTerritory);

        this.fromTerritory = fromMeta.id;
        this.fromTerritoryName = fromMeta.name || fromMeta.id;
        this.toTerritory = toMeta.id;
        this.toTerritoryName = toMeta.name || toMeta.id;

        this.attackMessages = 0;
        this.attackPoints = 0;
        this.attackAmplifier = positiveOr(options.attackAmplifier, 1);
        this.attackFrontiers = nonNegativeOr(options.attackFrontiers, 0);
        this.attackFrontierFactor = positiveOr(options.attackFrontierFactor, 1);

        this.defenseMessages = 0;
        this.baseDefense = nonNegativeOr(options.baseDefense, 0);
        this.defensePoints = this.baseDefense;
        this.defenseAmplifier = positiveOr(options.defenseAmplifier, 1);
        this.defenseFrontiers = nonNegativeOr(options.defenseFrontiers, 0);
        this.defenseFrontierFactor = positiveOr(options.defenseFrontierFactor, 1);

        this.status = 'ongoing'; // ongoing | finished
        this.startTime = Date.now();
        this.endTime = this.startTime + (duration * 1000);
        this.winner = null;
        this.participantAttackers = new Set();
        this.participantDefenders = new Set();
    }

    getUniqueAttackers() {
        return this.participantAttackers.size;
    }

    getUniqueDefenders() {
        return this.participantDefenders.size;
    }

    recalculateAttackPower() {
        if (this.attackMessages <= 0) {
            this.attackPoints = 0;
            return this.attackPoints;
        }

        const uniqueAttackers = Math.max(1, this.getUniqueAttackers());
        const intensity = this.attackMessages / uniqueAttackers;
        const frontierBonus = 1 + (this.attackFrontiers / this.attackFrontierFactor);
        const computed = intensity * this.attackAmplifier * frontierBonus;

        this.attackPoints = Math.round(computed);
        return this.attackPoints;
    }

    recalculateDefensePower() {
        const uniqueDefenders = Math.max(1, this.getUniqueDefenders());
        const frontierBonus = 1 + (this.defenseFrontiers / this.defenseFrontierFactor);
        const chatContribution = this.defenseMessages > 0
            ? (this.defenseMessages / uniqueDefenders) * this.defenseAmplifier * frontierBonus
            : 0;

        const computed = this.baseDefense + chatContribution;
        this.defensePoints = Math.round(computed);
        return this.defensePoints;
    }

    addAttackPoint(userId, points = 1) {
        if (this.status !== 'ongoing') return;

        const increment = positiveOr(points, 1);
        this.attackMessages += increment;
        this.participantAttackers.add(userId);
        this.recalculateAttackPower();
    }

    addDefensePoint(userId, points = 1) {
        if (this.status !== 'ongoing') return;

        const increment = positiveOr(points, 1);
        this.defenseMessages += increment;
        this.participantDefenders.add(userId);
        this.recalculateDefensePower();
    }

    getRemainingTime() {
        const now = Date.now();
        const remaining = Math.max(0, this.endTime - now);
        return Math.ceil(remaining / 1000);
    }

    isFinished() {
        return Date.now() >= this.endTime || this.status === 'finished';
    }

    finish() {
        this.recalculateAttackPower();
        this.recalculateDefensePower();

        this.status = 'finished';

        if (this.attackPoints > this.defensePoints) {
            this.winner = this.attackerId;
        } else if (this.defensePoints > this.attackPoints) {
            this.winner = this.defenderId;
        } else {
            this.winner = null; // Égalité
        }

        return this.winner;
    }

    toJSON() {
        return {
            id: this.id,
            attackerId: this.attackerId,
            defenderId: this.defenderId,
            fromTerritory: this.fromTerritory,
            fromTerritoryName: this.fromTerritoryName,
            toTerritory: this.toTerritory,
            toTerritoryName: this.toTerritoryName,
            attackPoints: this.attackPoints,
            attackMessages: this.attackMessages,
            attackAmplifier: this.attackAmplifier,
            attackFrontiers: this.attackFrontiers,
            attackFrontierFactor: this.attackFrontierFactor,
            defensePoints: this.defensePoints,
            defenseMessages: this.defenseMessages,
            baseDefense: this.baseDefense,
            defenseAmplifier: this.defenseAmplifier,
            defenseFrontiers: this.defenseFrontiers,
            defenseFrontierFactor: this.defenseFrontierFactor,
            status: this.status,
            startTime: this.startTime,
            endTime: this.endTime,
            remainingTime: this.getRemainingTime(),
            winner: this.winner,
            participantCount: {
                attackers: this.participantAttackers.size,
                defenders: this.participantDefenders.size
            }
        };
    }
}
