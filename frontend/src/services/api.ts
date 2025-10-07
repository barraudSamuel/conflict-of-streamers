const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface GameData {
  id: string;
  code: string;
  adminId: string;
  status: string;
  players: any[];
  territories: any[];
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
