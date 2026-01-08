export interface PlayerContext {
  playerId: string
  twitchUsername: string
  isAdmin: boolean
  gameId: string
  gameCode: string
}

const PLAYER_STORAGE_KEY = 'cos.player'

const getAvailableStorages = (): Storage[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const storages: Storage[] = []

  try {
    storages.push(window.localStorage)
  } catch {
    // localStorage inaccessible (e.g. privacy mode); ignore
  }

  try {
    storages.push(window.sessionStorage)
  } catch {
    // sessionStorage inaccessible; ignore
  }

  return storages
}

export const savePlayerContext = (context: PlayerContext) => {
  const storages = getAvailableStorages()

  for (const storage of storages) {
    try {
      storage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(context))
      // Attempt to keep each available storage updated; continue even after success.
    } catch {
      // Continue with next available storage if write failed.
    }
  }
}

export const loadPlayerContext = (): PlayerContext | null => {
  const storages = getAvailableStorages()

  for (const storage of storages) {
    try {
      const stored = storage.getItem(PLAYER_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as PlayerContext
      }
    } catch {
      // Ignore parsing/storage errors and continue with next candidate.
    }
  }

  return null
}

export const clearPlayerContext = () => {
  const storages = getAvailableStorages()

  for (const storage of storages) {
    try {
      storage.removeItem(PLAYER_STORAGE_KEY)
    } catch {
      // Ignore errors and continue clearing other storages.
    }
  }
}

export { PLAYER_STORAGE_KEY }
