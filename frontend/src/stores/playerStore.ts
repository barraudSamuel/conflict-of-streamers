import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Player } from 'shared/types'
import { PlayerSchema } from 'shared/schemas'

export const usePlayerStore = defineStore('player', () => {
  const players = ref<Player[]>([])
  const currentPlayer = ref<Player | null>(null)

  // Getters - Map index for O(1) lookup
  const playersMap = computed(() =>
    new Map(players.value.map(p => [p.id, p]))
  )

  const getPlayerById = computed(() => (id: string) =>
    playersMap.value.get(id)
  )

  // Actions - MUST use immutable updates (spread operators)
  function addPlayer(player: Player) {
    const validated = PlayerSchema.parse(player) // Validate before storing
    players.value = [...players.value, validated]
  }

  function updatePlayer(id: string, updates: Partial<Player>) {
    // Validate the updated player object
    players.value = players.value.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates }
        return PlayerSchema.parse(updated) // Validate merged result
      }
      return p
    })
  }

  function removePlayer(id: string) {
    players.value = players.value.filter(p => p.id !== id)
  }

  function setCurrentPlayer(player: Player | null) {
    if (player !== null) {
      currentPlayer.value = PlayerSchema.parse(player) // Validate before setting
    } else {
      currentPlayer.value = null
    }
  }

  return {
    players,
    currentPlayer,
    getPlayerById,
    addPlayer,
    updatePlayer,
    removePlayer,
    setCurrentPlayer
  }
})
