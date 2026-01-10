# Story 3.3: Identify Unique Twitch Users

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system (backend)**,
I want **to identify and track unique Twitch users participating in battles via their pseudos**,
So that **the balancing formula can use unique user counts (FR14, FR21)**.

## Acceptance Criteria

1. **Given** the system is receiving valid chat commands during a battle
   **When** a user sends their first command
   **Then** the system stores their Twitch pseudo as a unique participant
   **And** the unique user count increments by 1

2. **Given** a user has already participated in a battle
   **When** the same user sends additional commands
   **Then** the system recognizes them as the same user (no duplicate counting)
   **And** the message count increases but unique user count stays the same

3. **Given** a battle is in progress with multiple participants
   **When** different users send commands
   **Then** each unique user is counted only once per battle
   **And** the system can differentiate between users by their Twitch username (case-insensitive)

4. **Given** a battle ends
   **When** final stats are calculated
   **Then** the system can report:
   - Total message count (attack commands)
   - Total message count (defend commands)
   - Total unique user count for attackers
   - Total unique user count for defenders
   **And** these values are available for the balancing formula (FR21)

5. **Given** the system tracks unique users
   **When** the same user participates in multiple battles
   **Then** they are counted as unique in each separate battle
   **And** counts do not persist across battles

6. **Given** commands are received during a battle
   **When** stats are requested
   **Then** the system can provide per-user message counts
   **And** this enables the top 5 spammers leaderboard (Story 4.8)

## Tasks / Subtasks

- [x] Task 1: Extend TwitchBattleStats type (AC: 4, 6)
  - [x] Add `uniqueAttackers: Set<string>` field
  - [x] Add `uniqueDefenders: Set<string>` field
  - [x] Add `userMessageCounts: Map<string, { attack: number, defend: number }>` for per-user tracking
  - [x] Update `shared/src/types/twitch.ts`

- [x] Task 2: Create UniqueUserTracker utility (AC: 1, 2, 3, 5)
  - [x] Create `backend/src/utils/uniqueUserTracker.ts`
  - [x] Implement `normalizeUsername()` and `isNewUniqueUser()` functions
  - [x] Return `true` if new user, `false` if already tracked
  - [x] Username normalization: lowercase, trimmed
  - [x] Per-battle isolation (users tracked per battleId)

- [x] Task 3: Update BattleCounter to track unique users (AC: 1, 2, 4, 6)
  - [x] Modify `BattleCounter.startBattle()` to initialize uniqueAttackers/uniqueDefenders Sets
  - [x] Modify `BattleCounter.addCommand()` to:
    - [x] Add username to appropriate Set (uniqueAttackers or uniqueDefenders)
    - [x] Update userMessageCounts Map
  - [x] Modify `BattleCounter.getStats()` to return unique user counts
  - [x] Modify `BattleCounter.endBattle()` to include unique counts in final stats

- [x] Task 4: Create helper methods for battle stats (AC: 4, 6)
  - [x] Add `getUniqueAttackerCount(battleId: string): number`
  - [x] Add `getUniqueDefenderCount(battleId: string): number`
  - [x] Add `getUserMessageCounts(battleId: string): Map<string, { attack: number, defend: number }>`
  - [x] Add `getTopSpammers(battleId: string, limit?: number): UserSpamStats[]`

- [x] Task 5: Create serializable stats types (AC: 4)
  - [x] Add `TwitchBattleStatsSerializable` type without Set/Map
  - [x] Implement `serializeStats(battleId: string)` method in BattleCounter
  - [x] Use arrays instead of Sets for JSON serialization
  - [x] This will be used for WebSocket events (Story 4.4)

- [x] Task 6: Build verification and testing
  - [x] Run `npm run build:shared` - verify no TypeScript errors
  - [x] Run `npm run build:backend` - verify no TypeScript errors
  - [x] Unit tests for UniqueUserTracker (15 tests - isolation, case-insensitivity)
  - [x] Update BattleCounter tests to verify unique user tracking (16 new tests)
  - [x] Integration test: multiple users, multiple battles (83 total tests passing)

## Dev Notes

### Critical Architecture Requirements

**FR14 - Identifier utilisateurs uniques via pseudos:**
- Chaque username Twitch doit etre compte une seule fois par bataille
- Le username est la source de verite (pas le displayName qui peut varier)
- Case-insensitive: "SamStreamer" et "samstreamer" = meme utilisateur

