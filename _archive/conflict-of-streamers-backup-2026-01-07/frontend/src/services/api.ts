const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface GameSettings {
  attackDuration: number;
  defenseDuration: number;
  reinforcementDuration: number;
  botBaseDefense: number;
  botFrontierMultiplier: number;
  messageAttackBonus: number;
  messageDefenseBonus: number;
  messageReinforcementBonus: number;
  frontierAttackBonus: number;
  frontierDefenseBonus: number;
  conquestCooldown: number;
  defenseCooldown: number;
  pointsPerCommand: number;
  maxPlayers: number;
}

export interface GameData {
  id: string;
  code: string;
  adminId: string;
  status: string;
  players: any[];
  territories: any[];
  settings: GameSettings;
}

export interface GameResponse {
  success: boolean;
  game: GameData;
}

export async function createGame(twitchUsername: string, adminId: string): Promise<GameResponse> {
  const response = await fetch(`${API_URL}/api/game/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      adminId,
      twitchUsername,
      settings: {}
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create game');
  }

  return response.json();
}

export async function joinGame(
  code: string,
  playerId: string,
  twitchUsername: string
): Promise<GameResponse> {
  const response = await fetch(`${API_URL}/api/game/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      playerId,
      twitchUsername,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join game');
  }

  return response.json();
}

export async function getGame(gameId: string): Promise<GameResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch game');
  }

  return response.json();
}

export async function assignTerritory(
  gameId: string,
  playerId: string,
  territoryId: string
): Promise<GameResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}/territory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      playerId,
      territoryId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign territory');
  }

  return response.json();
}

export async function updateGameSettings(
  gameId: string,
  adminId: string,
  settings: Partial<GameSettings>
): Promise<GameResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      adminId,
      settings
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update settings');
  }

  return response.json();
}

export async function startGame(gameId: string, adminId: string): Promise<GameResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      adminId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start game');
  }

  return response.json();
}

interface BasicSuccessResponse {
  success: boolean;
  message?: string;
}

interface ValidateAttackResponse {
  success: boolean;
  canAttack: boolean;
  error?: string;
}

interface ValidateReinforcementResponse {
  success: boolean;
  canReinforce: boolean;
  error?: string;
}

export async function leaveGame(gameId: string, playerId: string): Promise<BasicSuccessResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to leave game');
  }

  return response.json();
}

export async function validateAttack(
  gameId: string,
  attackerId: string,
  fromTerritory: string,
  toTerritory: string
): Promise<ValidateAttackResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}/attack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      attackerId,
      fromTerritory,
      toTerritory
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Attack validation failed');
  }

  return response.json();
}

export async function validateReinforcement(
  gameId: string,
  playerId: string,
  territoryId: string
): Promise<ValidateReinforcementResponse> {
  const response = await fetch(`${API_URL}/api/game/${gameId}/reinforcement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      playerId,
      territoryId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to validate reinforcement');
  }

  return response.json();
}
