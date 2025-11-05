export interface AudioSettings {
  masterVolume: number
  muted: boolean
}

const AUDIO_SETTINGS_KEY = 'cos.audio'

const getCandidateStorages = (): Storage[] => {
  if (typeof window === 'undefined') return []

  const storages: Storage[] = []

  try {
    storages.push(window.localStorage)
  } catch {
    // Ignore storage access issues.
  }

  try {
    storages.push(window.sessionStorage)
  } catch {
    // Ignore storage access issues.
  }

  return storages
}

export const loadAudioSettings = (): AudioSettings | null => {
  const storages = getCandidateStorages()

  for (const storage of storages) {
    try {
      const raw = storage.getItem(AUDIO_SETTINGS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AudioSettings>
        if (typeof parsed.masterVolume === 'number') {
          return {
            masterVolume: Math.min(Math.max(parsed.masterVolume, 0), 1),
            muted: Boolean(parsed.muted)
          }
        }
      }
    } catch {
      // Proceed to next storage.
    }
  }

  return null
}

export const saveAudioSettings = (settings: AudioSettings) => {
  const storages = getCandidateStorages()
  const payload = JSON.stringify({
    masterVolume: Math.min(Math.max(settings.masterVolume, 0), 1),
    muted: Boolean(settings.muted)
  })

  for (const storage of storages) {
    try {
      storage.setItem(AUDIO_SETTINGS_KEY, payload)
    } catch {
      // Continue attempting other storage providers.
    }
  }
}

export { AUDIO_SETTINGS_KEY }
