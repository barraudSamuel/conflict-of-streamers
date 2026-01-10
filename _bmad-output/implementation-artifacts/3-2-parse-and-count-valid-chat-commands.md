# Story 3.2: Parse and Count Valid Chat Commands

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system (backend)**,
I want **to parse Twitch chat messages and count valid commands ("ATTACK [territoire]", "DEFEND [territoire]")**,
So that **viewer participation is accurately tracked during battles (FR13, NFR13)**.

## Acceptance Criteria

1. **Given** the system is connected to a Twitch chat
   **When** a viewer sends a message containing a valid command
   **Then** the system parses the message with case-insensitive matching (NFR13)
   **And** the system trims whitespace from the message (NFR13)
   **And** the system validates the command format ("ATTACK [territoire]" or "DEFEND [territoire]")
   **And** the system increments the message counter for that battle

2. **Given** a viewer sends an invalid or malformed message
   **When** the system receives the message
   **Then** the system handles it gracefully without crashing (NFR10)
   **And** the invalid message is ignored (not counted)
   **And** no error is shown to viewers (silent filtering)

3. **Given** a valid command is parsed
   **When** the command includes a territory identifier
   **Then** the system extracts:
   - Command type: "ATTACK" or "DEFEND"
   - Territory identifier (case-insensitive)
   - Username of the viewer who sent the command
   - Timestamp of when the command was received

4. **Given** the system is counting commands for a battle
   **When** multiple commands are received
   **Then** each valid command increments the appropriate counter (attack or defend)
   **And** the counters are accessible for the battle calculation (Story 4.6)

5. **Given** the system parses commands with variations
   **When** commands use common abbreviations or typos
   **Then** the system recognizes:
   - "ATTACK", "ATK", "attack", "Attack", "ATTAQUE"
   - "DEFEND", "DEF", "defend", "Defend", "DEFENSE"
   **And** whitespace is trimmed: " ATTACK T5 " is valid
   **And** partial matches in longer messages are accepted: "go ATTACK T5 now!" is valid

## Tasks / Subtasks

- [x] Task 1: Create command parsing types (AC: 3)
  - [x] Add `CommandType` type to `shared/src/types/twitch.ts`
  - [x] Add `ParsedCommand` interface with command, territory, username, timestamp
  - [x] Add `TwitchBattleStats` interface for battle counting
  - [x] Add `CommandCallback` type for listener pattern
  - [x] Export from `shared/src/types/index.ts`

- [x] Task 2: Implement command parser function (AC: 1, 2, 5)
  - [x] Create `backend/src/utils/twitchCommandParser.ts`
  - [x] Implement `parseCommand(message: string): ParsedCommand | null`
  - [x] Use regex for case-insensitive matching with variations (ATK/ATTAQUE, DEF/DEFENSE/DEFENCE)
  - [x] Extract territory identifier from command
  - [x] Handle gracefully malformed messages (return null)

- [x] Task 3: Create battle counter class (AC: 4)
  - [x] Create `backend/src/managers/BattleCounter.ts`
  - [x] Implement `BattleCounterClass` with Map<battleId, TwitchBattleStats>
  - [x] Methods: `startBattle()`, `addCommand()`, `getStats()`, `endBattle()`, `hasBattle()`, `getActiveBattles()`
  - [x] Track: attackCount, defendCount, commands array

- [x] Task 4: Integrate parser with TwitchManager (AC: 1, 2, 3)
  - [x] Import `parseCommand` in TwitchManager
  - [x] Call parser on each received message
  - [x] Notify registered callbacks with parsed commands
  - [x] Log parsed commands at debug level

- [x] Task 5: Create callback mechanism for real-time updates (AC: 4)
  - [x] Add `onCommand` callback to TwitchManager
  - [x] Add `offCommand` to remove callbacks
  - [x] Add `notifyCommandCallbacks` private method
  - [x] This enables Story 3.3 (unique users) and Story 4.4 (dual counting)

- [x] Task 6: Build verification and testing
  - [x] Run `npm run build:shared` - verified no TypeScript errors
  - [x] Run `npm run build:backend` - verified no TypeScript errors
  - [x] Unit tests for `parseCommand` function (28 tests passing)
  - [x] Unit tests for `BattleCounter` class (14 tests passing)
  - [x] Total: 42 tests passing

## Dev Notes

### Critical Architecture Requirements

