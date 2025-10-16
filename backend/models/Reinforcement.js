import { v4 as uuidv4 } from 'uuid';

const normalizeTerritory = (input) => {
    if (!input || typeof input !== 'object') {
        return { id: '', name: '' };
    }

    const { id, name, code } = input;
    const territoryId = typeof id === 'string' && id ? id : typeof code === 'string' ? code : '';
    const territoryName = typeof name === 'string' && name
        ? name
        : typeof code === 'string' && code
            ? code
            : territoryId;

    return {
        id: territoryId,
        name: territoryName
    };
};

const positiveNumber = (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return fallback;
    }
    return numeric;
};

const nonNegativeNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return fallback;
    }
    return numeric;
};

export class Reinforcement {
    constructor(initiatorId, territory, durationSeconds, options = {}) {
        this.id = uuidv4();
        this.initiatorId = initiatorId;

        const meta = normalizeTerritory(territory);
        this.territoryId = meta.id;
        this.territoryName = meta.name;

        this.status = 'ongoing'; // ongoing | finished | cancelled
        this.startTime = Date.now();
        this.endTime = this.startTime + positiveNumber(durationSeconds, 60) * 1000;

        this.baseDefense = nonNegativeNumber(options.baseDefense, 0);
        this.accumulatedBonus = nonNegativeNumber(options.initialBonus, 0);
        this.reinforcementAmplifier = positiveNumber(options.reinforcementAmplifier, 1);

        this.messageCount = 0;
        this.participants = new Set();

        this.cancelledBy = null;
        this.cancelledAt = null;
        this.cancelReason = null;
    }

    getRemainingTime() {
        const now = Date.now();
        return Math.max(0, Math.ceil((this.endTime - now) / 1000));
    }

    isFinished() {
        return this.status !== 'ongoing' || Date.now() >= this.endTime;
    }

    addContribution(username, points = 1) {
        if (this.status !== 'ongoing') {
            return this.accumulatedBonus;
        }

        const increment = positiveNumber(points, 1);
        this.messageCount += increment;
        if (username) {
            this.participants.add(username);
        }

        const uniqueParticipants = Math.max(1, this.participants.size);
        const intensity = this.messageCount / uniqueParticipants;
        const computed = intensity * this.reinforcementAmplifier;

        this.accumulatedBonus = Math.round(this.baseDefense + computed);
        return this.accumulatedBonus;
    }

    cancel(cancelledBy = null, reason = 'manual') {
        if (this.status !== 'ongoing') {
            return this.status;
        }

        this.status = 'cancelled';
        this.cancelledBy = cancelledBy ?? null;
        this.cancelledAt = Date.now();
        this.cancelReason = reason ?? null;
        this.endTime = this.cancelledAt;

        return this.status;
    }

    finish() {
        if (this.status === 'finished') {
            return this.accumulatedBonus;
        }

        if (this.status === 'cancelled') {
            return this.accumulatedBonus;
        }

        this.status = 'finished';
        return this.accumulatedBonus;
    }

    toJSON() {
        return {
            id: this.id,
            initiatorId: this.initiatorId,
            territoryId: this.territoryId,
            territoryName: this.territoryName,
            status: this.status,
            startTime: this.startTime,
            endTime: this.endTime,
            remainingTime: this.getRemainingTime(),
            baseDefense: this.baseDefense,
            accumulatedBonus: this.accumulatedBonus,
            reinforcementAmplifier: this.reinforcementAmplifier,
            messageCount: this.messageCount,
            participantCount: this.participants.size,
            cancelledBy: this.cancelledBy,
            cancelledAt: this.cancelledAt,
            cancelReason: this.cancelReason
        };
    }
}

export default Reinforcement;