**FR21 - Formule d'equilibrage:**
```
Force = (messages x 0.7) + (users_uniques x bonus_territoire)
```
- La Story 4.6 utilisera les `uniqueAttackerCount` et `uniqueDefenderCount`
- Le bonus_territoire varie selon la taille du territoire (inversed stats)

**AD-3 - Dual Counting Pattern:**
- Cette story ajoute le tracking d'utilisateurs uniques au compteur authoritative
- Story 4.4 utilisera ces stats pour le dual counting system
- Les stats seront envoyees via WebSocket pour le feedback temps reel

### Unique User Tracking Implementation

```typescript
// backend/src/utils/uniqueUserTracker.ts
import type { CommandType } from 'shared/types'

/**
 * Normalize username for comparison
 * Twitch usernames are case-insensitive
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim()
}

/**
 * Track a user's participation in a battle
 * Returns true if this is a NEW unique user, false if already tracked
 */
export function isNewUniqueUser(
  existingUsers: Set<string>,
  username: string
): boolean {
  const normalized = normalizeUsername(username)
  if (existingUsers.has(normalized)) {
    return false
  }
  existingUsers.add(normalized)
  return true
}
```

### Extended TwitchBattleStats Type

```typescript
// shared/src/types/twitch.ts - EXTEND existing interface

/** Stats for counting commands during a battle - used by BattleCounter */
export interface TwitchBattleStats {
  /** Unique battle identifier */
  battleId: string
  /** Number of valid ATTACK commands received */
  attackCount: number
  /** Number of valid DEFEND commands received */
  defendCount: number
  /** All parsed commands for leaderboard analysis */
  commands: ParsedCommand[]
  /** Battle start timestamp (ms since epoch) */
  startedAt: number

  // Story 3.3: Unique user tracking
  /** Set of unique attacker usernames (normalized lowercase) */
  uniqueAttackers: Set<string>
  /** Set of unique defender usernames (normalized lowercase) */
  uniqueDefenders: Set<string>
  /** Per-user message counts for leaderboard */
  userMessageCounts: Map<string, UserCommandStats>
}

/** Per-user command statistics */
export interface UserCommandStats {
  /** Number of attack commands from this user */
  attackCount: number
  /** Number of defend commands from this user */
  defendCount: number
  /** Display name (for UI rendering) */
  displayName: string
}

/** User spam stats for top 5 leaderboard (Story 4.8) */
export interface UserSpamStats {
  username: string
  displayName: string
  totalMessages: number
  attackMessages: number
  defendMessages: number
}

/** Serializable version of TwitchBattleStats for JSON/WebSocket */
export interface TwitchBattleStatsSerializable {
  battleId: string
  attackCount: number
  defendCount: number
  uniqueAttackerCount: number
  uniqueDefenderCount: number
  uniqueAttackers: string[]
  uniqueDefenders: string[]
  userMessageCounts: { username: string; stats: UserCommandStats }[]
  startedAt: number
  commandCount: number
}
```

### Updated BattleCounter Implementation

