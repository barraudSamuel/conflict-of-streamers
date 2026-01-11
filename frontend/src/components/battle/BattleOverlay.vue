<script setup lang="ts">
/**
 * BattleOverlay Component (Story 4.3 + 4.5)
 * Main overlay showing battle details: attacker, defender, timer, forces, and commands
 * Displays when player is involved in an active battle
 * Story 4.5: Added MessageFeed for real-time chat display (FR26-FR27)
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { usePlayerStore } from '@/stores/playerStore'
import BattleProgressBar from './BattleProgressBar.vue'
import DefendCommand from './DefendCommand.vue'
import MessageFeed from './MessageFeed.vue'

interface Props {
  /** Override battle to display (optional - defaults to myBattle from store) */
  battleId?: string
}

const props = defineProps<Props>()

const battleStore = useBattleStore()
const playerStore = usePlayerStore()
const { myBattle, amIDefender, amIAttacker, activeBattles, feedMessages } = storeToRefs(battleStore)
const { players } = storeToRefs(playerStore)

// Get the battle to display
const battle = computed(() => {
  if (props.battleId) {
    return activeBattles.value.get(props.battleId) ?? null
  }
  return myBattle.value
})

// Get player info for display
const attacker = computed(() => {
  if (!battle.value) return null
  return players.value.find(p => p.id === battle.value!.attackerId) ?? null
})

const defender = computed(() => {
  if (!battle.value) return null
  if (!battle.value.defenderId) return null // BOT territory
  return players.value.find(p => p.id === battle.value!.defenderId) ?? null
})

