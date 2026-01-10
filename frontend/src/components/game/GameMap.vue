<script setup lang="ts">
/**
 * GameMap.vue - Canvas 2D rendering of the game map (Story 4.1)
 *
 * Renders the 20x20 grid with territories during gameplay.
 * Uses Canvas 2D API (AD-1: NEVER PixiJS/WebGL)
 * Supports real-time updates via store reactivity (< 200ms NFR1)
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useLobbyStore } from '@/stores/lobbyStore'
import type { Territory, Cell } from 'shared/types'
import { BOT_TERRITORY_COLOR, GRID_LINE_COLOR, TERRITORY_BORDER_COLOR } from 'shared/schemas'

// Props
const props = defineProps<{
  interactive?: boolean // Enable click events for attack targeting
}>()

// Emits
const emit = defineEmits<{
  'territory-click': [territoryId: string]
  'territory-hover': [territoryId: string | null]
}>()

// Stores
const territoryStore = useTerritoryStore()
const lobbyStore = useLobbyStore()

const { territories } = storeToRefs(territoryStore)

// Canvas constants
const CELL_SIZE = 32 // pixels per cell
const GRID_SIZE = 20 // 20x20 grid
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE // 640x640 pixels
const LABEL_FONT_SIZE = 10

// Canvas refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hoveredTerritoryId = ref<string | null>(null)

// Get 2D context
const ctx = computed(() => {
  if (!canvasRef.value) return null
  return canvasRef.value.getContext('2d')
})

/**
 * Clear the canvas with background color
 */
function clearCanvas(): void {
  if (!ctx.value || !canvasRef.value) return
  ctx.value.fillStyle = '#0a0a0a'
  ctx.value.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
}

/**
 * Draw grid lines (subtle)
 */
function drawGrid(): void {
  if (!ctx.value) return

  ctx.value.strokeStyle = GRID_LINE_COLOR
  ctx.value.lineWidth = 1

  // Vertical lines
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.value.beginPath()
    ctx.value.moveTo(i * CELL_SIZE, 0)
    ctx.value.lineTo(i * CELL_SIZE, CANVAS_SIZE)
    ctx.value.stroke()
  }

  // Horizontal lines
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.value.beginPath()
    ctx.value.moveTo(0, i * CELL_SIZE)
    ctx.value.lineTo(CANVAS_SIZE, i * CELL_SIZE)
    ctx.value.stroke()
  }
}

/**
 * Get fill color for territory based on owner
 */
function getTerritoryColor(territory: Territory): string {
  if (territory.ownerId === null) {
    return BOT_TERRITORY_COLOR // Neutral/BOT territory
  }
  return territory.color ?? BOT_TERRITORY_COLOR
}

/**
 * Draw a single territory
 */
function drawTerritory(territory: Territory, isHovered: boolean): void {
  if (!ctx.value) return

  const baseColor = getTerritoryColor(territory)
  const isUnderAttack = territory.isUnderAttack
  const isAttacking = territory.isAttacking

  // Draw each cell
  territory.cells.forEach(cell => {
    // Base color fill
    ctx.value!.fillStyle = baseColor
    ctx.value!.fillRect(
      cell.x * CELL_SIZE + 1,
      cell.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2
    )

    // Hover effect (if interactive)
    if (isHovered && props.interactive) {
      ctx.value!.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }

    // Attack/defense indicators
    if (isUnderAttack) {
      ctx.value!.fillStyle = 'rgba(255, 0, 0, 0.3)'
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }

    if (isAttacking) {
      ctx.value!.fillStyle = 'rgba(0, 255, 0, 0.3)'
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }
  })

  // Draw territory border
  drawTerritoryBorder(territory, isHovered)
}

/**
 * Draw border around territory edges
 */
function drawTerritoryBorder(territory: Territory, isHovered: boolean): void {
  if (!ctx.value) return

  const borderColor = isHovered ? '#ffffff' : (territory.color ?? TERRITORY_BORDER_COLOR)
  ctx.value.strokeStyle = borderColor
  ctx.value.lineWidth = isHovered ? 2 : 1

  territory.cells.forEach(cell => {
    const { x, y } = cell
    const hasTop = territory.cells.some(c => c.x === x && c.y === y - 1)
    const hasBottom = territory.cells.some(c => c.x === x && c.y === y + 1)
    const hasLeft = territory.cells.some(c => c.x === x - 1 && c.y === y)
    const hasRight = territory.cells.some(c => c.x === x + 1 && c.y === y)

    const px = x * CELL_SIZE
    const py = y * CELL_SIZE

    if (!hasTop) {
      ctx.value!.beginPath()
      ctx.value!.moveTo(px, py)
      ctx.value!.lineTo(px + CELL_SIZE, py)
      ctx.value!.stroke()
    }
    if (!hasBottom) {
      ctx.value!.beginPath()
      ctx.value!.moveTo(px, py + CELL_SIZE)
      ctx.value!.lineTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.value!.stroke()
    }
    if (!hasLeft) {
      ctx.value!.beginPath()
      ctx.value!.moveTo(px, py)
      ctx.value!.lineTo(px, py + CELL_SIZE)
      ctx.value!.stroke()
    }
    if (!hasRight) {
      ctx.value!.beginPath()
      ctx.value!.moveTo(px + CELL_SIZE, py)
      ctx.value!.lineTo(px + CELL_SIZE, py + CELL_SIZE)
      ctx.value!.stroke()
    }
  })
}