```typescript
// backend/src/managers/BattleCounter.ts - MODIFY existing class

import { normalizeUsername } from '../utils/uniqueUserTracker'
import type {
  ParsedCommand,
  TwitchBattleStats,
  TwitchBattleStatsSerializable,
  UserSpamStats
} from 'shared/types'

class BattleCounterClass {
  private battles = new Map<string, TwitchBattleStats>()

  /**
   * Initialize counter for a new battle
   * Story 3.3: Now includes unique user tracking
   */
  startBattle(battleId: string): void {
    if (this.battles.has(battleId)) {
      logger.warn({ battleId }, 'Battle already exists, resetting counter')
    }

    this.battles.set(battleId, {
      battleId,
      attackCount: 0,
      defendCount: 0,
      commands: [],
      startedAt: Date.now(),
      // Story 3.3: Unique user tracking
      uniqueAttackers: new Set<string>(),
      uniqueDefenders: new Set<string>(),
      userMessageCounts: new Map()
    })

    logger.info({ battleId }, 'Battle counter initialized')
  }

  /**
   * Add a parsed command to the battle counter
   * Story 3.3: Now tracks unique users per command type
   */
  addCommand(battleId: string, command: ParsedCommand): void {
    const battle = this.battles.get(battleId)
    if (!battle) {
      logger.debug({ battleId, command: command.type }, 'Command received for unknown battle')
      return
    }

    const normalizedUsername = normalizeUsername(command.username)

    // Track unique user
    if (command.type === 'ATTACK') {
      battle.attackCount++
      battle.uniqueAttackers.add(normalizedUsername)
    } else {
      battle.defendCount++
      battle.uniqueDefenders.add(normalizedUsername)
    }

    // Update per-user message counts
    let userStats = battle.userMessageCounts.get(normalizedUsername)
    if (!userStats) {
      userStats = {
        attackCount: 0,
        defendCount: 0,
        displayName: command.displayName
      }
      battle.userMessageCounts.set(normalizedUsername, userStats)
    }

    if (command.type === 'ATTACK') {
      userStats.attackCount++
    } else {
      userStats.defendCount++
    }

    // Store command (with limit)
    if (battle.commands.length < MAX_COMMANDS_PER_BATTLE) {
      battle.commands.push(command)
    }

    logger.debug({
      battleId,
      type: command.type,
      username: command.username,
      attackCount: battle.attackCount,
      defendCount: battle.defendCount,
      uniqueAttackers: battle.uniqueAttackers.size,
      uniqueDefenders: battle.uniqueDefenders.size
    }, 'Command counted')
  }

  /**
   * Get unique attacker count for a battle
   */
  getUniqueAttackerCount(battleId: string): number {
    return this.battles.get(battleId)?.uniqueAttackers.size ?? 0
  }

  /**
   * Get unique defender count for a battle
   */
  getUniqueDefenderCount(battleId: string): number {
    return this.battles.get(battleId)?.uniqueDefenders.size ?? 0
  }

  /**
   * Get top spammers for leaderboard (Story 4.8)
   */
  getTopSpammers(battleId: string, limit: number = 5): UserSpamStats[] {
    const battle = this.battles.get(battleId)
    if (!battle) return []

    const spammers: UserSpamStats[] = []
    for (const [username, stats] of battle.userMessageCounts) {
      spammers.push({
        username,
        displayName: stats.displayName,
        totalMessages: stats.attackCount + stats.defendCount,
        attackMessages: stats.attackCount,
        defendMessages: stats.defendCount
      })
    }

    // Sort by total messages descending
    spammers.sort((a, b) => b.totalMessages - a.totalMessages)

    return spammers.slice(0, limit)
  }

  /**
   * Serialize battle stats for WebSocket transmission
   */
  serializeStats(battleId: string): TwitchBattleStatsSerializable | null {
    const battle = this.battles.get(battleId)
    if (!battle) return null

    return {
      battleId: battle.battleId,
      attackCount: battle.attackCount,
      defendCount: battle.defendCount,
      uniqueAttackerCount: battle.uniqueAttackers.size,
      uniqueDefenderCount: battle.uniqueDefenders.size,
      uniqueAttackers: Array.from(battle.uniqueAttackers),
      uniqueDefenders: Array.from(battle.uniqueDefenders),
      userMessageCounts: Array.from(battle.userMessageCounts.entries()).map(
        ([username, stats]) => ({ username, stats })
      ),
      startedAt: battle.startedAt,
      commandCount: battle.commands.length
    }
  }
}
```

### Project Structure Notes

**CREATE:**
```
backend/src/utils/uniqueUserTracker.ts
backend/src/utils/uniqueUserTracker.test.ts
```

**MODIFY:**
```
shared/src/types/twitch.ts (add UserCommandStats, UserSpamStats, TwitchBattleStatsSerializable, extend TwitchBattleStats)
shared/src/types/index.ts (export new types)
backend/src/managers/BattleCounter.ts (add unique user tracking, new methods)
backend/src/managers/BattleCounter.test.ts (add tests for unique users)
```

### Testing Checklist

