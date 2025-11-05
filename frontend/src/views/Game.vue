<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Button} from '@/components/ui/button'
import LobbyDeckMap from '@/components/maps/LobbyDeckMap.vue'
import GameScoreboardOverlay from '@/components/game/GameScoreboardOverlay.vue'
import GameHeaderBar from '@/components/game/GameHeaderBar.vue'
import GameActionHistoryToast from '@/components/game/GameActionHistoryToast.vue'
import GameLegend from '@/components/game/GameLegend.vue'
import GameLossDialog from '@/components/game/GameLossDialog.vue'
import GameWinnerDialog from '@/components/game/GameWinnerDialog.vue'
import GameAttackSummaryDialog from '@/components/game/GameAttackSummaryDialog.vue'
import GameCommandPanel from '@/components/game/GameCommandPanel.vue'
import {useGameView, BOT_LEGEND_COLOR} from '@/composables/useGameView'
import {useAudioManager} from '@/composables/useAudioManager'

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const {
  game,
  loading,
  error,
  realtimeConnected,
  socketError,
  connectedPlayerCount,
  connectionStatusLabel,
  scoreboardVisible,
  handleTerritorySelect,
  currentPlayerId,
  activeAttacks,
  activeReinforcements,
  gameInfoItems,
  playersSummary,
  actionHistory,
  formatLogTimestamp,
  lossModalVisible,
  winnerModalVisible,
  winnerDisplayName,
  rankingForDisplay,
  winnerPlayerId,
  handleLeaveGame,
  leavingGame,
  leaveError,
  closeWinnerModal,
  visibleActionHistory,
  currentPlayerColor,
  currentPlayerAvatar,
  otherPlayerLegendEntries,
  selectedOwnedTerritory,
  targetTerritory,
  attackableTerritoryIds,
  attackError,
  reinforcementError,
  showAttackActions,
  showReinforcementActions,
  attackWindowLabel,
  reinforcementWindowLabel,
  currentAttackStats,
  defendingAttackStats,
  currentReinforcementStats,
  currentAttackEncouragement,
  defendingEncouragement,
  attackCommandLabel,
  defenseCommandLabel,
  reinforcementCommandLabel,
  currentAttackBalance,
  defendingAttackBalance,
  cancelAttackLoading,
  cancelReinforcementLoading,
  attackCTAEnabled,
  reinforcementCTAEnabled,
  attackDisabledReason,
  reinforcementDisabledReason,
  attackLoading,
  reinforcementLoading,
  lastAttackResult,
  attackSummaryStats,
  attackSummaryVisible,
  selectedReinforcement,
  cancelSelection,
  launchAttack,
  cancelCurrentAttack,
  cancelCurrentReinforcement,
  launchReinforcement,
  formatDuration,
  getPlayerUsername,
  currentAttack,
  defendingAttack,
  closeAttackSummary
} = useGameView(gameId)

const {
  masterVolume,
  isMuted,
  setMasterVolume,
  toggleMute,
  ensureBaseTheme,
  startAttackTheme,
  stopAttackTheme,
  isBaseThemeActive,
  playWarHorn
} = useAudioManager()

const resumeEvents = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'] as const

function removeResumeListeners() {
  if (typeof window === 'undefined') return
  resumeEvents.forEach((event) => {
    window.removeEventListener(event, resumeAudioAfterInteraction, true)
  })
}

function setupResumeListeners() {
  if (typeof window === 'undefined') return
  removeResumeListeners()
  resumeEvents.forEach((event) => {
    window.addEventListener(event, resumeAudioAfterInteraction, {
      capture: true,
      passive: true
    })
  })
}

function resumeAudioAfterInteraction() {
  ensureBaseTheme()
  if (isBaseThemeActive()) {
    removeResumeListeners()
  }
}

watch(
  () => loading.value,
  (isLoading) => {
    if (isLoading) return
    ensureBaseTheme()
    if (!isBaseThemeActive()) {
      setupResumeListeners()
    }
  }
)

watch(isMuted, (mutedValue) => {
  if (mutedValue) return
  ensureBaseTheme()
  if (!isBaseThemeActive()) {
    setupResumeListeners()
  }
})

onMounted(() => {
  ensureBaseTheme()
  if (!isBaseThemeActive()) {
    setupResumeListeners()
  }
})

