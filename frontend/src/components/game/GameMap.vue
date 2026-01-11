<script setup lang="ts">
/**
 * GameMap.vue - Canvas 2D rendering of the game map (Story 4.1 + 4.2)
 *
 * Renders the 20x20 grid with territories during gameplay.
 * Uses Canvas 2D API (AD-1: NEVER PixiJS/WebGL)
 * Supports real-time updates via store reactivity (< 200ms NFR1)
 * Story 4.2: Attack initiation UI and battle indicators
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useBattleStore } from '@/stores/battleStore'
import { usePlayerStore } from '@/stores/playerStore'
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
const battleStore = useBattleStore()
const playerStore = usePlayerStore()

const { territories } = storeToRefs(territoryStore)
const { selectedSourceTerritory, selectedTargetTerritory, allActiveBattles } = storeToRefs(battleStore)

// Canvas constants
const CELL_SIZE = 32 // pixels per cell
const GRID_SIZE = 20 // 20x20 grid
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE // 640x640 pixels
const LABEL_FONT_SIZE = 10

// Story 4.2: Attack indicator colors
const ATTACK_COLORS = {
  attackable: 'rgba(0, 255, 127, 0.25)',      // Green overlay for valid targets
  selected: 'rgba(255, 255, 255, 0.3)',       // White overlay for selected source
  attacking: 'rgba(255, 59, 59, 0.4)',        // Red pulse for attacking territory
  defending: 'rgba(255, 230, 0, 0.4)',        // Yellow pulse for defending territory
  battleLine: '#FFFFFF',                       // White line connecting territories
  cooldown: 'rgba(128, 128, 128, 0.3)'        // Gray overlay for cooldown
}

// Canvas refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hoveredTerritoryId = ref<string | null>(null)

// Story 4.3: Animation state for pulsing battle indicators
const pulsePhase = ref(0)
let pulseAnimationId: number | null = null

// Get 2D context
const ctx = computed(() => {
  if (!canvasRef.value) return null
  return canvasRef.value.getContext('2d')
})

// Story 4.2: Get current player's territories
const myTerritories = computed(() => {
  const myId = playerStore.currentPlayer?.id
  if (!myId) return []
  return territories.value.filter(t => t.ownerId === myId)
})

// Story 4.2: Get attackable territories when a source is selected
const attackableTerritories = computed(() => {
  if (!selectedSourceTerritory.value) return []

  const source = territories.value.find(t => t.id === selectedSourceTerritory.value)
  if (!source) return []

  // Get adjacent territories that are NOT owned by current player
  const myId = playerStore.currentPlayer?.id
  return territoryStore.getAdjacentTerritories(source.id)
    .filter(t => t.ownerId !== myId && !t.isUnderAttack && !t.isAttacking)
})

// Story 4.2: Check if a territory can be attacked
function canAttackTerritory(territoryId: string): boolean {
  return attackableTerritories.value.some(t => t.id === territoryId)
}

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
  const isSelected = territory.id === selectedSourceTerritory.value
  const isAttackable = canAttackTerritory(territory.id)

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

    // Story 4.2: Selected source territory (for attack)
    if (isSelected && props.interactive) {
      ctx.value!.fillStyle = ATTACK_COLORS.selected
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }

    // Story 4.2: Attackable territory indicator
    if (isAttackable && props.interactive) {
      ctx.value!.fillStyle = ATTACK_COLORS.attackable
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }

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

    // Story 4.3: Battle state indicators with pulsing animation
    if (isUnderAttack) {
      // Calculate pulse alpha based on sine wave (0.2 to 0.6)
      const pulseAlpha = 0.2 + Math.abs(Math.sin(pulsePhase.value)) * 0.4
      ctx.value!.fillStyle = `rgba(255, 230, 0, ${pulseAlpha})`
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }

    if (isAttacking) {
      // Calculate pulse alpha based on sine wave (0.2 to 0.6)
      const pulseAlpha = 0.2 + Math.abs(Math.sin(pulsePhase.value)) * 0.4
      ctx.value!.fillStyle = `rgba(255, 59, 59, ${pulseAlpha})`
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }
  })

  // Draw territory border
  drawTerritoryBorder(territory, isHovered || isSelected || isAttackable)
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
 * Story 4.3: Also shows battle timer when territory is in battle
 */
