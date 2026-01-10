import { computed, type Ref, type ComputedRef } from 'vue'
import type { Territory, Cell } from 'shared/types'

// Grid constants
export const CELL_SIZE = 30 // pixels per cell
export const GRID_SIZE = 20 // 20x20 grid
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE // 600x600 pixels

// Color constants
const BACKGROUND_COLOR = '#0a0a0a'
const GRID_LINE_COLOR = '#1a1a1a'
const NEUTRAL_COLOR = '#333333'
const HOVER_OVERLAY_COLOR = 'rgba(255, 255, 255, 0.15)'
const SELECTED_GLOW_COLOR = 'rgba(255, 255, 255, 0.3)'

interface UseCanvasOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
}

interface UseCanvasReturn {
  ctx: ComputedRef<CanvasRenderingContext2D | null>
  drawGrid: () => void
  drawTerritory: (territory: Territory, isHovered?: boolean, isSelected?: boolean) => void
  drawAllTerritories: (territories: Territory[], hoveredId: string | null, selectedId: string | null) => void
  clearCanvas: () => void
  getCellFromCoords: (clientX: number, clientY: number) => Cell | null
}

/**
 * Composable for Canvas 2D rendering of the 20x20 territory grid
 * Renders on-demand when state changes (efficient - no continuous loop)
 */
export function useCanvas({ canvasRef }: UseCanvasOptions): UseCanvasReturn {
  const ctx = computed(() => {
    if (!canvasRef.value) return null
    return canvasRef.value.getContext('2d')
  })

  /**
   * Clear the entire canvas
   */
  function clearCanvas(): void {
    if (!ctx.value || !canvasRef.value) return

    ctx.value.fillStyle = BACKGROUND_COLOR
    ctx.value.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }

  /**
   * Draw the grid lines
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
   * Draw a single territory with optional hover/selection effects
   */
  function drawTerritory(territory: Territory, isHovered = false, isSelected = false): void {
    if (!ctx.value) return

    const baseColor = territory.color ?? NEUTRAL_COLOR

    // Draw each cell of the territory
    territory.cells.forEach(cell => {
      // Fill with territory color
      ctx.value!.fillStyle = baseColor
      ctx.value!.fillRect(
        cell.x * CELL_SIZE + 1,
        cell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )

      // Hover effect overlay
      if (isHovered && !territory.ownerId) {
        ctx.value!.fillStyle = HOVER_OVERLAY_COLOR
        ctx.value!.fillRect(
          cell.x * CELL_SIZE + 1,
          cell.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        )
      }

      // Selection glow effect
      if (isSelected) {
        ctx.value!.fillStyle = SELECTED_GLOW_COLOR
        ctx.value!.fillRect(
          cell.x * CELL_SIZE + 1,
          cell.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        )
      }
    })

    // Draw territory border for better visibility
    drawTerritoryBorder(territory, isSelected)
  }

  /**
   * Draw border around territory for visual distinction
   */
  function drawTerritoryBorder(territory: Territory, isSelected: boolean): void {
    if (!ctx.value) return

    const borderColor = isSelected ? '#ffffff' : (territory.color ?? '#555555')
    ctx.value.strokeStyle = borderColor
    ctx.value.lineWidth = isSelected ? 3 : 2

    // Find edge cells and draw border segments
    territory.cells.forEach(cell => {
      const { x, y } = cell
      const hasTop = territory.cells.some(c => c.x === x && c.y === y - 1)
      const hasBottom = territory.cells.some(c => c.x === x && c.y === y + 1)
      const hasLeft = territory.cells.some(c => c.x === x - 1 && c.y === y)
      const hasRight = territory.cells.some(c => c.x === x + 1 && c.y === y)

      const px = x * CELL_SIZE
      const py = y * CELL_SIZE

      // Draw border on edges without neighbors
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
   * Draw all territories with hover and selection states
   */
  function drawAllTerritories(
    territories: Territory[],
    hoveredId: string | null,
    selectedId: string | null
  ): void {
    territories.forEach(territory => {
      const isHovered = territory.id === hoveredId
      const isSelected = territory.id === selectedId
      drawTerritory(territory, isHovered, isSelected)
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

    // Check bounds
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return null
    }

    return { x, y }
  }

  return {
    ctx,
    drawGrid,
    drawTerritory,
    drawAllTerritories,
    clearCanvas,
    getCellFromCoords
  }
}