onBeforeUnmount(() => {
  removeResumeListeners()
})

const playerAttackTerritoryIds = computed(() => {
  const currentPlayer = currentPlayerId.value
  if (!currentPlayer) return []
  return activeAttacks.value
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false
      return entry.attackerId === currentPlayer || entry.defenderId === currentPlayer
    })
    .map((entry) => (typeof entry?.territoryId === 'string' ? entry.territoryId : null))
    .filter((territoryId): territoryId is string => Boolean(territoryId))
    .sort()
})

const playerEngagedInAttack = computed(() => playerAttackTerritoryIds.value.length > 0)

watch(
  playerEngagedInAttack,
  (engaged, previousEngaged) => {
    if (engaged && !previousEngaged) {
      startAttackTheme()
      playWarHorn()
    } else if (!engaged && previousEngaged) {
      stopAttackTheme()
    }
  },
  { immediate: true }
)

watch(
  playerAttackTerritoryIds,
  (current, previous) => {
    const prev = Array.isArray(previous) ? previous : []
    const hasNew = current.some((id) => !prev.includes(id))
    if (playerEngagedInAttack.value && hasNew) {
      playWarHorn()
    }
  }
)

const goHome = () => {
  router.push('/')
}

type CornerDirection = 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right'

const confettiColors = ['#f97316', '#22c55e', '#38bdf8', '#facc15', '#e879f9', '#f472b6']

const createCornerEmitter = (
  position: { x: number; y: number },
  direction: CornerDirection
) => ({
  position,
  rate: {
    delay: 0.18,
    quantity: 12
  },
  size: {
    width: 0,
    height: 0
  },
  life: {
    count: 0
  },
  particles: {
    color: {
      value: confettiColors
    },
    shape: {
      type: ['square', 'circle', 'triangle']
    },
    opacity: {
      value: {
        min: 0.4,
        max: 1
      }
    },
    size: {
      value: {
        min: 3,
        max: 7
      }
    },
    move: {
      direction,
      enable: true,
      gravity: {
        enable: true,
        acceleration: 22
      },
      speed: {
        min: 28,
        max:120
      },
      decay: 0.08,
      outModes: {
        default: 'destroy',
        bottom: 'destroy',
        top: 'destroy'
      }
    },
    rotate: {
      value: {
        min: 0,
        max: 360
      },
      direction: 'random',
      animation: {
        enable: true,
        speed: 22
      }
    },
    tilt: {
      enable: true,
      direction: 'random',
      value: {
        min: 0,
        max: 360
      },
      animation: {
        enable: true,
        speed: 26
      }
    },
    wobble: {
      enable: true,
      distance: 45,
      speed: {
        min: -12,
        max: 12
      }
    }
  }
})

