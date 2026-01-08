import {computed, onBeforeUnmount, ref, watch, type Ref} from 'vue'
import {loadAudioSettings, saveAudioSettings} from '@/lib/audioSettings'

const DEFAULT_VOLUME = 0.6
const ATTACK_SEEK_OFFSET_SECONDS = 130

const clampVolume = (value: number) => Math.min(Math.max(value, 0), 1)

const createAudioElement = (src: string, loop = false): HTMLAudioElement | null => {
  if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
    return null
  }

  const audio = new Audio(src)
  audio.loop = loop
  audio.preload = 'auto'
  return audio
}

export const useAudioManager = () => {
  const canUseAudio = typeof window !== 'undefined' && typeof window.Audio !== 'undefined'

  const savedSettings = loadAudioSettings()

  const masterVolume = ref(clampVolume(savedSettings?.masterVolume ?? DEFAULT_VOLUME))
  const muted = ref(Boolean(savedSettings?.muted))
  const lastActiveVolume = ref(masterVolume.value > 0 ? masterVolume.value : DEFAULT_VOLUME)

  const baseTheme = createAudioElement('/sfx/theme.mp3', true)
  const attackTheme = createAudioElement('/sfx/war_theme.mp3', true)
  const warHorn = createAudioElement('/sfx/war_horn.mp3')

  const baseMix = ref(1)
  const attackMix = ref(0)

  type ManagedAudio = { audio: HTMLAudioElement; gain: number; mix: () => number }
  const managedAudios: ManagedAudio[] = [
    baseTheme ? { audio: baseTheme, gain: 1, mix: () => baseMix.value } : null,
    attackTheme ? { audio: attackTheme, gain: 1, mix: () => attackMix.value } : null,
    warHorn ? { audio: warHorn, gain: 0.18, mix: () => 1 } : null
  ].filter((entry): entry is ManagedAudio => Boolean(entry))

  type MixKey = 'base' | 'attack'
  const mixAnimations = new Map<MixKey, number>()

  const effectiveVolume = computed(() => (muted.value ? 0 : masterVolume.value))

  const applyVolume = (volume: number) => {
    if (!canUseAudio) return
    managedAudios.forEach(({ audio, gain, mix }) => {
      audio.volume = clampVolume(volume * gain * clampVolume(mix()))
    })
  }

  const persistSettings = () => {
    saveAudioSettings({
      masterVolume: masterVolume.value,
      muted: muted.value
    })
  }

  watch(
    effectiveVolume,
    (volume) => {
      applyVolume(volume)
    },
    { immediate: true }
  )

  watch(
    [masterVolume, muted],
    () => {
      persistSettings()
    },
    { deep: false }
  )

  watch([baseMix, attackMix], () => {
    applyVolume(effectiveVolume.value)
  })

  const stopAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  const playAudio = (audio: HTMLAudioElement | null, reset = false) => {
    if (!audio || !canUseAudio) return
    if (reset) {
      audio.currentTime = 0
    }
    void audio.play().catch(() => {
      // Autoplay might be blocked; ignore silently.
    })
  }

  const cancelMixAnimation = (key: MixKey) => {
    if (typeof window === 'undefined') return
    const frame = mixAnimations.get(key)
    if (frame !== undefined) {
      window.cancelAnimationFrame(frame)
      mixAnimations.delete(key)
    }
  }

  const animateMix = (key: MixKey, mixRef: Ref<number>, target: number, duration = 1200) => {
    const normalizedTarget = clampVolume(target)

    if (typeof window === 'undefined') {
      mixRef.value = normalizedTarget
      applyVolume(effectiveVolume.value)
      return Promise.resolve()
    }

    cancelMixAnimation(key)

    const startValue = mixRef.value
    const delta = normalizedTarget - startValue
    if (Math.abs(delta) < 0.001 || duration <= 0) {
      mixRef.value = normalizedTarget
      applyVolume(effectiveVolume.value)
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      const startTime = performance.now()

      const step = (time: number) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        mixRef.value = clampVolume(startValue + delta * progress)
        applyVolume(effectiveVolume.value)

        if (progress < 1) {
          const frame = window.requestAnimationFrame(step)
          mixAnimations.set(key, frame)
        } else {
          cancelMixAnimation(key)
          resolve()
        }
      }

      const frame = window.requestAnimationFrame(step)
      mixAnimations.set(key, frame)
    })
  }

  const seekAudio = (audio: HTMLAudioElement, offsetSeconds: number) => {
    const safeOffset = Math.max(offsetSeconds, 0)
    const assign = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      const target =
        duration > 0 && safeOffset >= duration ? Math.max(duration - 0.1, 0) : safeOffset
      try {
        audio.currentTime = target
      } catch {
        audio.currentTime = 0
      }
    }

    if (audio.readyState >= 1) {
      assign()
    } else {
      const onMeta = () => {
        assign()
        audio.removeEventListener('loadedmetadata', onMeta)
      }
      audio.addEventListener('loadedmetadata', onMeta)
    }
  }

  const ensureBaseTheme = () => {
    if (!baseTheme) return
    if (baseTheme.paused) {
      playAudio(baseTheme)
    }
  }

  const startAttackTheme = () => {
    if (!attackTheme) return
    if (baseTheme && baseTheme.paused) {
      playAudio(baseTheme)
    }
    seekAudio(attackTheme, ATTACK_SEEK_OFFSET_SECONDS)
    if (attackTheme.paused) {
      playAudio(attackTheme)
    }
    void animateMix('base', baseMix, 0, 1400)
    void animateMix('attack', attackMix, 1, 1400)
  }

  const stopAttackTheme = () => {
    if (baseTheme && baseTheme.paused) {
      playAudio(baseTheme)
    }
    void animateMix('base', baseMix, 1, 1200)
    if (attackTheme) {
      void animateMix('attack', attackMix, 0, 1200).then(() => {
        stopAudio(attackTheme)
      })
    }
  }

  const stopAll = () => {
    cancelMixAnimation('base')
    cancelMixAnimation('attack')
    stopAudio(baseTheme)
    stopAudio(attackTheme)
    stopAudio(warHorn)
    baseMix.value = 1
    attackMix.value = 0
  }

  const isBaseThemeActive = () =>
    Boolean(baseTheme) && baseTheme!.paused === false && baseMix.value > 0.05

  const setMasterVolume = (value: number) => {
    const clamped = clampVolume(value)
    masterVolume.value = clamped
    if (clamped > 0) {
      lastActiveVolume.value = clamped
      if (muted.value) {
        muted.value = false
      }
    }
  }

  const toggleMute = () => {
    if (muted.value) {
      muted.value = false
      if (masterVolume.value <= 0) {
        masterVolume.value = lastActiveVolume.value > 0 ? lastActiveVolume.value : DEFAULT_VOLUME
      }
    } else {
      if (masterVolume.value > 0) {
        lastActiveVolume.value = masterVolume.value
      }
      muted.value = true
    }
  }

  onBeforeUnmount(() => {
    stopAll()
  })

  const playWarHorn = () => {
    if (!warHorn) return
    playAudio(warHorn, true)
  }

  return {
    masterVolume,
    isMuted: computed(() => muted.value),
    setMasterVolume,
    toggleMute,
    ensureBaseTheme,
    startAttackTheme,
    stopAttackTheme,
    stopAll,
    isBaseThemeActive,
    playWarHorn
  }
}
