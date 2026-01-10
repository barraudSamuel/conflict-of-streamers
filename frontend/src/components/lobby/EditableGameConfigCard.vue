<script setup lang="ts">
/**
 * EditableGameConfigCard - Display and edit game configuration in the lobby
 * Story 2.6 - Modify Game Configuration Before Launch (FR6)
 *
 * Features:
 * - Creator can edit battleDuration and cooldownBetweenActions
 * - Non-creators see read-only values
 * - Real-time validation with min/max limits
 * - WebSocket sync for all players
 */
import { ref, computed, watch } from 'vue'
import type { GameConfig, ConfigUpdateEvent } from 'shared/types'
import { CONFIG_LIMITS, CONFIG_EVENTS } from 'shared/types'
import { Card, Button } from '@/components/ui'
import { useWebSocketStore } from '@/stores/websocketStore'

interface Props {
  config: GameConfig | null
  isCreator: boolean
}

const props = defineProps<Props>()

const wsStore = useWebSocketStore()

// Local edit state
const battleDuration = ref(props.config?.battleDuration ?? CONFIG_LIMITS.battleDuration.default)
const cooldownBetweenActions = ref(props.config?.cooldownBetweenActions ?? CONFIG_LIMITS.cooldownBetweenActions.default)

// Validation error messages
const battleDurationError = ref('')
const cooldownError = ref('')

// Pending state to prevent race conditions (MEDIUM-3 from code review patterns)
const isSaving = ref(false)
// Error message for failed saves
const saveError = ref('')

// Sync local state when props change (real-time updates from WebSocket)
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    battleDuration.value = newConfig.battleDuration
    cooldownBetweenActions.value = newConfig.cooldownBetweenActions
    // Clear errors on external update
    battleDurationError.value = ''
    cooldownError.value = ''
    // Reset saving state when server confirms update (fixes MEDIUM-3)
    if (isSaving.value) {
      isSaving.value = false
      saveError.value = ''
    }
  }
}, { immediate: true })

// Client-side validation
function validateBattleDuration(value: number): boolean {
  if (value < CONFIG_LIMITS.battleDuration.min) {
    battleDurationError.value = `Minimum ${CONFIG_LIMITS.battleDuration.min} secondes`
    return false
  }
  if (value > CONFIG_LIMITS.battleDuration.max) {
    battleDurationError.value = `Maximum ${CONFIG_LIMITS.battleDuration.max} secondes`
    return false
  }
  if (!Number.isInteger(value)) {
    battleDurationError.value = 'Doit etre un nombre entier'
    return false
  }
  battleDurationError.value = ''
  return true
}

function validateCooldown(value: number): boolean {
  if (value < CONFIG_LIMITS.cooldownBetweenActions.min) {
    cooldownError.value = `Minimum ${CONFIG_LIMITS.cooldownBetweenActions.min} secondes`
    return false
  }
  if (value > CONFIG_LIMITS.cooldownBetweenActions.max) {
    cooldownError.value = `Maximum ${CONFIG_LIMITS.cooldownBetweenActions.max} secondes`
    return false
  }
  if (!Number.isInteger(value)) {
    cooldownError.value = 'Doit etre un nombre entier'
    return false
  }
  cooldownError.value = ''
  return true
}

// Check if current values differ from saved config
const hasChanges = computed(() => {
  if (!props.config) return false
  return battleDuration.value !== props.config.battleDuration ||
         cooldownBetweenActions.value !== props.config.cooldownBetweenActions
})

// Check if all fields are valid
const isValid = computed(() =>
  !battleDurationError.value && !cooldownError.value
)

// Can save: has changes, is valid, not currently saving, and connected
const canSave = computed(() =>
  hasChanges.value && isValid.value && !isSaving.value && wsStore.isConnected
)

function handleBattleDurationInput() {
  validateBattleDuration(battleDuration.value)
}

function handleCooldownInput() {
  validateCooldown(cooldownBetweenActions.value)
}

function handleSave() {
  // Validate both fields
  const bdValid = validateBattleDuration(battleDuration.value)
  const cdValid = validateCooldown(cooldownBetweenActions.value)

  if (!bdValid || !cdValid || isSaving.value) return

  isSaving.value = true
  saveError.value = ''

  // Build update payload with only changed fields
  const update: ConfigUpdateEvent = {}
  if (battleDuration.value !== props.config?.battleDuration) {
    update.battleDuration = battleDuration.value
  }
  if (cooldownBetweenActions.value !== props.config?.cooldownBetweenActions) {
    update.cooldownBetweenActions = cooldownBetweenActions.value
  }

  // Send via WebSocket
  const sent = wsStore.send(CONFIG_EVENTS.UPDATE, update)

  if (!sent) {
    // Show error to user (fixes MEDIUM-2)
    saveError.value = 'Connexion perdue. Veuillez reessayer.'
    isSaving.value = false
  }
  // Note: isSaving is reset when config:updated is received via watch (fixes MEDIUM-3)
  // Fallback timeout in case server doesn't respond
  setTimeout(() => {
    if (isSaving.value) {
      saveError.value = 'Delai depasse. Veuillez reessayer.'
      isSaving.value = false
    }
  }, 5000)
}
</script>

