/**
 * Twitch Command Parser (Story 3.2)
 * Parses Twitch chat messages to extract valid game commands
 *
 * Supports:
 * - Case-insensitive matching (NFR13)
 * - Variations: ATTACK/ATK/ATTAQUE, DEFEND/DEF/DEFENSE/DEFENCE
 * - Whitespace trimming
 * - Partial matches in longer messages
 */

import type { ParsedCommand, CommandType } from 'shared/types'

/**
 * Regex patterns for command recognition
 * Uses word boundary \b to allow partial matches like "go attack T5!"
 * Uses \s+ to require at least one space before territory
 * Uses \w+ to capture alphanumeric territory identifiers
 */
const ATTACK_PATTERN = /\b(attack|atk|attaque)\s+(\w+)/i
const DEFEND_PATTERN = /\b(defend|def|defense|defence)\s+(\w+)/i

/** Maximum length for territory identifiers to prevent abuse */
const MAX_TERRITORY_ID_LENGTH = 20

/**
 * Parse a Twitch chat message to extract a valid game command
 *
 * @param message - The raw chat message text
 * @param username - Twitch username (login name)
 * @param displayName - Twitch display name
 * @returns ParsedCommand if valid command found, null otherwise
 *
 * @example
 * parseCommand('ATTACK T5', 'user1', 'User1')
 * // Returns: { type: 'ATTACK', territoryId: 'T5', ... }
 *
 * @example
 * parseCommand('hello world', 'user1', 'User1')
 * // Returns: null (no valid command)
 */
export function parseCommand(
  message: string,
  username: string,
  displayName: string
): ParsedCommand | null {
  // Handle empty or whitespace-only messages (NFR10)
  const trimmed = message.trim()
  if (!trimmed) {
    return null
  }

  // Try attack pattern first
  const attackMatch = trimmed.match(ATTACK_PATTERN)
  if (attackMatch && attackMatch[2].length <= MAX_TERRITORY_ID_LENGTH) {
    return createParsedCommand('ATTACK', attackMatch[2], username, displayName, message)
  }

  // Try defend pattern
  const defendMatch = trimmed.match(DEFEND_PATTERN)
  if (defendMatch && defendMatch[2].length <= MAX_TERRITORY_ID_LENGTH) {
    return createParsedCommand('DEFEND', defendMatch[2], username, displayName, message)
  }

  // No valid command found - return null silently (NFR10)
  return null
}

/**
 * Helper to create a ParsedCommand with consistent structure
 */
function createParsedCommand(
  type: CommandType,
  territoryId: string,
  username: string,
  displayName: string,
  rawMessage: string
): ParsedCommand {
  return {
    type,
    territoryId: territoryId.toUpperCase(), // Normalize territory ID
    username,
    displayName,
    timestamp: Date.now(),
    rawMessage
  }
}