function drawTerritoryLabel(territory: Territory): void {
  if (!ctx.value) return

  // Calculate centroid of territory
  const sumX = territory.cells.reduce((sum, c) => sum + c.x, 0)
  const sumY = territory.cells.reduce((sum, c) => sum + c.y, 0)
  const centroidX = (sumX / territory.cells.length) * CELL_SIZE + CELL_SIZE / 2
  const centroidY = (sumY / territory.cells.length) * CELL_SIZE + CELL_SIZE / 2

  // Story 4.3: Check if territory is in battle to show timer
  const battle = allActiveBattles.value.find(
    b => b.attackerTerritoryId === territory.id || b.defenderTerritoryId === territory.id
  )
  const showTimer = battle && (territory.isAttacking || territory.isUnderAttack)

  // Draw label background (taller if showing timer)
  ctx.value.fillStyle = 'rgba(0, 0, 0, 0.7)'
  const labelWidth = territory.id.length * 6 + 6
  const labelHeight = showTimer ? 26 : 14
  ctx.value.fillRect(centroidX - labelWidth / 2 - 2, centroidY - labelHeight / 2, labelWidth + 4, labelHeight)

  // Draw label text
  ctx.value.fillStyle = '#ffffff'
  ctx.value.font = `bold ${LABEL_FONT_SIZE}px system-ui, sans-serif`
  ctx.value.textAlign = 'center'
  ctx.value.textBaseline = 'middle'

  if (showTimer && battle) {
    // Draw territory ID above timer
    ctx.value.fillText(territory.id, centroidX, centroidY - 6)

    // Draw timer below ID
    const seconds = Math.max(0, Math.floor(battle.remainingTime))
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const timerText = `${mins}:${secs.toString().padStart(2, '0')}`

    // Timer color: red when < 10 seconds
    ctx.value.fillStyle = seconds <= 10 ? '#FF3B3B' : '#FFE600'
    ctx.value.font = `bold ${LABEL_FONT_SIZE - 1}px system-ui, sans-serif`
    ctx.value.fillText(timerText, centroidX, centroidY + 6)
  } else {
    ctx.value.fillText(territory.id, centroidX, centroidY)
  }
}

/**
 * Story 4.2: Calculate center of territory for battle lines
 */
function getTerritoryCenter(territory: Territory): { x: number; y: number } {
  const sumX = territory.cells.reduce((sum, c) => sum + c.x, 0)
  const sumY = territory.cells.reduce((sum, c) => sum + c.y, 0)
  return {
    x: (sumX / territory.cells.length) * CELL_SIZE + CELL_SIZE / 2,
    y: (sumY / territory.cells.length) * CELL_SIZE + CELL_SIZE / 2
  }
}

/**
 * Story 4.2: Draw battle connection lines between fighting territories
 */
