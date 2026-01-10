<script setup lang="ts">
/**
 * CreateGameView - Game creation form
 * Story 2.1 - AC: 1, 2, 5 - Form with validation
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Container, PageLayout, Input } from '@/components/ui'
import { CreateRoomRequestSchema } from 'shared/schemas'
import type { CreateRoomRequest } from 'shared/types'
import { api } from '@/services/api'
import { useLobbyStore } from '@/stores/lobbyStore'

const router = useRouter()
const lobbyStore = useLobbyStore()

// Form state
const formData = ref<CreateRoomRequest>({
  creatorPseudo: '',
  config: {
    battleDuration: 30,
    cooldownBetweenActions: 10
  }
})

const validationErrors = ref<Record<string, string>>({})
const isLoading = ref(false)
const apiError = ref<string | null>(null)

// Computed for button disabled state
const isFormValid = computed(() => {
  return formData.value.creatorPseudo.trim().length >= 3
})

// Validate form with Zod safeParse (frontend - no throw)
function validate(): boolean {
  validationErrors.value = {}
  apiError.value = null

  const result = CreateRoomRequestSchema.safeParse(formData.value)

  if (!result.success) {
    result.error.errors.forEach(err => {
      const path = err.path.join('.')
      validationErrors.value[path] = err.message
    })
    return false
  }

  return true
}

// Handle form submission
async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true
  apiError.value = null

  try {
    const response = await api.createRoom(formData.value)

    // Store room data in Pinia store
    lobbyStore.enterLobby({
      roomCode: response.roomCode,
      roomId: response.roomId,
      creator: response.creator
    })

    // Navigate to lobby
    router.push(`/lobby/${response.roomCode}`)
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : 'Une erreur est survenue'
  } finally {
    isLoading.value = false
  }
}

// Handle input changes
function handlePseudoInput(value: string) {
  formData.value.creatorPseudo = value
  // Clear validation error on input
  if (validationErrors.value['creatorPseudo']) {
    validationErrors.value['creatorPseudo'] = ''
  }
}

function handleBattleDurationInput(value: string) {
  const num = parseInt(value, 10)
  if (!isNaN(num)) {
    formData.value.config = {
      ...formData.value.config,
      battleDuration: Math.max(10, Math.min(120, num))
    }
  }
}

function handleCooldownInput(value: string) {
  const num = parseInt(value, 10)
  if (!isNaN(num)) {
    formData.value.config = {
      ...formData.value.config,
      cooldownBetweenActions: Math.max(5, Math.min(60, num))
    }
  }
}
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="md" class="py-12 flex flex-col items-center justify-center min-h-screen">
      <Card :padding="'lg'" :glow="true" class="w-full max-w-lg animate-fade-in">
        <template #header>
          <h1 class="text-2xl font-bold text-white text-center">Créer une Partie</h1>
        </template>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Pseudo Twitch Input -->
          <Input
            :model-value="formData.creatorPseudo"
            label="Pseudo Twitch"
            placeholder="Entrez votre pseudo Twitch"
            size="lg"
            :max-length="20"
            :error="!!validationErrors['creatorPseudo']"
            :error-message="validationErrors['creatorPseudo']"
            hint="3 à 20 caractères"
            @update:model-value="handlePseudoInput"
          />

          <!-- Battle Duration Input -->
          <Input
            :model-value="String(formData.config?.battleDuration ?? 30)"
            type="number"
            label="Durée des batailles (secondes)"
            placeholder="30"
            size="md"
            :error="!!validationErrors['config.battleDuration']"
            :error-message="validationErrors['config.battleDuration']"
            hint="Entre 10 et 120 secondes"
            @update:model-value="handleBattleDurationInput"
          />

          <!-- Cooldown Input -->
          <Input
            :model-value="String(formData.config?.cooldownBetweenActions ?? 10)"
            type="number"
            label="Temps de recharge entre actions (secondes)"
            placeholder="10"
            size="md"
            :error="!!validationErrors['config.cooldownBetweenActions']"
            :error-message="validationErrors['config.cooldownBetweenActions']"
            hint="Entre 5 et 60 secondes"
            @update:model-value="handleCooldownInput"
          />

          <!-- API Error Message -->
          <div v-if="apiError" class="p-4 bg-danger/20 border border-danger rounded-lg">
            <p class="text-danger text-base">{{ apiError }}</p>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            variant="primary"
            size="lg"
            :full-width="true"
            :disabled="!isFormValid || isLoading"
          >
            <span v-if="isLoading">Création en cours...</span>
            <span v-else>Créer la Partie</span>
          </Button>

          <!-- Back Button -->
          <Button
            variant="secondary"
            size="md"
            :full-width="true"
            @click="router.push('/')"
          >
            Retour
          </Button>
        </form>
      </Card>
    </Container>
  </PageLayout>
</template>
