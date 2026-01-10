/**
 * Default Avatar Generator
 * Creates SVG avatar with first letter of pseudo and assigned color
 */

import { PLAYER_COLORS } from 'shared/schemas'

export function generateDefaultAvatar(pseudo: string, colorIndex: number): string {
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]
  const letter = pseudo.charAt(0).toUpperCase()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70">
    <circle cx="35" cy="35" r="35" fill="${color}"/>
    <text x="35" y="45" text-anchor="middle" fill="#0a0a0a" font-size="32" font-weight="bold" font-family="system-ui, sans-serif">${letter}</text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export type PlayerColor = typeof PLAYER_COLORS[number]

export function getPlayerColor(colorIndex: number): PlayerColor {
  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]
}
