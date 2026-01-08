import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Game, Territory } from 'shared/types'
import { GameSchema, TerritorySchema } from 'shared/schemas'

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<Game | null>(null)
  const territories = ref<Territory[]>([])

  // Getters
  const getGameConfig = computed(() => currentGame.value?.config)

  // Actions - MUST use immutable updates
  function setGame(game: Game | null) {
    if (game !== null) {
      currentGame.value = GameSchema.parse(game) // Validate before storing
    } else {
      currentGame.value = null
    }
  }

  function updateGame(updates: Partial<Game>) {
    if (!currentGame.value) {
      console.warn('[GameStore] Cannot update game: no game is currently set')
      return
    }
    const updated = { ...currentGame.value, ...updates }
    currentGame.value = GameSchema.parse(updated) // Validate merged result
  }

  function addTerritory(territory: Territory) {
    const validated = TerritorySchema.parse(territory) // Validate before storing
    territories.value = [...territories.value, validated]
  }

  function updateTerritory(id: string, updates: Partial<Territory>) {
    territories.value = territories.value.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates }
        return TerritorySchema.parse(updated) // Validate merged result
      }
      return t
    })
  }

  return {
    currentGame,
    territories,
    getGameConfig,
    setGame,
    updateGame,
    addTerritory,
    updateTerritory
  }
})