**NFR13 - Parsing Tolérant:**
- Case-insensitive: "ATTACK", "attack", "Attack" all valid
- Whitespace trimming: " ATTACK T5 " → valid
- Variations: "ATK", "DEF", "ATTAQUE", "DEFENSE" accepted
- Partial matches: "go attack T5!" → valid

**NFR10 - Graceful Handling:**
- NEVER crash on malformed messages
- Return null for unparseable messages
- Log at debug level (not error) for invalid commands
- Silent filtering - viewers don't see validation errors

**AD-3 - Dual Counting Pattern:**
- Cette story crée les compteurs qui seront utilisés par:
  - Story 3.3: Comptage users uniques
  - Story 4.4: Dual counting system (optimiste + authoritative)
  - Story 4.6: Calcul force bataille

**AR18 - tmi.js Integration:**
- Parser receives messages from TwitchManager
- Messages include: channel, tags (username, display-name), message text

### Command Parsing Regex Pattern

```typescript
// backend/src/utils/twitchCommandParser.ts
import type { ParsedCommand, CommandType } from 'shared/types'

// Regex patterns for command recognition
const ATTACK_PATTERN = /\b(attack|atk|attaque)\s+(\w+)/i
const DEFEND_PATTERN = /\b(defend|def|defense|defence)\s+(\w+)/i

export function parseCommand(
  message: string,
  username: string,
  displayName: string
): ParsedCommand | null {
  const trimmed = message.trim()

  // Try attack pattern first
  const attackMatch = trimmed.match(ATTACK_PATTERN)
  if (attackMatch) {
    return {
      type: 'ATTACK',
      territoryId: attackMatch[2].toUpperCase(), // Normalize territory ID
      username,
      displayName,
      timestamp: Date.now(),
      rawMessage: message
    }
  }

  // Try defend pattern
  const defendMatch = trimmed.match(DEFEND_PATTERN)
  if (defendMatch) {
    return {
      type: 'DEFEND',
      territoryId: defendMatch[2].toUpperCase(),
      username,
      displayName,
      timestamp: Date.now(),
      rawMessage: message
    }
  }

  // No valid command found
  return null
}
```

### Shared Types Extension

```typescript
// shared/src/types/twitch.ts - ADD to existing file

export type CommandType = 'ATTACK' | 'DEFEND'

export interface ParsedCommand {
  type: CommandType
  territoryId: string
  username: string
  displayName: string
  timestamp: number
  rawMessage: string
}

// Note: Named TwitchBattleStats to avoid conflict with existing BattleStats in battle.ts
export interface TwitchBattleStats {
  battleId: string
  attackCount: number
  defendCount: number
  commands: ParsedCommand[]
  startedAt: number
}
```

### Battle Counter Implementation

```typescript
// backend/src/managers/BattleCounter.ts
import { logger } from '../utils/logger'
import type { ParsedCommand, TwitchBattleStats } from 'shared/types'

class BattleCounterClass {
  private battles = new Map<string, TwitchBattleStats>()

  /**
   * Initialize counter for a new battle
   */
  startBattle(battleId: string): void {
    if (this.battles.has(battleId)) {
      logger.warn({ battleId }, 'Battle already exists, resetting')
    }

    this.battles.set(battleId, {
      battleId,
      attackCount: 0,
      defendCount: 0,
      commands: [],
      startedAt: Date.now()
    })

    logger.info({ battleId }, 'Battle counter initialized')
  }

  /**
   * Add a parsed command to the battle
   */
  addCommand(battleId: string, command: ParsedCommand): void {
    const battle = this.battles.get(battleId)
    if (!battle) {
      logger.debug({ battleId, command }, 'Command received for unknown battle')
      return
    }

    // Increment appropriate counter
    if (command.type === 'ATTACK') {
      battle.attackCount++
    } else {
      battle.defendCount++
    }

    // Store command for later analysis (top 5 spammers, etc.)
    battle.commands.push(command)

    logger.debug({
      battleId,
      type: command.type,
      username: command.username,
      attackCount: battle.attackCount,
      defendCount: battle.defendCount
    }, 'Command counted')
  }

  /**
   * Get current stats for a battle
   */
  getStats(battleId: string): TwitchBattleStats | null {
    return this.battles.get(battleId) ?? null
  }

  /**
   * End battle and return final stats
   */
  endBattle(battleId: string): TwitchBattleStats | null {
    const stats = this.battles.get(battleId)
    if (stats) {
      this.battles.delete(battleId)
      logger.info({
        battleId,
        attackCount: stats.attackCount,
        defendCount: stats.defendCount,
        totalCommands: stats.commands.length,
        durationMs: Date.now() - stats.startedAt
      }, 'Battle ended')
    }
    return stats ?? null
  }

  /**
   * Check if battle is active
   */
  hasBattle(battleId: string): boolean {
    return this.battles.has(battleId)
  }
}

export const battleCounter = new BattleCounterClass()
```