/**
 * Draw territory label (ID) at centroid
 */
function drawTerritoryLabel(territory: Territory): void {
  if (!ctx.value) return

  // Calculate centroid of territory
  const sumX = territory.cells.reduce((sum, c) => sum + c.x, 0)
  const sumY = territory.cells.reduce((sum, c) => sum + c.y, 0)
  const centroidX = (sumX / territory.cells.length) * CELL_SIZE + CELL_SIZE / 2
  const centroidY = (sumY / territory.cells.length) * CELL_SIZE + CELL_SIZE / 2

  // Draw label background
  ctx.value.fillStyle = 'rgba(0, 0, 0, 0.6)'
  const labelWidth = territory.id.length * 6 + 6
  ctx.value.fillRect(centroidX - labelWidth / 2, centroidY - 7, labelWidth, 14)

  // Draw label text
  ctx.value.fillStyle = '#ffffff'
  ctx.value.font = `bold ${LABEL_FONT_SIZE}px system-ui, sans-serif`
  ctx.value.textAlign = 'center'
  ctx.value.textBaseline = 'middle'
  ctx.value.fillText(territory.id, centroidX, centroidY)
}

/**
 * Main render function - redraws the entire canvas
 */
function render(): void {
  clearCanvas()
  drawGrid()

  // Draw all territories
  territories.value.forEach(territory => {
    const isHovered = territory.id === hoveredTerritoryId.value
    drawTerritory(territory, isHovered)
  })

  // Draw labels on top
  territories.value.forEach(territory => {
    drawTerritoryLabel(territory)
  })
}

/**
 * Convert mouse coordinates to grid cell
 */
function getCellFromCoords(clientX: number, clientY: number): Cell | null {
  if (!canvasRef.value) return null

  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.floor((clientX - rect.left) / CELL_SIZE)
  const y = Math.floor((clientY - rect.top) / CELL_SIZE)

  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
    return null
  }

  return { x, y }
}

/**
 * Find territory at given cell
 */
function findTerritoryAtCell(x: number, y: number): Territory | undefined {
  return territories.value.find(t =>
    t.cells.some(cell => cell.x === x && cell.y === y)
  )
}

/**
 * Handle mouse move for hover effects
 */
function handleMouseMove(event: MouseEvent): void {
  if (!props.interactive) return

  const cell = getCellFromCoords(event.clientX, event.clientY)

  if (!cell) {
    if (hoveredTerritoryId.value !== null) {
      hoveredTerritoryId.value = null
      emit('territory-hover', null)
      render()
    }
    return
  }

  const territory = findTerritoryAtCell(cell.x, cell.y)
  const newHoveredId = territory?.id ?? null

  if (newHoveredId !== hoveredTerritoryId.value) {
    hoveredTerritoryId.value = newHoveredId
    emit('territory-hover', newHoveredId)
    render()
  }
}

/**
 * Handle mouse leave
 */
function handleMouseLeave(): void {
  if (hoveredTerritoryId.value !== null) {
    hoveredTerritoryId.value = null
    emit('territory-hover', null)
    render()
  }
}

/**
 * Handle click for territory selection
 */
function handleClick(event: MouseEvent): void {
  if (!props.interactive) return

  const cell = getCellFromCoords(event.clientX, event.clientY)
  if (!cell) return

  const territory = findTerritoryAtCell(cell.x, cell.y)
  if (!territory) return

  emit('territory-click', territory.id)
}

// Initialize and render on mount
onMounted(() => {
  render()
})

// Re-render when territories change
watch(
  territories,
  () => {
    render()
  },
  { deep: true }
)

// Expose render for external calls
defineExpose({
  render,
  hoveredTerritoryId
})
</script>

<template>
  <div class="game-map-container">
    <canvas
      ref="canvasRef"
      :width="CANVAS_SIZE"
      :height="CANVAS_SIZE"
      class="game-map-canvas"
      :class="{ interactive: props.interactive }"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
    />
  </div>
</template>

<style scoped>
.game-map-container {
  display: inline-block;
  position: relative;
}

.game-map-canvas {
  display: block;
  border: 2px solid #333;
  border-radius: 4px;
  background: #0a0a0a;
}

.game-map-canvas.interactive {
  cursor: pointer;
}
</style>
