export const PLAYER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788'
];

export class Player {
    constructor(id, twitchUsername, color = null, isAdmin = false) {
        this.id = id;
        this.twitchUsername = twitchUsername;
        this.color = color || this.generateColor();
        this.score = 0;
        this.isReady = false;
        this.territories = [];
        this.isConnected = true;
        this.isAdmin = isAdmin;
        this.joinedAt = Date.now();
    }

    generateColor() {
        return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    }

    addScore(points) {
        this.score += points;
    }

    toJSON() {
        return {
            id: this.id,
            twitchUsername: this.twitchUsername,
            color: this.color,
            score: this.score,
            isReady: this.isReady,
            territories: this.territories,
            isConnected: this.isConnected,
            isAdmin: this.isAdmin
        };
    }
}
