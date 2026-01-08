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

        this.status = 'ongoing'; // ongoing | finished | cancelled
        this.startTime = Date.now();
        this.endTime = this.startTime + (duration * 1000);
        this.winner = null;
        this.participantAttackers = new Set();
        this.participantDefenders = new Set();
        this.cancelledBy = null;
        this.cancelledAt = null;
        this.cancelReason = null;
        this.attackContributions = new Map(); // key -> { id, username, displayName, avatarUrl, messages, lastSeen }
        this.defenseContributions = new Map();
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

    static buildTwitchAvatarUrl(userId, size = 60) {
        if (typeof userId !== 'string') {
            return null;
        }
        const trimmed = userId.trim();
        if (!trimmed) {
            return null;
        }
        const numericSize = Number(size);
        const safeSize = Number.isFinite(numericSize) && numericSize > 0 ? Math.min(300, Math.max(28, Math.round(numericSize))) : 60;
        return `https://avatars.twitchcdn.net/v1/u/${trimmed}?width=${safeSize}&height=${safeSize}&format=png`;
    }

    normalizeParticipant(participant) {
        if (!participant) {
            return null;
        }

        if (typeof participant === 'string') {
            const username = participant.trim();
            if (!username) {
                return null;
            }
            const key = username.toLowerCase();
            return {
                key,
                id: null,
                username,
                displayName: username,
                avatarUrl: null
            };
        }

        if (typeof participant === 'object') {
            const rawId = typeof participant.id === 'string' ? participant.id.trim() : typeof participant.userId === 'string' ? participant.userId.trim() : '';
            const id = rawId || null;
            const usernameCandidate =
                typeof participant.username === 'string' && participant.username.trim() !== ''
                    ? participant.username.trim()
                    : typeof participant.login === 'string' && participant.login.trim() !== ''
                        ? participant.login.trim()
                        : null;
            const displayNameCandidate =
                typeof participant.displayName === 'string' && participant.displayName.trim() !== ''
                    ? participant.displayName.trim()
                    : usernameCandidate;
            const username = usernameCandidate ?? (id ? `viewer-${id}` : 'viewer');
            const displayName = displayNameCandidate ?? username;
            const key = id ?? username.toLowerCase();

            let avatarUrl = null;
            if (typeof participant.avatarUrl === 'string' && participant.avatarUrl.trim() !== '') {
                avatarUrl = participant.avatarUrl.trim();
            } else if (id) {
                avatarUrl = Attack.buildTwitchAvatarUrl(id);
            }

            return {
                key,
                id,
                username,
                displayName,
                avatarUrl
            };
        }

        return null;
    }

    recordContribution(container, participant, increment) {
        if (!participant?.key) {
            return;
        }
        const now = Date.now();
        const existing = container.get(participant.key) ?? {
            id: participant.id,
            username: participant.username,
            displayName: participant.displayName,
            avatarUrl: participant.avatarUrl,
            messages: 0,
            lastSeen: now
        };

        existing.messages = (existing.messages ?? 0) + increment;
        existing.lastSeen = now;

        if (!existing.avatarUrl && participant.avatarUrl) {
            existing.avatarUrl = participant.avatarUrl;
        }
        if (!existing.displayName && participant.displayName) {
            existing.displayName = participant.displayName;
        }
        if (!existing.username && participant.username) {
            existing.username = participant.username;
        }
        if (!existing.id && participant.id) {
            existing.id = participant.id;
        }

        container.set(participant.key, existing);
    }

    getTopContributors(container, limit = 10) {
        return Array.from(container.values())
            .sort((a, b) => {
                const diff = (b.messages ?? 0) - (a.messages ?? 0);
                if (diff !== 0) {
                    return diff;
                }
                const nameA = (a.displayName ?? a.username ?? '').toLowerCase();
                const nameB = (b.displayName ?? b.username ?? '').toLowerCase();
                return nameA.localeCompare(nameB);
            })
            .slice(0, limit)
            .map((entry) => ({
                id: entry.id ?? null,
                username: entry.username ?? null,
                displayName: entry.displayName ?? entry.username ?? null,
                avatarUrl: entry.avatarUrl ?? null,
                messages: entry.messages ?? 0
            }));
    }

    addAttackPoint(participant, points = 1) {
        if (this.status !== 'ongoing') return;

        const increment = positiveOr(points, 1);
        this.attackMessages += increment;
        const normalized = this.normalizeParticipant(participant);
        if (normalized) {
            this.participantAttackers.add(normalized.key);
            this.recordContribution(this.attackContributions, normalized, increment);
        }
        this.recalculateAttackPower();
    }

    addDefensePoint(participant, points = 1) {
        if (this.status !== 'ongoing') return;

        const increment = positiveOr(points, 1);
        this.defenseMessages += increment;
        const normalized = this.normalizeParticipant(participant);
        if (normalized) {
            this.participantDefenders.add(normalized.key);
            this.recordContribution(this.defenseContributions, normalized, increment);
        }
        this.recalculateDefensePower();
    }

    getRemainingTime() {
        const now = Date.now();
        const remaining = Math.max(0, this.endTime - now);
        return Math.ceil(remaining / 1000);
    }

    isFinished() {
        return this.status !== 'ongoing' || Date.now() >= this.endTime;
    }

    cancel(cancelledBy = null, reason = 'manual') {
        if (this.status !== 'ongoing') {
            return this.status;
        }

        this.recalculateAttackPower();
        this.recalculateDefensePower();

        this.status = 'cancelled';
        this.cancelledBy = cancelledBy ?? null;
        this.cancelReason = reason ?? null;
        this.cancelledAt = Date.now();
        this.endTime = this.cancelledAt;
        this.winner = null;

        return this.status;
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
            cancelledBy: this.cancelledBy,
            cancelledAt: this.cancelledAt,
            cancelReason: this.cancelReason,
            participantCount: {
                attackers: this.participantAttackers.size,
                defenders: this.participantDefenders.size
            },
            topContributors: {
                attackers: this.getTopContributors(this.attackContributions),
                defenders: this.getTopContributors(this.defenseContributions)
            }
        };
    }
}
