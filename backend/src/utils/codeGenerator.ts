/**
 * Room Code Generator
 * Generates unique, readable room codes
 * Excludes confusing characters: I, O, 0, 1
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 6): string {
  return Array.from(
    { length },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