const winnerConfettiOptions = {
  detectRetina: true,
  fpsLimit: 120,
  fullScreen: {
    enable: false
  },
  background: {
    color: {
      value: 'transparent'
    }
  },
  particles: {
    number: {
      value: 0
    }
  },
  emitters: [
    createCornerEmitter({ x: 0, y: 0 }, 'bottom-right'),
    createCornerEmitter({ x: 100, y: 0 }, 'bottom-left'),
  ]
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-950 text-slate-100">
    <div v-if="loading" class="flex min-h-screen items-center justify-center">
      <p class="text-lg text-slate-300">Chargement de la partie...</p>
    </div>

    <div v-else-if="error" class="flex min-h-screen items-center justify-center px-4">
      <div class="space-y-4 text-center">
        <p class="text-lg text-red-400">{{ error }}</p>
        <Button variant="secondary" @click="goHome">Retour à l'accueil</Button>
      </div>
    </div>

    <div v-else-if="game" class="relative min-h-screen">
      <div
          v-if="winnerModalVisible && winnerPlayerId && currentPlayerId === winnerPlayerId"
          class="pointer-events-none absolute inset-0 z-[115]"
      >
        <vue-particles
            id="winner-confetti"
            class="h-full w-full"
            :options="winnerConfettiOptions"
        />
      </div>
      <div class="absolute inset-0">
        <LobbyDeckMap
            appearance="game"
            :territories="game.territories ?? []"
            :players="game.players ?? []"
            :current-player-id="currentPlayerId"
            :attackable-territory-ids="attackableTerritoryIds"
            :active-attacks="activeAttacks"
            :active-reinforcements="activeReinforcements"
            :disable-interaction="false"
            @select="handleTerritorySelect"
        />
      </div>

      <GameScoreboardOverlay
          v-if="scoreboardVisible"
          :game-info-items="gameInfoItems"
          :connected-player-count="connectedPlayerCount"
          :total-players="playersSummary.length"
          :players="playersSummary"
          :action-history="actionHistory"
          :format-log-timestamp="formatLogTimestamp"
      />

      <GameLossDialog v-model:open="lossModalVisible"/>

      <GameWinnerDialog
          v-model:open="winnerModalVisible"
          :winner-display-name="winnerDisplayName"
          :rankings="rankingForDisplay"
          :winner-player-id="winnerPlayerId"
          :leaving-game="leavingGame"
          @continue="closeWinnerModal"
          @leave="handleLeaveGame"
      />

      <GameAttackSummaryDialog
          v-model:open="attackSummaryVisible"
          :stats="attackSummaryStats"
          :get-player-username="getPlayerUsername"
          @close="closeAttackSummary"
      />

      <div class="pointer-events-none absolute inset-0 z-30 flex flex-col px-4">
        <GameHeaderBar
            :realtime-connected="realtimeConnected"
            :connection-status-label="connectionStatusLabel"
            :connected-player-count="connectedPlayerCount"
            :total-players="playersSummary.length"
            :socket-error="socketError"
            :leave-error="leaveError"
            :leaving-game="leavingGame"
            :volume-level="masterVolume"
            :muted="isMuted"
            @leave="handleLeaveGame"
            @toggle-audio="toggleMute"
            @volume-change="setMasterVolume"
        />

        <GameActionHistoryToast
            v-if="visibleActionHistory.length"
            :entries="visibleActionHistory"
            :format-log-timestamp="formatLogTimestamp"
        />

        <GameLegend
            :current-player-color="currentPlayerColor"
            :current-player-avatar="currentPlayerAvatar"
            :bot-color="BOT_LEGEND_COLOR"
            :other-entries="otherPlayerLegendEntries"
        />

        <main class="relative flex flex-1">
          <section class="pointer-events-none flex flex-1 flex-col items-center justify-end">
            <GameCommandPanel
                :current-attack="currentAttack"
                :defending-attack="defendingAttack"
                :current-attack-stats="currentAttackStats"
                :defending-attack-stats="defendingAttackStats"
                :current-reinforcement-stats="currentReinforcementStats"
                :current-attack-encouragement="currentAttackEncouragement"
                :defending-encouragement="defendingEncouragement"
                :attack-command-label="attackCommandLabel"
                :defense-command-label="defenseCommandLabel"
                :reinforcement-command-label="reinforcementCommandLabel"
                :attack-window-label="attackWindowLabel"
                :reinforcement-window-label="reinforcementWindowLabel"
                :attack-error="attackError"
                :reinforcement-error="reinforcementError"
                :show-attack-actions="showAttackActions"
                :show-reinforcement-actions="showReinforcementActions"
                :attack-cta-enabled="attackCTAEnabled"
                :reinforcement-cta-enabled="reinforcementCTAEnabled"
                :attack-loading="attackLoading"
                :reinforcement-loading="reinforcementLoading"
                :cancel-attack-loading="cancelAttackLoading"
                :cancel-reinforcement-loading="cancelReinforcementLoading"
                :last-attack-result="lastAttackResult"
                :selected-owned-territory="selectedOwnedTerritory"
                :target-territory="targetTerritory"
                :selected-reinforcement="selectedReinforcement"
                :current-attack-balance="currentAttackBalance"
                :defending-attack-balance="defendingAttackBalance"
                :format-duration="formatDuration"
                :get-player-username="getPlayerUsername"
                :cancel-selection="cancelSelection"
                :launch-attack="launchAttack"
                :cancel-current-attack="cancelCurrentAttack"
                :launch-reinforcement="launchReinforcement"
                :cancel-current-reinforcement="cancelCurrentReinforcement"
                :attack-disabled-reason="attackDisabledReason"
                :reinforcement-disabled-reason="reinforcementDisabledReason"
            />
          </section>
        </main>
      </div>
    </div>
  </div>
</template>
