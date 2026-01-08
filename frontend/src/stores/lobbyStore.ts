import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useLobbyStore = defineStore('lobby', () => {
  const isInLobby = ref<boolean>(false)
  const selectedTerritoryId = ref<string | null>(null)

  // Getters
  const hasSelectedTerritory = computed(() => selectedTerritoryId.value !== null)

  // Actions
  function enterLobby() {
    isInLobby.value = true
  }

  function exitLobby() {
    isInLobby.value = false
    selectedTerritoryId.value = null // Clear selection on exit
  }

  function selectTerritory(territoryId: string) {
    selectedTerritoryId.value = territoryId
  }

  function clearSelection() {
    selectedTerritoryId.value = null
  }

  return {
    isInLobby,
    selectedTerritoryId,
    hasSelectedTerritory,
    enterLobby,
    exitLobby,
    selectTerritory,
    clearSelection
  }
})
