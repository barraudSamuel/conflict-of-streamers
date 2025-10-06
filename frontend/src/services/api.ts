const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CreateGameResponse {
  success: boolean;
  game: {
    id: string;
    code: string;
    adminId: string;
    status: string;
    players: any[];
    territories: any[];
  };
}

export async function createGame(twitchUsername: string): Promise<CreateGameResponse> {
  const adminId = crypto.randomUUID();

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

export async function getGame(gameId: string) {
  const response = await fetch(`${API_URL}/api/game/${gameId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch game');
  }

  return response.json();
}