function drawBattleLines(): void {
  if (!ctx.value) return

  allActiveBattles.value.forEach(battle => {
    const attacker = territories.value.find(t => t.id === battle.attackerTerritoryId)
    const defender = territories.value.find(t => t.id === battle.defenderTerritoryId)

    if (!attacker || !defender) return

    const attackerCenter = getTerritoryCenter(attacker)
    const defenderCenter = getTerritoryCenter(defender)

    // Draw battle line
    ctx.value!.strokeStyle = ATTACK_COLORS.battleLine
    ctx.value!.lineWidth = 3
    ctx.value!.setLineDash([5, 5]) // Dashed line for battle

    ctx.value!.beginPath()
    ctx.value!.moveTo(attackerCenter.x, attackerCenter.y)
    ctx.value!.lineTo(defenderCenter.x, defenderCenter.y)
    ctx.value!.stroke()

    // Draw arrow head pointing to defender
    const angle = Math.atan2(
      defenderCenter.y - attackerCenter.y,
      defenderCenter.x - attackerCenter.x
    )
    const arrowSize = 12

    ctx.value!.setLineDash([]) // Solid for arrow
    ctx.value!.fillStyle = ATTACK_COLORS.battleLine
    ctx.value!.beginPath()
    ctx.value!.moveTo(defenderCenter.x, defenderCenter.y)
    ctx.value!.lineTo(
      defenderCenter.x - arrowSize * Math.cos(angle - Math.PI / 6),
      defenderCenter.y - arrowSize * Math.sin(angle - Math.PI / 6)
    )
    ctx.value!.lineTo(
      defenderCenter.x - arrowSize * Math.cos(angle + Math.PI / 6),
      defenderCenter.y - arrowSize * Math.sin(angle + Math.PI / 6)
    )
    ctx.value!.closePath()
    ctx.value!.fill()
  })

  // Reset line dash
  ctx.value!.setLineDash([])
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

  // Story 4.2: Draw battle lines on top of everything
  drawBattleLines()
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
 * Handle click for territory selection (Story 4.2 - Attack Flow)
 *
 * Click flow:
 * 1. Click on own territory -> Select as attack source
 * 2. Click on attackable territory -> Initiate attack
 * 3. Click elsewhere -> Clear selection
 */
function handleClick(event: MouseEvent): void {
  if (!props.interactive) return

  const cell = getCellFromCoords(event.clientX, event.clientY)
  if (!cell) return

  const territory = findTerritoryAtCell(cell.x, cell.y)
  if (!territory) {
    // Click on empty area - clear selection
    battleStore.setSelectedSource(null)
    render()
    return
  }

  const myId = playerStore.currentPlayer?.id
  const isMyTerritory = territory.ownerId === myId

  // If no source selected yet
  if (!selectedSourceTerritory.value) {
    if (isMyTerritory && !territory.isAttacking && !territory.isUnderAttack) {
      // Select own territory as attack source
      battleStore.setSelectedSource(territory.id)
      render()
    }
    emit('territory-click', territory.id)
    return
  }

  // Source is already selected
  if (territory.id === selectedSourceTerritory.value) {
    // Click on same territory - deselect
    battleStore.setSelectedSource(null)
    render()
    return
  }

  if (isMyTerritory) {
    // Click on another own territory - switch source
    battleStore.setSelectedSource(territory.id)
    render()
    return
  }

  // Check if this territory can be attacked
  if (canAttackTerritory(territory.id)) {
    // Initiate attack!
    battleStore.initiateAttack(selectedSourceTerritory.value, territory.id)
    // Selection will be cleared when battle:start is received
  }

  emit('territory-click', territory.id)
}

/**
 * Story 4.3: Start pulse animation loop when battles are active
 */
function startPulseAnimation(): void {
  if (pulseAnimationId !== null) return

  const animate = () => {
    pulsePhase.value += 0.08 // Controls pulse speed
    render()
    pulseAnimationId = requestAnimationFrame(animate)
  }
  pulseAnimationId = requestAnimationFrame(animate)
}

/**
 * Story 4.3: Stop pulse animation when no battles
 */
function stopPulseAnimation(): void {
  if (pulseAnimationId !== null) {
    cancelAnimationFrame(pulseAnimationId)
    pulseAnimationId = null
  }
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

// Story 4.2: Re-render when battle state changes
// Story 4.3: Start/stop pulse animation based on active battles
watch(
  [selectedSourceTerritory, allActiveBattles],
  () => {
    if (allActiveBattles.value.length > 0) {
      startPulseAnimation()
    } else {
      stopPulseAnimation()
      render()
    }
  },
  { deep: true }
)

// Story 4.3: Cleanup animation on unmount
onUnmounted(() => {
  stopPulseAnimation()
})

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