<template>
  <Card :padding="'md'" class="animate-fade-in">
    <template #header>
      <h2 class="text-lg font-semibold text-white">
        Configuration de la partie
        <span v-if="isCreator" class="text-sm text-gray-400 ml-2">(Modifiable)</span>
      </h2>
    </template>

    <div class="grid grid-cols-2 gap-6">
      <!-- Battle Duration -->
      <div class="text-center">
        <div class="flex items-center justify-center gap-2 text-gray-400 text-base mb-2">
          <span class="text-xl">&#x2694;&#xFE0F;</span>
          <span>Duree des batailles</span>
        </div>

        <!-- Creator: Editable input -->
        <div v-if="isCreator" class="flex flex-col items-center">
          <div class="flex items-center justify-center gap-2">
            <input
              v-model.number="battleDuration"
              type="number"
              :min="CONFIG_LIMITS.battleDuration.min"
              :max="CONFIG_LIMITS.battleDuration.max"
              class="w-20 px-3 py-2 bg-game-surface border rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-player-cyan transition-colors"
              :class="battleDurationError ? 'border-danger' : 'border-game-border'"
              @input="handleBattleDurationInput"
            />
            <span class="text-lg text-gray-400">sec</span>
          </div>
          <p v-if="battleDurationError" class="text-sm text-danger mt-1">{{ battleDurationError }}</p>
          <p v-else class="text-xs text-gray-500 mt-1">{{ CONFIG_LIMITS.battleDuration.min }}-{{ CONFIG_LIMITS.battleDuration.max }} sec</p>
        </div>

        <!-- Non-creator: Read-only display -->
        <div v-else class="flex items-center justify-center gap-2">
          <span class="text-3xl font-bold text-player-cyan">
            {{ config?.battleDuration ?? CONFIG_LIMITS.battleDuration.default }}
          </span>
          <span class="text-lg text-gray-400">sec</span>
        </div>
      </div>

      <!-- Cooldown Between Actions -->
      <div class="text-center">
        <div class="flex items-center justify-center gap-2 text-gray-400 text-base mb-2">
          <span class="text-xl">&#x23F3;</span>
          <span>Cooldown entre actions</span>
        </div>

        <!-- Creator: Editable input -->
        <div v-if="isCreator" class="flex flex-col items-center">
          <div class="flex items-center justify-center gap-2">
            <input
              v-model.number="cooldownBetweenActions"
              type="number"
              :min="CONFIG_LIMITS.cooldownBetweenActions.min"
              :max="CONFIG_LIMITS.cooldownBetweenActions.max"
              class="w-20 px-3 py-2 bg-game-surface border rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-player-cyan transition-colors"
              :class="cooldownError ? 'border-danger' : 'border-game-border'"
              @input="handleCooldownInput"
            />
            <span class="text-lg text-gray-400">sec</span>
          </div>
          <p v-if="cooldownError" class="text-sm text-danger mt-1">{{ cooldownError }}</p>
          <p v-else class="text-xs text-gray-500 mt-1">{{ CONFIG_LIMITS.cooldownBetweenActions.min }}-{{ CONFIG_LIMITS.cooldownBetweenActions.max }} sec</p>
        </div>

        <!-- Non-creator: Read-only display -->
        <div v-else class="flex items-center justify-center gap-2">
          <span class="text-3xl font-bold text-player-magenta">
            {{ config?.cooldownBetweenActions ?? CONFIG_LIMITS.cooldownBetweenActions.default }}
          </span>
          <span class="text-lg text-gray-400">sec</span>
        </div>
      </div>
    </div>

    <!-- Save Button and Error (creator only) -->
    <div v-if="isCreator" class="mt-6">
      <!-- Error message (MEDIUM-2 fix) -->
      <p v-if="saveError" class="text-sm text-danger mb-2 text-right">{{ saveError }}</p>
      <div class="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          :disabled="!canSave"
          :loading="isSaving"
          @click="handleSave"
        >
          Sauvegarder
        </Button>
      </div>
    </div>
  </Card>
</template>
