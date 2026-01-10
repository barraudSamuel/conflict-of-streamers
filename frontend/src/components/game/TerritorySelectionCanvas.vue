<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useWebSocketStore } from '@/stores/websocketStore'
import { useCanvas, CANVAS_SIZE } from '@/composables/useCanvas'
import { TERRITORY_EVENTS } from 'shared/types'

// Stores
const territoryStore = useTerritoryStore()
const lobbyStore = useLobbyStore()
const websocketStore = useWebSocketStore()

const { territories, hoveredTerritoryId, selectedTerritoryId } = storeToRefs(territoryStore)

// Canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Canvas composable
const {
  clearCanvas,
  drawGrid,
  drawAllTerritories,
  getCellFromCoords
} = useCanvas({ canvasRef })

// Pending selection to avoid race conditions
const pendingSelection = ref<string | null>(null)

/**
 * Main render function - redraws the entire canvas
 */
function render(): void {
  clearCanvas()
  drawGrid()
  drawAllTerritories(
    territories.value,
    hoveredTerritoryId.value,
    selectedTerritoryId.value
  )
}

/**
 * Handle mouse move for hover effects
 */
function handleMouseMove(event: MouseEvent): void {
  const cell = getCellFromCoords(event.clientX, event.clientY)

  if (!cell) {
    territoryStore.setHoveredTerritory(null)
    return
  }

  const territory = territoryStore.findTerritoryAtCell(cell.x, cell.y)

  if (territory && !territory.ownerId) {
    territoryStore.setHoveredTerritory(territory.id)
  } else {
    territoryStore.setHoveredTerritory(null)
  }
}

/**
 * Handle mouse leave
 */
function handleMouseLeave(): void {
  territoryStore.setHoveredTerritory(null)
}

/**
 * Handle click for territory selection
 * Sends to server first, local update happens on server confirmation
 */
function handleClick(event: MouseEvent): void {
  const cell = getCellFromCoords(event.clientX, event.clientY)

  if (!cell) return

  const territory = territoryStore.findTerritoryAtCell(cell.x, cell.y)

  if (!territory) return

  // Check if territory is available
  if (territory.ownerId !== null) {
    return
  }

  // Get current player info
  const playerId = lobbyStore.playerId
  const playerColor = lobbyStore.playerColor

  if (!playerId || !playerColor) {
    console.error('Cannot select territory: player info not available')
    return
  }

  // Prevent double-click while waiting for server
  if (pendingSelection.value === territory.id) {
    return
  }

  // Mark as pending and send to server
  pendingSelection.value = territory.id

  // Optimistic local update for immediate feedback
  territoryStore.selectTerritory(territory.id, playerId, playerColor)

  // Send WebSocket event - server will broadcast to all including us
  websocketStore.send(TERRITORY_EVENTS.SELECT, {
    territoryId: territory.id
  })

  // Clear pending after a short delay (server should respond by then)
  setTimeout(() => {
    pendingSelection.value = null
  }, 500)
}

// Initialize territories and render on mount
onMounted(() => {
  territoryStore.initializeTerritories()
  territoryStore.startSelectionPhase()
  // Initial render
  render()
})

// Cleanup on unmount
onUnmounted(() => {
  territoryStore.endSelectionPhase()
})

// Re-render when state changes (efficient - only renders on actual changes)
watch(
  [territories, hoveredTerritoryId, selectedTerritoryId],
  () => {
    render()
  },
  { deep: true }
)
</script>

<template>
  <div class="territory-selection-container">
    <canvas
      ref="canvasRef"
      :width="CANVAS_SIZE"
      :height="CANVAS_SIZE"
      class="territory-canvas"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
    />

    <!-- Territory info tooltip -->
    <div
      v-if="territoryStore.hoveredTerritory"
      class="territory-tooltip"
    >
      <span class="territory-name">{{ territoryStore.hoveredTerritory.name }}</span>
      <span class="territory-size">{{ territoryStore.hoveredTerritory.size }}</span>
    </div>

    <!-- Selected territory indicator -->
    <div
      v-if="territoryStore.selectedTerritory"
      class="selection-indicator"
    >
      <span>Territoire selectionne:</span>
      <strong>{{ territoryStore.selectedTerritory.name }}</strong>
    </div>
  </div>
</template>

<style scoped>
.territory-selection-container {
  position: relative;
  display: inline-block;
}

.territory-canvas {
  display: block;
  cursor: pointer;
  border: 2px solid #333;
  border-radius: 4px;
}

.territory-tooltip {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(10, 10, 10, 0.9);
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}

.territory-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.territory-size {
  font-size: 14px;
  color: #888;
  text-transform: capitalize;
}

.selection-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 10, 0.9);
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  font-size: 16px;
  color: #fff;
}

.selection-indicator strong {
  color: #00F5FF;
}
</style>
