#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

const DEFAULT_NAMES = [
    'StreamerAlice',
    'StreamerBob',
    'StreamerCharlie',
    'StreamerDana',
    'StreamerEli',
    'StreamerFaye'
];

function toApiBase(input) {
    const base = input || process.env.API_URL || 'http://localhost:3000';
    return base.endsWith('/') ? base.slice(0, -1) : base;
}

function buildPlayers(values) {
    const explicitPlayers = values.players ?? [];
    if (explicitPlayers.length > 0) {
        return explicitPlayers.map((entry, index) => {
            if (typeof entry !== 'string' || entry.trim() === '') {
                throw new Error(`Invalid --players value at index ${index}`);
            }

            const [usernamePart, idPart] = entry.split(':');
            const username = usernamePart.trim();
            if (!username) {
                throw new Error(`Username cannot be empty for --players value at index ${index}`);
            }

            const playerId = idPart?.trim() || `mock-${username.toLowerCase()}-${randomUUID()}`;
            return { twitchUsername: username, playerId };
        });
    }

    const countRaw = values.count ?? '3';
    const desiredCount = Number.parseInt(countRaw, 10);
    const count = Number.isFinite(desiredCount) && desiredCount > 0 ? desiredCount : 3;

    return Array.from({ length: count }).map((_, index) => {
        const username = DEFAULT_NAMES[index % DEFAULT_NAMES.length];
        return {
            twitchUsername: `${username}${count > DEFAULT_NAMES.length ? index + 1 : ''}`,
            playerId: `mock-player-${index + 1}-${randomUUID()}`
        };
    });
}

async function joinPlayer(apiBase, code, player) {
    const endpoint = `${apiBase}/api/game/join`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            playerId: player.playerId,
            twitchUsername: player.twitchUsername
        })
    });

    if (!response.ok) {
        let details = '';
        try {
            const payload = await response.json();
            details = payload?.error || JSON.stringify(payload);
        } catch {
            details = await response.text();
        }
        throw new Error(`HTTP ${response.status} - ${details}`);
    }

    return response.json();
}

async function fetchAvailableTerritories(apiBase, gameId) {
    const response = await fetch(`${apiBase}/api/game/${gameId}/territories/available`);
    if (!response.ok) {
        throw new Error(`failed to load available territories (HTTP ${response.status})`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.territories)) {
        throw new Error('invalid territories payload');
    }

    return payload.territories;
}

async function assignRandomTerritory(apiBase, gameId, playerId) {
    const territories = await fetchAvailableTerritories(apiBase, gameId);
    if (territories.length === 0) {
        return { assigned: false, reason: 'no territories left' };
    }

    const randomIndex = Math.floor(Math.random() * territories.length);
    const territory = territories[randomIndex];

    const response = await fetch(`${apiBase}/api/game/${gameId}/territory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerId,
            territoryId: territory.id
        })
    });

    if (!response.ok) {
        let errorDetail = '';
        try {
            const body = await response.json();
            errorDetail = body?.error || JSON.stringify(body);
        } catch {
            errorDetail = await response.text();
        }

        throw new Error(`territory assign failed (HTTP ${response.status} - ${errorDetail})`);
    }

    return { assigned: true, territoryId: territory.id };
}

async function main() {
    const { values } = parseArgs({
        allowPositionals: false,
        options: {
            code: { type: 'string', short: 'c' },
            count: { type: 'string', short: 'n' },
            players: { type: 'string', multiple: true, short: 'p' },
            api: { type: 'string', short: 'a' }
        }
    });

    if (!values.code) {
        console.error('Missing required argument: --code <GAME_CODE>');
        process.exit(1);
    }

    const apiBase = toApiBase(values.api);
    const code = values.code.trim().toUpperCase();
    const players = buildPlayers(values);

    console.log(`[INFO] Seeding ${players.length} mock player(s) into game code ${code}`);
    console.log(`[INFO] API base: ${apiBase}`);

    let knownGameId = null;

    for (let player of players) {
        process.stdout.write(`  • ${player.twitchUsername} (${player.playerId})... `);
        try {
            const joinResult = await joinPlayer(apiBase, code, player);
            const gameId = joinResult?.game?.id || knownGameId;

            if (!gameId) {
                console.log('joined (game id unavailable, skipping territory)');
                continue;
            }

            knownGameId = gameId;

            try {
                const assignment = await assignRandomTerritory(apiBase, gameId, player.playerId);
                if (assignment.assigned) {
                    console.log(`assigned territory ${assignment.territoryId}`);
                } else {
                    console.log(`joined (${assignment.reason})`);
                }
            } catch (assignError) {
                console.log(`joined but territory failed: ${assignError.message}`);
            }
        } catch (error) {
            console.log(`FAILED -> ${error.message}`);
        }
    }

    console.log('[INFO] Completed mock joins');
}

main().catch((error) => {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});