### TwitchManager Integration

```typescript
// Dans TwitchManager.ts - modifier le handler 'message'
import { parseCommand } from '../utils/twitchCommandParser'
import { battleCounter } from './BattleCounter'

// Add callback type
type CommandCallback = (roomCode: string, command: ParsedCommand) => void

class TwitchManagerClass {
  private clients = new Map<string, tmi.Client>()
  private commandCallbacks: CommandCallback[] = []

  /**
   * Register callback for parsed commands
   * Used by Story 3.3 (unique users) and Story 4.4 (dual counting)
   */
  onCommand(callback: CommandCallback): void {
    this.commandCallbacks.push(callback)
  }

  async connect(roomCode: string, channelName: string): Promise<void> {
    // ... existing connection code ...

    client.on('message', (channel, tags, message, self) => {
      if (self) return

      const username = tags.username || 'anonymous'
      const displayName = tags['display-name'] || username

      // Parse the command
      const command = parseCommand(message, username, displayName)

      if (command) {
        logger.debug({
          roomCode,
          channel,
          command: command.type,
          territory: command.territoryId,
          username: command.displayName
        }, 'Valid Twitch command parsed')

        // Notify all registered callbacks
        this.commandCallbacks.forEach(cb => cb(roomCode, command))
      }
      // Invalid commands are silently ignored (NFR10)
    })

    // ... rest of connection code ...
  }
}
```

### Project Structure Notes

**CREATE:**
```
backend/src/utils/twitchCommandParser.ts
backend/src/managers/BattleCounter.ts
```

**MODIFY:**
```
shared/src/types/twitch.ts (add CommandType, ParsedCommand, BattleStats)
shared/src/types/index.ts (export new types)
backend/src/managers/TwitchManager.ts (integrate parser, add callbacks)
```

### Testing Checklist

**Unit Tests for parseCommand:**
```typescript
// backend/src/utils/twitchCommandParser.test.ts
describe('parseCommand', () => {
  it('parses "ATTACK T5" correctly', () => {
    const result = parseCommand('ATTACK T5', 'user1', 'User1')
    expect(result).toEqual({
      type: 'ATTACK',
      territoryId: 'T5',
      username: 'user1',
      displayName: 'User1',
      timestamp: expect.any(Number),
      rawMessage: 'ATTACK T5'
    })
  })

  it('handles case-insensitive "attack t5"', () => {
    const result = parseCommand('attack t5', 'user1', 'User1')
    expect(result?.type).toBe('ATTACK')
    expect(result?.territoryId).toBe('T5') // Normalized uppercase
  })

  it('handles "ATK T5" abbreviation', () => {
    const result = parseCommand('ATK T5', 'user1', 'User1')
    expect(result?.type).toBe('ATTACK')
  })

  it('handles whitespace " ATTACK T5 "', () => {
    const result = parseCommand(' ATTACK T5 ', 'user1', 'User1')
    expect(result?.type).toBe('ATTACK')
    expect(result?.territoryId).toBe('T5')
  })

  it('handles partial match "go attack T5 now!"', () => {
    const result = parseCommand('go attack T5 now!', 'user1', 'User1')
    expect(result?.type).toBe('ATTACK')
    expect(result?.territoryId).toBe('T5')
  })

  it('handles "DEFEND T3" correctly', () => {
    const result = parseCommand('DEFEND T3', 'user1', 'User1')
    expect(result?.type).toBe('DEFEND')
    expect(result?.territoryId).toBe('T3')
  })

  it('handles "DEF T3" abbreviation', () => {
    const result = parseCommand('DEF T3', 'user1', 'User1')
    expect(result?.type).toBe('DEFEND')
  })

  it('returns null for invalid command "hello"', () => {
    const result = parseCommand('hello', 'user1', 'User1')
    expect(result).toBeNull()
  })

  it('returns null for command without territory "ATTACK"', () => {
    const result = parseCommand('ATTACK', 'user1', 'User1')
    expect(result).toBeNull()
  })

  it('handles French "ATTAQUE T5"', () => {
    const result = parseCommand('ATTAQUE T5', 'user1', 'User1')
    expect(result?.type).toBe('ATTACK')
  })

  it('handles "DEFENSE T3"', () => {
    const result = parseCommand('DEFENSE T3', 'user1', 'User1')
    expect(result?.type).toBe('DEFEND')
  })
})
```

