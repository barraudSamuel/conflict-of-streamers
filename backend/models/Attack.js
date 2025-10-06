import { v4 as uuidv4 } from 'uuid';

export class Attack {
    constructor(attackerId, defenderId, fromTerritory, toTerritory, duration) {
        this.id = uuidv4();
        this.attackerId = attackerId;
        this.defenderId = defenderId;
        this.fromTerritory = fromTerritory;
        this.toTerritory = toTerritory;
        this.attackPoints = 0;
        this.defensePoints = 0;
        this.status = 'ongoing'; // ongoing | finished
        this.startTime = Date.now();
        this.endTime = this.startTime + (duration * 1000);
        this.winner = null;
        this.participantAttackers = new Set();
        this.participantDefenders = new Set();
    }

    addAttackPoint(userId, points = 1) {
        if (this.status !== 'ongoing') return;
        this.attackPoints += points;
        this.participantAttackers.add(userId);
    }

    addDefensePoint(userId, points = 1) {
        if (this.status !== 'ongoing') return;
        this.defensePoints += points;
        this.participantDefenders.add(userId);
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
            toTerritory: this.toTerritory,
            attackPoints: this.attackPoints,
            defensePoints: this.defensePoints,
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
