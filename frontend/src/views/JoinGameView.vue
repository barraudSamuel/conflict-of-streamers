<script setup lang="ts">
/**
 * JoinGameView - Join an existing game form
 * Story 2.2 - AC: 1, 2, 3, 5, 6, 7, 8 - Form with validation and API integration
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, Card, Container, PageLayout, Input } from '@/components/ui'
import { JoinRoomRequestSchema, ROOM_CODE_REGEX } from 'shared/schemas'
import { api } from '@/services/api'
import { useLobbyStore } from '@/stores/lobbyStore'

const router = useRouter()
const route = useRoute()
const lobbyStore = useLobbyStore()

// Form state - trim and uppercase any prefilled code from query params
const roomCode = ref(((route.query.code as string) || '').trim().toUpperCase())
const pseudo = ref('')

const validationErrors = ref<{ roomCode?: string; pseudo?: string }>({})
const isLoading = ref(false)
const apiError = ref<string | null>(null)

// Computed for button disabled state
const isFormValid = computed(() => {
  return roomCode.value.length >= 6 && pseudo.value.trim().length >= 3
})

// Auto-uppercase, trim, and filter room code input
function handleRoomCodeInput(value: string) {
  // Trim, convert to uppercase and filter invalid characters
  roomCode.value = value.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 10)
  // Clear validation error on input
  if (validationErrors.value.roomCode) {
    validationErrors.value.roomCode = undefined
  }
  if (apiError.value) {
    apiError.value = null
  }
}

function handlePseudoInput(value: string) {
  pseudo.value = value
  // Clear validation error on input
  if (validationErrors.value.pseudo) {
    validationErrors.value.pseudo = undefined
  }
  if (apiError.value) {
    apiError.value = null
  }
}

// Validate form
function validate(): boolean {
  validationErrors.value = {}
  apiError.value = null

  let isValid = true

  // Validate room code format
  if (!roomCode.value) {
    validationErrors.value.roomCode = 'Le code de partie est requis'
    isValid = false
  } else if (!ROOM_CODE_REGEX.test(roomCode.value)) {
    validationErrors.value.roomCode = 'Le code doit contenir 6 à 10 caractères alphanumériques'
    isValid = false
  }

  // Validate pseudo with Zod
  const pseudoResult = JoinRoomRequestSchema.safeParse({ pseudo: pseudo.value })
  if (!pseudoResult.success) {
    pseudoResult.error.errors.forEach(err => {
      if (err.path[0] === 'pseudo') {
        validationErrors.value.pseudo = err.message
      }
    })
    isValid = false
  }

  return isValid
}

// Handle form submission
async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true
  apiError.value = null

  try {
    const response = await api.joinRoom(roomCode.value, { pseudo: pseudo.value })

    // Store room data in Pinia store
    lobbyStore.enterLobbyAsJoiner({
      roomCode: response.room.roomCode,
      roomId: response.room.roomId,
      currentPlayer: response.player,
      players: response.room.players,
      config: response.room.config
    })

    // Navigate to lobby
    router.push(`/lobby/${response.room.roomCode}`)
  } catch (error) {
    // Handle specific error codes
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue'

    // Map error messages to appropriate fields
    if (errorMessage.includes('pseudo') || errorMessage.includes('Ce pseudo')) {
      validationErrors.value.pseudo = errorMessage
    } else if (errorMessage.includes('not found') || errorMessage.includes('invalide')) {
      validationErrors.value.roomCode = 'Code de partie invalide'
    } else if (errorMessage.includes('complète') || errorMessage.includes('full')) {
      apiError.value = 'La partie est complète (max 10 joueurs)'
    } else {
      apiError.value = errorMessage
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="md" class="py-12 flex flex-col items-center justify-center min-h-screen">
      <Card :padding="'lg'" :glow="true" class="w-full max-w-lg animate-fade-in">
        <template #header>
          <h1 class="text-2xl font-bold text-white text-center">Rejoindre une Partie</h1>
        </template>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Room Code Input -->
          <Input
            :model-value="roomCode"
            label="Code de la partie"
            placeholder="Ex: VENDETTA"
            size="lg"
            :max-length="10"
            :error="!!validationErrors.roomCode"
            :error-message="validationErrors.roomCode"
            hint="Code fourni par le créateur de la partie"
            @update:model-value="handleRoomCodeInput"
          />

          <!-- Pseudo Twitch Input -->
          <Input
            :model-value="pseudo"
            label="Pseudo Twitch"
            placeholder="Entrez votre pseudo Twitch"
            size="lg"
            :max-length="20"
            :error="!!validationErrors.pseudo"
            :error-message="validationErrors.pseudo"
            hint="3 à 20 caractères"
            @update:model-value="handlePseudoInput"
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
            <span v-if="isLoading">Connexion en cours...</span>
            <span v-else>Rejoindre la Partie</span>
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
