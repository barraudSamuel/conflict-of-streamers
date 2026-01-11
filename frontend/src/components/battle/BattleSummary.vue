<script setup lang="ts">
/**
 * BattleSummary Component (Story 4.8)
 * Displays post-battle summary with top 5 spammers and participation stats
 * Auto-closes after 8 seconds with visual countdown (FR30-FR33)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { BattleSummary, TopContributor, BattleSideStats } from 'shared/types'

interface Props {
  /** Whether attacker won the battle */
  attackerWon: boolean
  /** Whether territory was transferred */
  territoryTransferred: boolean
  /** ID of transferred territory (if any) */
  transferredTerritoryId?: string
  /** Battle summary data from server */
  summary: BattleSummary
  /** Attacker force value */
  attackerForce: number
  /** Defender force value */
  defenderForce: number
  /** True if defender was a BOT territory */
  isDefenderBot?: boolean
  /** Current player's Twitch username (to highlight in top 5) */
  currentUsername?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
}>()

/** Auto-close countdown (8 seconds) */
const AUTO_CLOSE_DURATION = 8
const remainingTime = ref(AUTO_CLOSE_DURATION)
let countdownInterval: ReturnType<typeof setInterval> | null = null

/** Progress bar percentage (100% -> 0%) */
const progressPercentage = computed(() => {
  return (remainingTime.value / AUTO_CLOSE_DURATION) * 100
})

/** Start countdown timer */
function startCountdown() {
  countdownInterval = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      stopCountdown()
      emit('close')
    }
  }, 1000)
}

/** Stop countdown timer */
function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

/** Handle click outside to close */
function handleBackdropClick(event: MouseEvent) {
  // Only close if clicked on backdrop, not modal content
  if ((event.target as HTMLElement).classList.contains('summary-backdrop')) {
    emit('close')
  }
}

/** Handle Escape key to close */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

/** Get result text based on battle outcome */
const resultText = computed(() => {
  if (props.isDefenderBot) {
    return props.attackerWon ? 'TERRITOIRE CONQUIS' : 'DEFENSE BOT REUSSIE'
  }
  return props.attackerWon ? 'VICTOIRE ATTAQUANT' : 'VICTOIRE DEFENSEUR'
})

/** Get result color class */
const resultColorClass = computed(() => {
  return props.attackerWon ? 'text-success' : 'text-defender-blue'
})

/** Get result border color class */
const resultBorderClass = computed(() => {
  return props.attackerWon ? 'border-success' : 'border-defender-blue'
})

/** Check if current user is in top 5 (compare displayName since that's what we receive from GameView) */
function isCurrentUser(contributor: TopContributor): boolean {
  if (!props.currentUsername) return false
  // Compare displayName (case-insensitive) since currentUsername prop receives player.pseudo (displayName)
  return contributor.displayName.toLowerCase() === props.currentUsername.toLowerCase()
}

/** Get side color for contributor */
function getSideColorClass(side: 'attacker' | 'defender'): string {
  return side === 'attacker' ? 'bg-attacker-red' : 'bg-defender-blue'
}

/** Format large numbers with K suffix */
function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/** Check if there's any participation */
const hasParticipation = computed(() => {
  return props.summary.topContributors.length > 0
})

