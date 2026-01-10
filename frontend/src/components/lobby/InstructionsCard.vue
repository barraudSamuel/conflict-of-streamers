<script setup lang="ts">
/**
 * InstructionsCard - Collapsible game instructions for the lobby
 * Story 2.4 - Display Game Instructions in Lobby (FR11)
 */
import { ref } from 'vue'
import { Card } from '@/components/ui'

const isExpanded = ref(true) // Start expanded for first-time visibility

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <Card :padding="'md'" class="animate-fade-in">
    <template #header>
      <button
        type="button"
        @click="toggleExpand"
        :aria-expanded="isExpanded"
        aria-controls="instructions-content"
        class="w-full flex items-center justify-between cursor-pointer text-left"
      >
        <h2 class="text-lg font-semibold text-white">Comment jouer</h2>
        <span class="text-gray-400 text-lg transition-transform duration-200" :class="{ 'rotate-180': !isExpanded }">
          ▼
        </span>
      </button>
    </template>

    <Transition name="collapse">
      <div v-if="isExpanded" id="instructions-content" class="space-y-6 text-base text-gray-300">
        <!-- Attack and Defense -->
        <div>
          <h3 class="text-lg font-semibold text-player-cyan mb-2">Attaque et Defense</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Selectionnez un territoire adjacent pour l'attaquer</li>
            <li>Defendez vos territoires quand ils sont attaques</li>
            <li>Une seule action a la fois par territoire</li>
          </ul>
        </div>

        <!-- Viewer Participation -->
        <div>
          <h3 class="text-lg font-semibold text-player-magenta mb-2">Participation des Viewers</h3>
          <p class="mb-2">Vos viewers Twitch peuvent participer en tapant dans le chat :</p>
          <div class="bg-gray-800/50 rounded-lg p-3 font-mono text-base space-y-1">
            <p><span class="text-success">ATTACK</span> <span class="text-gray-400">[nom_territoire]</span> - pour attaquer</p>
            <p><span class="text-success">DEFEND</span> <span class="text-gray-400">[nom_territoire]</span> - pour defendre</p>
          </div>
          <p class="mt-2 text-gray-400">Plus il y a de messages + d'utilisateurs uniques, plus la force est elevee</p>
        </div>

        <!-- Force Calculation -->
        <div>
          <h3 class="text-lg font-semibold text-player-orange mb-2">Calcul de la Force</h3>
          <div class="bg-gray-800/50 rounded-lg p-3">
            <p class="font-mono text-base text-white mb-2">
              Force = (Messages x 0.7) + (Utilisateurs uniques x Bonus)
            </p>
            <ul class="list-disc list-inside space-y-1 text-gray-400">
              <li>Les petits territoires ont un bonus de defense</li>
              <li>Les grands territoires ont un bonus d'attaque</li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Card>
</template>

<style scoped>
/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-out;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
