<script setup lang="ts">
/**
 * BattleProgressBar Component (Story 4.3)
 * Displays attack vs defense force comparison with animated progress bar
 * Animates at 60 FPS using requestAnimationFrame
 */
import { ref, computed, watch, onUnmounted } from 'vue'

interface Props {
  attackerForce: number
  defenderForce: number
  showLabels?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  attackerForce: 0,
  defenderForce: 0,
  showLabels: true
})

// Animated values for smooth transitions
const animatedAttackerForce = ref(props.attackerForce)
const animatedDefenderForce = ref(props.defenderForce)

// Separate animation frame IDs for each value to prevent memory leaks
let attackerAnimationId: number | null = null
let defenderAnimationId: number | null = null

// Calculate percentages
const totalForce = computed(() => {
  const total = animatedAttackerForce.value + animatedDefenderForce.value
  return total > 0 ? total : 1 // Prevent division by zero
})

const attackerPercentage = computed(() => {
  return (animatedAttackerForce.value / totalForce.value) * 100
})

const defenderPercentage = computed(() => {
  return (animatedDefenderForce.value / totalForce.value) * 100
})

// Smooth animation using requestAnimationFrame
function animateAttacker(targetValue: number, speed = 0.15) {
  const animate = () => {
    const diff = targetValue - animatedAttackerForce.value
    if (Math.abs(diff) < 0.5) {
      animatedAttackerForce.value = targetValue
      attackerAnimationId = null
      return
    }
    animatedAttackerForce.value += diff * speed
    attackerAnimationId = requestAnimationFrame(animate)
  }
  animate()
}

function animateDefender(targetValue: number, speed = 0.15) {
  const animate = () => {
    const diff = targetValue - animatedDefenderForce.value
    if (Math.abs(diff) < 0.5) {
      animatedDefenderForce.value = targetValue
      defenderAnimationId = null
      return
    }
    animatedDefenderForce.value += diff * speed
    defenderAnimationId = requestAnimationFrame(animate)
  }
  animate()
}

// Watch for prop changes and animate
watch(
  () => props.attackerForce,
  (newValue) => {
    if (attackerAnimationId) {
      cancelAnimationFrame(attackerAnimationId)
    }
    animateAttacker(newValue)
  }
)

watch(
  () => props.defenderForce,
  (newValue) => {
    if (defenderAnimationId) {
      cancelAnimationFrame(defenderAnimationId)
    }
    animateDefender(newValue)
  }
)

// Cleanup animation frames on unmount
onUnmounted(() => {
  if (attackerAnimationId) {
    cancelAnimationFrame(attackerAnimationId)
  }
  if (defenderAnimationId) {
    cancelAnimationFrame(defenderAnimationId)
  }
})
</script>

<template>
  <div class="battle-progress-bar">
    <!-- Force labels -->
    <div v-if="showLabels" class="flex justify-between mb-2 text-sm">
      <span class="text-attacker-red font-semibold">
        Force: {{ Math.round(animatedAttackerForce) }}
      </span>
      <span class="text-defender-blue font-semibold">
        Force: {{ Math.round(animatedDefenderForce) }}
      </span>
    </div>

    <!-- Progress bar container -->
    <div class="relative h-6 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
      <!-- Attacker bar (left side, red) -->
      <div
        class="absolute left-0 top-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-none"
        :style="{ width: `${attackerPercentage}%` }"
      >
        <!-- Animated shine effect -->
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine"></div>
      </div>

      <!-- Defender bar (right side, blue) -->
      <div
        class="absolute right-0 top-0 h-full bg-gradient-to-l from-blue-600 to-blue-500 transition-none"
        :style="{ width: `${defenderPercentage}%` }"
      >
        <!-- Animated shine effect -->
        <div class="absolute inset-0 bg-gradient-to-l from-transparent via-white/10 to-transparent animate-shine"></div>
      </div>

      <!-- Center divider/clash point -->
      <div
        class="absolute top-0 h-full w-1 bg-white/80 shadow-lg transform -translate-x-1/2 z-10"
        :style="{ left: `${attackerPercentage}%` }"
      ></div>

      <!-- Percentage labels on bar -->
      <div class="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white">
        <span v-if="attackerPercentage >= 15" class="drop-shadow-lg">
          {{ Math.round(attackerPercentage) }}%
        </span>
        <span v-else></span>
        <span v-if="defenderPercentage >= 15" class="drop-shadow-lg">
          {{ Math.round(defenderPercentage) }}%
        </span>
        <span v-else></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-attacker-red {
  color: #FF3B3B;
}

.text-defender-blue {
  color: #3B82F6;
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shine {
  animation: shine 2s ease-in-out infinite;
}
</style>