onMounted(() => {
  startCountdown()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  stopCountdown()
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        class="summary-backdrop"
        @click="handleBackdropClick"
      >
        <div class="summary-modal" :class="resultBorderClass">
          <!-- Result Header -->
          <div class="result-header" :class="resultColorClass">
            <div class="result-icon">
              {{ attackerWon ? '🎉' : '🛡️' }}
            </div>
            <h2 class="result-text">{{ resultText }}</h2>
            <div v-if="territoryTransferred && transferredTerritoryId" class="territory-info">
              {{ transferredTerritoryId }} capturé!
            </div>
          </div>

          <!-- Force Comparison -->
          <div class="force-comparison">
            <div class="force attacker">
              <span class="force-label">Attaquant</span>
              <span class="force-value">{{ formatNumber(attackerForce) }}</span>
            </div>
            <div class="force-vs">VS</div>
            <div class="force defender">
              <span class="force-label">{{ isDefenderBot ? 'BOT' : 'Défenseur' }}</span>
              <span class="force-value">{{ formatNumber(defenderForce) }}</span>
            </div>
          </div>

          <!-- Top 5 Spammers -->
          <div class="top-contributors">
            <h3 class="section-title">TOP 5 SPAMMERS</h3>

            <div v-if="hasParticipation" class="contributors-list">
              <div
                v-for="(contributor, index) in summary.topContributors"
                :key="contributor.username"
                class="contributor-row"
                :class="{ 'current-user': isCurrentUser(contributor) }"
              >
                <div class="rank">{{ index + 1 }}</div>
                <div class="side-indicator" :class="getSideColorClass(contributor.side)"></div>
                <div class="contributor-info">
                  <span class="display-name">{{ contributor.displayName }}</span>
                </div>
                <div class="message-count">
                  <span class="count">{{ formatNumber(contributor.messageCount) }}</span>
                  <span class="label">msg</span>
                </div>
              </div>
            </div>

            <div v-else class="no-participation">
              Aucune participation
            </div>
          </div>

          <!-- Participation Stats -->
          <div class="stats-section">
            <h3 class="section-title">STATISTIQUES</h3>
            <div class="stats-grid">
              <!-- Attacker Stats -->
              <div class="stat-card attacker">
                <div class="stat-icon">⚔️</div>
                <div class="stat-content">
                  <div class="stat-label">Attaquant</div>
                  <div class="stat-values">
                    <span>{{ formatNumber(summary.attackerStats.totalMessages) }} msg</span>
                    <span class="separator">|</span>
                    <span>{{ summary.attackerStats.uniqueUsers }} participants</span>
                  </div>
                </div>
              </div>

              <!-- Defender Stats (only if not BOT) -->
              <div v-if="summary.defenderStats" class="stat-card defender">
                <div class="stat-icon">🛡️</div>
                <div class="stat-content">
                  <div class="stat-label">Défenseur</div>
                  <div class="stat-values">
                    <span>{{ formatNumber(summary.defenderStats.totalMessages) }} msg</span>
                    <span class="separator">|</span>
                    <span>{{ summary.defenderStats.uniqueUsers }} participants</span>
                  </div>
                </div>
              </div>

              <!-- BOT indicator -->
              <div v-else class="stat-card bot">
                <div class="stat-icon">🤖</div>
                <div class="stat-content">
                  <div class="stat-label">Territoire BOT</div>
                  <div class="stat-values">
                    <span>Resistance passive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Auto-close Progress Bar -->
          <div class="auto-close-bar">
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
            <span class="countdown-text">{{ remainingTime }}s</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.summary-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.summary-modal {
  width: 100%;
  max-width: 480px;
  margin: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(20, 20, 20, 0.99) 100%);
  border-radius: 12px;
  border: 2px solid;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Result Header */
.result-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.result-text {
  font-size: 1.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.territory-info {
  margin-top: 0.5rem;
  font-size: 1rem;
  color: #a0a0a0;
}

/* Force Comparison */
.force-comparison {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.force {
  flex: 1;
  text-align: center;
}

.force-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 0.25rem;
}

.force-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.force.attacker .force-value {
  color: #FF3B3B;
}

.force.defender .force-value {
  color: #3B82F6;
}

.force-vs {
  font-size: 1rem;
  font-weight: 600;
  color: #666;
}

/* Top Contributors */
.top-contributors {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  margin-bottom: 0.75rem;
}

.contributors-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contributor-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  transition: background 0.2s;
}

.contributor-row.current-user {
  background: rgba(0, 255, 127, 0.1);
  box-shadow: 0 0 0 1px rgba(0, 255, 127, 0.3);
}

.rank {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
}

.side-indicator {
  width: 4px;
  height: 1.5rem;
  border-radius: 2px;
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.display-name {
  font-size: 1rem;
  font-weight: 500;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-count {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.message-count .count {
  font-size: 1.125rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: #00FF7F;
}

.message-count .label {
  font-size: 0.75rem;
  color: #666;
}

.no-participation {
  text-align: center;
  padding: 1.5rem;
  color: #666;
  font-style: italic;
}

/* Stats Section */
.stats-section {
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border-left: 3px solid;
}

.stat-card.attacker {
  border-left-color: #FF3B3B;
}

.stat-card.defender {
  border-left-color: #3B82F6;
}

.stat-card.bot {
  border-left-color: #666;
  grid-column: span 2;
}

.stat-icon {
  font-size: 1.25rem;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 0.125rem;
}

.stat-values {
  font-size: 0.875rem;
  color: #fff;
}

.stat-values .separator {
  margin: 0 0.25rem;
  color: #444;
}

/* Auto-close Bar */
.auto-close-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00FF7F, #00CC66);
  border-radius: 2px;
  transition: width 1s linear;
}

.countdown-text {
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  color: #888;
  min-width: 2rem;
  text-align: right;
}

/* Colors */
.text-success {
  color: #00FF7F;
}

.text-defender-blue {
  color: #3B82F6;
}

.border-success {
  border-color: #00FF7F;
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

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .summary-modal {
  animation: modal-in 0.3s ease-out;
}

.fade-leave-active .summary-modal {
  animation: modal-out 0.2s ease-in;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .summary-modal {
    margin: 0.5rem;
    padding: 1rem;
  }

  .result-text {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card.bot {
    grid-column: span 1;
  }
}
</style>