**Unit Tests for UniqueUserTracker:**
```typescript
describe('normalizeUsername', () => {
  it('converts to lowercase', () => {
    expect(normalizeUsername('SamStreamer')).toBe('samstreamer')
  })

  it('trims whitespace', () => {
    expect(normalizeUsername(' sam ')).toBe('sam')
  })

  it('handles mixed case with spaces', () => {
    expect(normalizeUsername(' SamSTREAMER ')).toBe('samstreamer')
  })
})

describe('isNewUniqueUser', () => {
  it('returns true for new user', () => {
    const users = new Set<string>()
    expect(isNewUniqueUser(users, 'sam')).toBe(true)
    expect(users.has('sam')).toBe(true)
  })

  it('returns false for existing user', () => {
    const users = new Set<string>(['sam'])
    expect(isNewUniqueUser(users, 'sam')).toBe(false)
  })

  it('handles case-insensitive matching', () => {
    const users = new Set<string>()
    isNewUniqueUser(users, 'Sam')
    expect(isNewUniqueUser(users, 'SAM')).toBe(false)
    expect(isNewUniqueUser(users, 'sAm')).toBe(false)
  })
})
```

**Unit Tests for BattleCounter Unique Users:**
```typescript
describe('BattleCounter unique user tracking', () => {
  beforeEach(() => {
    battleCounter.startBattle('battle-1')
  })

  afterEach(() => {
    battleCounter.endBattle('battle-1')
  })

  it('counts unique attackers', () => {
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user2', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK')) // duplicate

    expect(battleCounter.getUniqueAttackerCount('battle-1')).toBe(2)
  })

  it('counts unique defenders', () => {
    battleCounter.addCommand('battle-1', mockCommand('user1', 'DEFEND'))
    battleCounter.addCommand('battle-1', mockCommand('user1', 'DEFEND')) // duplicate

    expect(battleCounter.getUniqueDefenderCount('battle-1')).toBe(1)
  })

  it('tracks users separately for attack and defend', () => {
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user1', 'DEFEND'))

    expect(battleCounter.getUniqueAttackerCount('battle-1')).toBe(1)
    expect(battleCounter.getUniqueDefenderCount('battle-1')).toBe(1)
  })

  it('normalizes usernames case-insensitively', () => {
    battleCounter.addCommand('battle-1', mockCommand('Sam', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('SAM', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('sAm', 'ATTACK'))

    expect(battleCounter.getUniqueAttackerCount('battle-1')).toBe(1)
  })

  it('isolates users between battles', () => {
    battleCounter.startBattle('battle-2')

    battleCounter.addCommand('battle-1', mockCommand('sam', 'ATTACK'))
    battleCounter.addCommand('battle-2', mockCommand('sam', 'ATTACK'))

    expect(battleCounter.getUniqueAttackerCount('battle-1')).toBe(1)
    expect(battleCounter.getUniqueAttackerCount('battle-2')).toBe(1)

    battleCounter.endBattle('battle-2')
  })

  it('returns top spammers sorted by total messages', () => {
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user2', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user2', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user3', 'ATTACK'))

    const topSpammers = battleCounter.getTopSpammers('battle-1', 2)

    expect(topSpammers.length).toBe(2)
    expect(topSpammers[0].username).toBe('user1')
    expect(topSpammers[0].totalMessages).toBe(3)
    expect(topSpammers[1].username).toBe('user2')
    expect(topSpammers[1].totalMessages).toBe(2)
  })

  it('serializes stats correctly', () => {
    battleCounter.addCommand('battle-1', mockCommand('user1', 'ATTACK'))
    battleCounter.addCommand('battle-1', mockCommand('user2', 'DEFEND'))

    const serialized = battleCounter.serializeStats('battle-1')

    expect(serialized).toBeDefined()
    expect(serialized?.uniqueAttackerCount).toBe(1)
    expect(serialized?.uniqueDefenderCount).toBe(1)
    expect(serialized?.uniqueAttackers).toContain('user1')
    expect(serialized?.uniqueDefenders).toContain('user2')
  })
})
```

### Edge Cases to Handle

**Username Edge Cases:**
- Empty username: Skip or use 'anonymous'
- Very long usernames: Twitch limits to 25 chars, but handle gracefully
- Special characters: Twitch allows letters, numbers, underscore
- Unicode: Twitch usernames are ASCII-only, but displayName may have unicode

**Battle Edge Cases:**
- Command for non-existent battle: Already handled in BattleCounter
- Same user switching sides: Track in both uniqueAttackers AND uniqueDefenders
- Battle ends while processing: Commands after endBattle() are ignored
- Very high volume: MAX_COMMANDS_PER_BATTLE (2000) limit already in place