**Manual Testing:**
- [ ] Connect to Twitch channel with game started
- [ ] Send "ATTACK T5" in chat → verify parsed in logs
- [ ] Send "defend t3" in chat → verify parsed (case-insensitive)
- [ ] Send "hello world" → verify no error, silently ignored
- [ ] Send " ATK T5 " → verify parsed with trimmed whitespace
- [ ] Send "let's ATK T5!" → verify partial match works

### Edge Cases to Handle

**Empty or whitespace-only messages:**
```typescript
if (!message.trim()) return null
```

**Territory identifiers:**
- Accept alphanumeric: "T5", "Territory1", "zone_a"
- Normalize to uppercase: "t5" → "T5"
- Use `\w+` pattern (word characters)

**Emojis and special characters:**
- Parse around them: "🔥 ATTACK T5 🔥" → valid
- Regex word boundaries `\b` handle this

**Multiple commands in one message:**
- "ATTACK T5 DEFEND T3" → only first match (attack)
- Documented behavior, consistent

### Performance Considerations

**Regex Performance:**
- Compiled once, reused per message
- Simple patterns, O(n) where n = message length
- No backtracking issues with current patterns

**Memory for BattleStats:**
- Commands array grows during battle
- ~100 bytes per command × 1000 commands/battle = ~100KB
- Acceptable for 30-second battles
- Cleared after battle ends

### Dependencies on Other Stories

**Provides to:**
- Story 3.3: ParsedCommand includes username for unique user tracking
- Story 4.4: BattleCounter provides counts for dual counting system
- Story 4.6: BattleStats provides final counts for force calculation
- Story 4.8: Commands array enables top 5 spammers leaderboard

**Depends on:**
- Story 3.1: TwitchManager provides raw messages ✅ DONE

### References

- [FR13] Compter messages chat avec commandes valides - epics.md#Epic-3
- [NFR10] Parsing Twitch graceful sans crash - architecture.md#NFR10
- [NFR13] Parsing tolérant (casse, espaces) - architecture.md#NFR13
- [AD-3] Dual Counting for Twitch Delay Compensation - architecture.md#AD-3
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.2]
- [Source: _bmad-output/project-context.md#Twitch-IRC-Parsing]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests passing: 42 tests (28 parser + 14 counter)
- Build verification: shared and backend compile without errors

### Completion Notes List

- Implemented tolerant command parsing supporting ATTACK/ATK/ATTAQUE and DEFEND/DEF/DEFENSE/DEFENCE variations
- Case-insensitive matching with whitespace trimming per NFR13
- Graceful handling of invalid messages (returns null, no crashes) per NFR10
- Territory IDs normalized to uppercase for consistency
- BattleCounter singleton tracks per-battle command counts with full command history
- Callback mechanism enables Story 3.3 (unique users) and Story 4.4 (dual counting)
- Comprehensive unit test coverage with vitest framework
- Note: Used `TwitchBattleStats` instead of `BattleStats` to avoid conflict with existing battle.ts type

**Code Review Fixes Applied:**
- Added MAX_COMMANDS_PER_BATTLE (2000) limit to prevent memory issues
- Added MAX_TERRITORY_ID_LENGTH (20) validation to prevent abuse
- Added TwitchManager integration tests (9 tests)
- Mocked logger in tests to silence output
- Added JSDoc documentation to CommandType
- Total tests: 52 passing (29 parser + 14 counter + 9 TwitchManager)

### File List

**Created:**
- `shared/src/types/twitch.ts` - Added CommandType, ParsedCommand, TwitchBattleStats, CommandCallback types
- `backend/src/utils/twitchCommandParser.ts` - Command parsing function with regex patterns
- `backend/src/managers/BattleCounter.ts` - Battle command counting singleton
- `backend/src/utils/twitchCommandParser.test.ts` - 29 unit tests for parser
- `backend/src/managers/BattleCounter.test.ts` - 14 unit tests for counter
- `backend/src/managers/TwitchManager.test.ts` - 9 integration tests for callbacks
- `backend/vitest.config.ts` - Vitest configuration

**Modified:**
- `shared/src/types/index.ts` - Added exports for new Twitch types
- `backend/src/managers/TwitchManager.ts` - Integrated parser and callback mechanism
- `backend/package.json` - Added vitest dependency and test scripts