// Format remaining time as MM:SS
const formattedTime = computed(() => {
  if (!battle.value) return '0:00'
  const seconds = Math.max(0, Math.floor(battle.value.remainingTime))
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

// Determine which command to show based on player role
const displayCommand = computed(() => {
  if (!battle.value) return ''
  if (amIDefender.value) {
    return battle.value.command.defend
  }
  if (amIAttacker.value) {
    return battle.value.command.attack
  }
  // Spectator - show defend command as default
  return battle.value.command.defend
})

// Command label based on role
const commandLabel = computed(() => {
  if (amIDefender.value) {
    return 'Dites a vos viewers de spammer:'
  }
  if (amIAttacker.value) {
    return 'Vos viewers doivent spammer:'
  }
  return 'Commandes disponibles:'
})

// Role indicator text
const roleText = computed(() => {
  if (amIDefender.value) return 'VOUS DEFENDEZ'
  if (amIAttacker.value) return 'VOUS ATTAQUEZ'
  return 'BATAILLE EN COURS'
})

const roleClass = computed(() => {
  if (amIDefender.value) return 'text-defender-blue'
  if (amIAttacker.value) return 'text-attacker-red'
  return 'text-white'
})

// Story 4.4: Get real force values from active battle in store
const attackerForce = computed(() => {
  if (!battle.value) return 0
  const activeBattle = activeBattles.value.get(battle.value.battleId)
  return activeBattle?.forces?.attackerForce ?? 0
})

const defenderForce = computed(() => {
  if (!battle.value) return 0
  const activeBattle = activeBattles.value.get(battle.value.battleId)
  return activeBattle?.forces?.defenderForce ?? 0
})
</script>

<template>
  <div v-if="battle" class="battle-overlay">
    <!-- Header with role indicator -->
    <div class="text-center mb-6">
      <div class="text-sm text-gray-400 uppercase tracking-wider mb-1">⚔️ Bataille</div>
      <h2 class="text-2xl font-bold" :class="roleClass">
        {{ roleText }}
      </h2>
    </div>

    <!-- Combatants section -->
    <div class="combatants flex items-center justify-between gap-8 mb-6">
      <!-- Attacker -->
      <div class="combatant flex flex-col items-center flex-1">
        <div class="relative">
          <img
            v-if="attacker?.twitchAvatarUrl"
            :src="attacker.twitchAvatarUrl"
            :alt="attacker.pseudo"
            class="w-20 h-20 rounded-full border-4 border-attacker-red"
          />
          <div
            v-else
            class="w-20 h-20 rounded-full border-4 border-attacker-red bg-gray-700 flex items-center justify-center"
          >
            <span class="text-3xl">⚔️</span>
          </div>
          <!-- Attack indicator -->
          <div class="absolute -bottom-2 -right-2 bg-attacker-red rounded-full p-1">
            <span class="text-sm">🗡️</span>
          </div>
        </div>
        <div class="mt-3 text-center">
          <div class="font-semibold text-white text-lg">
            {{ attacker?.pseudo ?? 'Attaquant' }}
          </div>
          <div class="text-sm text-attacker-red">
            {{ battle.attackerTerritoryId }}
          </div>
        </div>
      </div>

      <!-- VS separator -->
      <div class="vs-separator flex flex-col items-center">
        <span class="text-3xl font-bold text-gray-400">VS</span>
      </div>

      <!-- Defender -->
      <div class="combatant flex flex-col items-center flex-1">
        <div class="relative">
          <img
            v-if="defender?.twitchAvatarUrl"
            :src="defender.twitchAvatarUrl"
            :alt="defender.pseudo"
            class="w-20 h-20 rounded-full border-4 border-defender-blue"
          />
          <div
            v-else
            class="w-20 h-20 rounded-full border-4 border-gray-500 bg-gray-700 flex items-center justify-center"
          >
            <span class="text-3xl">🏰</span>
          </div>
          <!-- Defense indicator -->
          <div class="absolute -bottom-2 -right-2 bg-defender-blue rounded-full p-1">
            <span class="text-sm">🛡️</span>
          </div>
        </div>
        <div class="mt-3 text-center">
          <div class="font-semibold text-white text-lg">
            {{ defender?.pseudo ?? 'Territoire Libre' }}
          </div>
          <div class="text-sm text-defender-blue">
            {{ battle.defenderTerritoryId }}
          </div>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="mb-6">
      <BattleProgressBar
        :attacker-force="attackerForce"
        :defender-force="defenderForce"
        :show-labels="true"
      />
    </div>

    <!-- Command section -->
    <div class="mb-6">
      <DefendCommand
        :command="displayCommand"
        :label="commandLabel"
      />
    </div>

    <!-- Timer -->
    <div class="timer text-center">
      <div class="text-sm text-gray-400 uppercase tracking-wider mb-1">Temps restant</div>
      <div
        class="text-5xl font-bold font-mono"
        :class="{
          'text-danger animate-pulse': (battle?.remainingTime ?? 0) <= 10,
          'text-warning': (battle?.remainingTime ?? 0) > 10 && (battle?.remainingTime ?? 0) <= 30,
          'text-white': (battle?.remainingTime ?? 0) > 30
        }"
      >
        {{ formattedTime }}
      </div>
    </div>

    <!-- Story 4.5: Message Feed (FR26-FR27) - positioned below timer -->
    <div class="mt-6">
      <MessageFeed :messages="feedMessages" />
    </div>
  </div>
</template>

<style scoped>
.battle-overlay {
  width: 100%;
  max-width: 500px;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.border-attacker-red {
  border-color: #FF3B3B;
}

.border-defender-blue {
  border-color: #3B82F6;
}

.bg-attacker-red {
  background-color: #FF3B3B;
}

.bg-defender-blue {
  background-color: #3B82F6;
}

.text-attacker-red {
  color: #FF3B3B;
}

.text-defender-blue {
  color: #3B82F6;
}

/* Timer animation when low */
@keyframes pulse-glow {
  0%, 100% {
    text-shadow: 0 0 10px currentColor;
  }
  50% {
    text-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
  }
}

.timer .animate-pulse {
  animation: pulse-glow 1s ease-in-out infinite;
}
</style>