### Performance Considerations

**Set vs Array for Unique Users:**
- Set.has() is O(1) average, O(n) worst case
- Set.add() is O(1) average
- Ideal for frequent lookups with ~1000 unique users per battle

**Map for Per-User Stats:**
- Map.get() is O(1) average
- Better than object for dynamic keys
- Maintains insertion order (useful for debugging)

**Memory Usage:**
- Set<string> with 1000 users: ~50KB
- Map with 1000 entries: ~100KB
- Acceptable for 30-second battles with active chats

### Dependencies on Other Stories

**Provides to:**
- Story 4.4: uniqueAttackerCount, uniqueDefenderCount for dual counting UI
- Story 4.6: Unique counts for force calculation formula
- Story 4.8: getTopSpammers() for battle summary leaderboard

**Depends on:**
- Story 3.1: TwitchManager provides raw messages (DONE)
- Story 3.2: BattleCounter exists with basic counting (DONE)

### Previous Story Learnings (3-1 and 3-2)

**From Story 3.1:**
- TwitchManager singleton pattern works well
- Callback mechanism for command processing is in place
- Integration with game:started event is established

**From Story 3.2:**
- BattleCounter singleton tracks per-battle stats
- MAX_COMMANDS_PER_BATTLE (2000) prevents memory issues
- Vitest is configured and working (52 tests passing)
- Logger should be mocked in tests to silence output

**Code Review Patterns Applied:**
- Always normalize usernames before comparison
- Use structured logging with context
- Provide serializable types for WebSocket transmission
- Keep test coverage comprehensive

### References

- [FR14] Identifier utilisateurs uniques via pseudos Twitch - epics.md#Story-3.3
- [FR21] Formule calcul force avec users uniques - epics.md#Story-4.6
- [AD-3] Dual Counting for Twitch Delay Compensation - architecture.md#AD-3
- [NFR13] Parsing tolerant (case-insensitive) - architecture.md#NFR13
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.3]
- [Source: _bmad-output/project-context.md]
- [Source: backend/src/managers/BattleCounter.ts]
- [Source: backend/src/managers/TwitchManager.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 83 tests passing (15 uniqueUserTracker + 29 twitchCommandParser + 9 TwitchManager + 30 BattleCounter)
- Build verification: shared and backend compile without TypeScript errors

### Completion Notes List

- Implemented unique user tracking for Twitch battles per FR14 and FR21
- Extended TwitchBattleStats with uniqueAttackers/uniqueDefenders Sets and userMessageCounts Map
- Created normalizeUsername() for case-insensitive username matching
- Added getUniqueAttackerCount(), getUniqueDefenderCount(), getUserMessageCounts(), getTopSpammers() methods
- Implemented serializeStats() for WebSocket-ready JSON serialization (converts Set/Map to arrays)
- New types: UserCommandStats, UserSpamStats, TwitchBattleStatsSerializable
- Comprehensive test coverage with 31 new tests (15 uniqueUserTracker + 16 BattleCounter unique user tracking)
- All acceptance criteria satisfied (AC 1-6)

### Change Log

- 2026-01-10: Story created with comprehensive implementation context
- 2026-01-10: Implementation completed - all 6 tasks done, 83 tests passing
- 2026-01-10: Code Review completed - Fixed 3 issues:
  - [HIGH-1] Removed unused isNewUniqueUser() function (dead code)
  - [MEDIUM-1] Added empty username validation in BattleCounter.addCommand()
  - [MEDIUM-2] Added tests for empty username edge case
  - Final: 78 tests passing (removed 7 dead code tests, added 2 edge case tests)

### File List

**Created:**
- backend/src/utils/uniqueUserTracker.ts
- backend/src/utils/uniqueUserTracker.test.ts

**Modified:**
- shared/src/types/twitch.ts (added UserCommandStats, UserSpamStats, TwitchBattleStatsSerializable, extended TwitchBattleStats)
- shared/src/types/index.ts (export new types)
- backend/src/managers/BattleCounter.ts (unique user tracking, new helper methods, serializeStats)
- backend/src/managers/BattleCounter.test.ts (16 new tests for unique user tracking)
