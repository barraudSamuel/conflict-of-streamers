import type { Territory, Cell } from '../types'

/**
 * Predefined territories for the 20x20 game grid
 *
 * Territory distribution:
 * - 6 small territories (3-5 cells)
 * - 8 medium territories (6-10 cells)
 * - 6 large territories (11-20 cells)
 *
 * Total: 20 territories covering ALL 400 cells
 * Each territory has organic shapes (not perfect rectangles)
 */

// Helper to create cells
function cells(...coords: [number, number][]): Cell[] {
  return coords.map(([x, y]) => ({ x, y }))
}

// Base territory data covering the entire 20x20 grid (400 cells)
export const TERRITORY_DATA: Territory[] = [
  // === ROW 0-4: NORTHERN TERRITORIES ===

  // T1 - Glacier (large - 20 cells) - Top left
  {
    id: 'T1',
    name: 'Glacier',
    size: 'large',
    cells: cells(
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [0, 2], [1, 2], [2, 2], [3, 2],
      [0, 3], [1, 3], [2, 3],
      [0, 4], [1, 4], [0, 5]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T2', 'T6', 'T7']
  },

  // T2 - Toundra (medium - 10 cells) - Top center-left
  {
    id: 'T2',
    name: 'Toundra',
    size: 'medium',
    cells: cells(
      [5, 0], [6, 0], [7, 0],
      [5, 1], [6, 1], [7, 1],
      [4, 2], [5, 2], [6, 2],
      [5, 3]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T1', 'T3', 'T7']
  },

  // T3 - Fjord (small - 5 cells) - Top center
  {
    id: 'T3',
    name: 'Fjord',
    size: 'small',
    cells: cells(
      [8, 0], [9, 0],
      [7, 2], [8, 1], [9, 1]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T2', 'T4', 'T8']
  },

  // T4 - Montagne (large - 20 cells) - Top center-right
  {
    id: 'T4',
    name: 'Montagne',
    size: 'large',
    cells: cells(
      [10, 0], [11, 0], [12, 0], [13, 0],
      [10, 1], [11, 1], [12, 1], [13, 1],
      [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],
      [9, 3], [10, 3], [11, 3], [12, 3],
      [10, 4], [11, 4], [12, 4]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T3', 'T5', 'T8', 'T9']
  },

  // T5 - Nordique (medium - 10 cells) - Top right
  {
    id: 'T5',
    name: 'Nordique',
    size: 'medium',
    cells: cells(
      [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
      [14, 1], [15, 1], [16, 1], [17, 1],
      [14, 2], [15, 2] // Added missing cells
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T4', 'T9', 'T10']
  },

  // === ROW 4-8: UPPER MIDDLE TERRITORIES ===

  // T6 - Foret (medium - 10 cells) - Left side
  {
    id: 'T6',
    name: 'Foret',
    size: 'medium',
    cells: cells(
      [1, 5], [2, 4], [3, 3], [4, 3],
      [2, 5], [3, 4], [4, 4],
      [2, 6], [3, 5], [3, 6]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T1', 'T7', 'T11', 'T12']
  },

  // T7 - Plaine (large - 20 cells) - Center-left
  {
    id: 'T7',
    name: 'Plaine',
    size: 'large',
    cells: cells(
      [6, 3], [7, 3], [8, 3],
      [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
      [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
      [4, 6], [5, 6], [6, 6], [7, 6],
      [5, 7], [6, 7]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T1', 'T2', 'T6', 'T8', 'T12', 'T13']
  },

  // T8 - Colline (medium - 10 cells) - Center
  {
    id: 'T8',
    name: 'Colline',
    size: 'medium',
    cells: cells(
      [13, 2], [13, 3], [14, 3],
      [13, 4], [14, 4], [15, 4],
      [10, 5], [11, 5], [12, 5], // Added missing cells
      [13, 5], [14, 5], [15, 5],
      [14, 6]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T3', 'T4', 'T9', 'T13', 'T14']
  },

  // T9 - Canyon (small - 5 cells) - Right
  {
    id: 'T9',
    name: 'Canyon',
    size: 'small',
    cells: cells(
      [18, 1], [19, 1],
      [18, 2], [19, 2],
      [19, 3]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T4', 'T5', 'T10']
  },

  // T10 - Oasis (large - 20 cells) - Right side
  {
    id: 'T10',
    name: 'Oasis',
    size: 'large',
    cells: cells(
      [16, 2], [17, 2],
      [15, 3], [16, 3], [17, 3], [18, 3],
      [16, 4], [17, 4], [18, 4], [19, 4],
      [16, 5], [17, 5], [18, 5], [19, 5],
      [16, 6], [17, 6], [18, 6], [19, 6],
      [18, 7], [19, 7]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T5', 'T9', 'T14', 'T15']
  },

  // === ROW 8-12: MIDDLE TERRITORIES ===

  // T11 - Marais (small - 4 cells) - Left edge
  {
    id: 'T11',
    name: 'Marais',
    size: 'small',
    cells: cells(
      [0, 6], [1, 6],
      [0, 7], [1, 7]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T6', 'T12', 'T16']
  },

  // T12 - Vallee (medium - 10 cells) - Lower left
  {
    id: 'T12',
    name: 'Vallee',
    size: 'medium',
    cells: cells(
      [2, 7], [3, 7], [4, 7],
      [0, 8], [1, 8], [2, 8], [3, 8], [4, 8],
      [0, 9], [1, 9]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T6', 'T7', 'T11', 'T13', 'T16', 'T17']
  },

  // T13 - Plateau (large - 20 cells) - Center
  {
    id: 'T13',
    name: 'Plateau',
    size: 'large',
    cells: cells(
      [7, 7], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6],
      [7, 8], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7],
      [8, 8], [9, 8], [10, 8], [11, 8], [12, 8],
      [9, 9]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T7', 'T8', 'T12', 'T14', 'T17', 'T18']
  },

  // T14 - Desert (medium - 8 cells) - Center-right
  {
    id: 'T14',
    name: 'Desert',
    size: 'medium',
    cells: cells(
      [15, 6], [15, 7], [16, 7], [17, 7],
      [14, 7], [14, 8], [15, 8], [16, 8]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T8', 'T10', 'T13', 'T15', 'T18']
  },

  // T15 - Steppe (medium - 10 cells) - Right side
  {
    id: 'T15',
    name: 'Steppe',
    size: 'medium',
    cells: cells(
      [17, 8], [18, 8], [19, 8],
      [17, 9], [18, 9], [19, 9],
      [18, 10], [19, 10],
      [19, 11], [19, 12]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T10', 'T14', 'T18', 'T19']
  },

  // === ROW 12-16: LOWER MIDDLE TERRITORIES ===

  // T16 - Lac (small - 5 cells) - Bottom left corner
  {
    id: 'T16',
    name: 'Lac',
    size: 'small',
    cells: cells(
      [0, 10], [1, 10],
      [0, 11], [1, 11],
      [0, 12]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T11', 'T12', 'T17', 'T20']
  },

  // T17 - Jungle (large - 20 cells) - Bottom center-left
  {
    id: 'T17',
    name: 'Jungle',
    size: 'large',
    cells: cells(
      [2, 9], [3, 9], [4, 9], [5, 8], [6, 8],
      [2, 10], [3, 10], [4, 10], [5, 9], [6, 9], [7, 9], [8, 9],
      [2, 11], [3, 11], [4, 11], [5, 10], [6, 10], [7, 10],
      [5, 11], [6, 11]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T12', 'T13', 'T16', 'T18', 'T20']
  },

  // T18 - Savane (medium - 10 cells) - Bottom center
  {
    id: 'T18',
    name: 'Savane',
    size: 'medium',
    cells: cells(
      [10, 9], [11, 9], [12, 9], [13, 8], [13, 9],
      [10, 10], [11, 10], [12, 10], [13, 10],
      [14, 9]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T13', 'T14', 'T15', 'T17', 'T19']
  },

  // T19 - Volcan (medium - 10 cells) - Bottom center-right
  {
    id: 'T19',
    name: 'Volcan',
    size: 'medium',
    cells: cells(
      [15, 9], [16, 9],
      [14, 10], [15, 10], [16, 10], [17, 10],
      [14, 11], [15, 11], [16, 11], [17, 11]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T15', 'T18', 'T20']
  },

  // === ROW 16-20: SOUTHERN TERRITORIES ===

  // T20 - Archipel (large - 173 cells) - Entire bottom section
  // This large territory covers the remaining southern portion of the map
  {
    id: 'T20',
    name: 'Archipel',
    size: 'large',
    cells: cells(
      // Row 12
      [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 11], [8, 10], [9, 10],
      [7, 12], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11],
      [8, 12], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 11], [18, 12],
      // Row 13
      [0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13],
      [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13],
      // Row 14
      [0, 14], [1, 14], [2, 14], [3, 14], [4, 14], [5, 14], [6, 14], [7, 14], [8, 14], [9, 14],
      [10, 14], [11, 14], [12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14], [18, 14], [19, 14],
      // Row 15
      [0, 15], [1, 15], [2, 15], [3, 15], [4, 15], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15],
      [10, 15], [11, 15], [12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15], [19, 15],
      // Row 16
      [0, 16], [1, 16], [2, 16], [3, 16], [4, 16], [5, 16], [6, 16], [7, 16], [8, 16], [9, 16],
      [10, 16], [11, 16], [12, 16], [13, 16], [14, 16], [15, 16], [16, 16], [17, 16], [18, 16], [19, 16],
      // Row 17
      [0, 17], [1, 17], [2, 17], [3, 17], [4, 17], [5, 17], [6, 17], [7, 17], [8, 17], [9, 17],
      [10, 17], [11, 17], [12, 17], [13, 17], [14, 17], [15, 17], [16, 17], [17, 17], [18, 17], [19, 17],
      // Row 18
      [0, 18], [1, 18], [2, 18], [3, 18], [4, 18], [5, 18], [6, 18], [7, 18], [8, 18], [9, 18],
      [10, 18], [11, 18], [12, 18], [13, 18], [14, 18], [15, 18], [16, 18], [17, 18], [18, 18], [19, 18],
      // Row 19
      [0, 19], [1, 19], [2, 19], [3, 19], [4, 19], [5, 19], [6, 19], [7, 19], [8, 19], [9, 19],
      [10, 19], [11, 19], [12, 19], [13, 19], [14, 19], [15, 19], [16, 19], [17, 19], [18, 19], [19, 19]
    ),
    ownerId: null,
    color: null,
    adjacentTerritoryIds: ['T16', 'T17', 'T18', 'T19', 'T15']
  }
]

/**
 * Get a fresh copy of all territories (for initializing a new game)
 * All territories start unowned with neutral color
 */
export function getInitialTerritories(): Territory[] {
  return TERRITORY_DATA.map(t => ({
    ...t,
    ownerId: null,
    color: null
  }))
}

/**
 * Find which territory contains a given cell coordinate
 */
export function findTerritoryByCell(x: number, y: number, territories: Territory[]): Territory | undefined {
  return territories.find(t =>
    t.cells.some(cell => cell.x === x && cell.y === y)
  )
}

/**
 * Check if two territories are adjacent
 */
export function areTerritoriesAdjacent(t1: Territory, t2: Territory): boolean {
  return t1.adjacentTerritoryIds.includes(t2.id)
}

/**
 * Get total cell count for statistics
 */
export function getTotalCellCount(): number {
  return TERRITORY_DATA.reduce((sum, t) => sum + t.cells.length, 0)
}

// Grid constants
export const GRID_SIZE = 20 // 20x20 grid
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE // 400 cells
