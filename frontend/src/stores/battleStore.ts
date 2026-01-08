import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Battle } from 'shared/types'
import { BattleSchema } from 'shared/schemas'

export const useBattleStore = defineStore('battle', () => {
  const currentBattle = ref<Battle | null>(null)
  const battleHistory = ref<Battle[]>([])

  // Getters
  const isInBattle = computed(() => currentBattle.value !== null)

  // Actions - MUST use immutable updates
  function startBattle(battle: Battle) {
    currentBattle.value = BattleSchema.parse(battle) // Validate before storing
  }

  function updateBattle(updates: Partial<Battle>) {
    if (!currentBattle.value) {
      console.warn('[BattleStore] Cannot update battle: no battle is currently active')
      return
    }
    const updated = { ...currentBattle.value, ...updates }
    currentBattle.value = BattleSchema.parse(updated) // Validate merged result
  }

  function completeBattle(winnerId: string) {
    if (!currentBattle.value) {
      console.warn('[BattleStore] Cannot complete battle: no battle is currently active')
      return
    }

    // Use updateBattle for consistency with other mutations
    updateBattle({
      status: 'completed',
      winnerId,
      endedAt: new Date().toISOString()
    })

    // Add to history and clear current battle
    battleHistory.value = [...battleHistory.value, currentBattle.value!]
    currentBattle.value = null
  }

  function addToBattleHistory(battle: Battle) {
    const validated = BattleSchema.parse(battle) // Validate before storing
    battleHistory.value = [...battleHistory.value, validated]
  }

  return {
    currentBattle,
    battleHistory,
    isInBattle,
    startBattle,
    updateBattle,
    completeBattle,
    addToBattleHistory
  }
})
