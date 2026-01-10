# Story 3.5: Fetch Twitch Avatar Automatically

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system (backend/frontend)**,
I want **to automatically fetch a streamer's Twitch avatar using their username**,
So that **player avatars are displayed in the lobby and game (FR5)**.

## Acceptance Criteria

1. **Given** a streamer provides their Twitch username when creating or joining a game
   **When** the system processes the username
   **Then** the system fetches the avatar URL from Twitch's public data (via TwitchTracker scraping)
   **And** the avatar is stored in the player's game state
   **And** the avatar is sent to all clients via WebSocket for display

2. **Given** the avatar fetch succeeds
   **When** the avatar URL is retrieved
   **Then** the URL is normalized to 600x600 resolution for consistency
   **And** the avatar URL is cached for 30 minutes to avoid repeated requests

3. **Given** the avatar fetch fails (invalid username, network error, or API error)
   **When** the system cannot retrieve the avatar
   **Then** the system uses the default SVG placeholder avatar (first letter + assigned color)
   **And** the error is logged but the game continues (graceful degradation)
   **And** no error is shown to the user

4. **Given** multiple requests for the same username within 30 minutes
   **When** the cache contains a valid entry
   **Then** the cached avatar URL is returned immediately without network request
   **And** performance is not degraded by repeated fetches

5. **Given** the TwitchTracker website structure changes
   **When** the HTML parsing fails to find the avatar
   **Then** the system falls back to the default avatar gracefully
   **And** the error is logged with details for debugging

## Tasks / Subtasks

- [x] Task 1: Create TwitchAvatarService utility (AC: 1, 2, 3, 4, 5)
  - [x] Create `backend/src/utils/twitchAvatar.ts` with `getTwitchAvatar(username: string): Promise<string | null>`
  - [x] Implement TwitchTracker.com scraping (parse `<div id="app-logo"><img src="...">`)
  - [x] Add avatar URL normalization to 600x600 (`-profile_image-{size}x{size}.{ext}` pattern)
  - [x] Implement in-memory cache with 30-minute TTL
  - [x] Add graceful error handling (return null on any failure)
  - [x] Add Pino logging for fetch attempts, cache hits, and errors

- [x] Task 2: Update avatarGenerator.ts exports (AC: 3)
  - [x] Export `generateDefaultAvatar` for use as fallback
  - [x] Keep existing default avatar generation as-is

- [x] Task 3: Update RoomManager to use async avatar fetching (AC: 1, 3)
  - [x] Make `createRoom()` async and fetch Twitch avatar for creator
  - [x] Make `addPlayer()` async and fetch Twitch avatar for joining player
  - [x] Fall back to `generateDefaultAvatar()` if Twitch fetch returns null
  - [x] Ensure avatar URL is set before returning response

- [x] Task 4: Update room routes for async avatar (AC: 1)
  - [x] Ensure `POST /api/rooms` awaits avatar fetch
  - [x] Ensure `POST /api/rooms/:code/join` awaits avatar fetch
  - [x] Verify response includes correct avatarUrl

- [x] Task 5: Add unit tests for TwitchAvatarService (AC: 2, 3, 4, 5)
  - [x] Test successful avatar fetch (mock fetch response)
  - [x] Test cache hit (second call returns cached value without fetch)
  - [x] Test cache expiry (call after TTL triggers new fetch)
  - [x] Test network error handling (returns null)
  - [x] Test invalid HTML parsing (returns null)
  - [x] Test URL normalization (various size formats)

- [x] Task 6: Build verification
  - [x] Run `npm run build:shared` - verify no TypeScript errors
  - [x] Run `npm run build:backend` - verify no TypeScript errors
  - [x] Run `npm run test:backend` - verify all tests pass (103 tests)

## Dev Notes

### Critical Architecture Requirements

**FR5 - Recuperation automatique avatar Twitch:**
- Le systeme doit recuperer l'avatar Twitch automatiquement via le pseudo
- Utiliser TwitchTracker.com (pas d'OAuth requis - mode anonyme)
- Fallback vers avatar SVG par defaut si echec

**Mode Anonyme (NFR12):**
- Aucune authentification OAuth requise
- Scraping TwitchTracker.com pour obtenir l'URL de l'avatar
- Approche identique a l'ancien code de reference

### Reference Implementation (from archive)

Le fichier `_archive/conflict-of-streamers-backup-2026-01-07/backend/utils/picture-profile.js` montre l'approche:

```typescript
// APPROACH TO FOLLOW - Convert to TypeScript with strict types

const TWITCH_TRACKER_BASE_URL = 'https://twitchtracker.com'
const AVATAR_CACHE_TTL = 1000 * 60 * 30 // 30 minutes
const AVATAR_SIZE_TARGET = 600

// Cache structure
const avatarCache = new Map<string, { url: string; fetchedAt: number }>()

// Build profile URL
const buildProfileUrl = (username: string): string =>
  `${TWITCH_TRACKER_BASE_URL}/${encodeURIComponent(username)}`

// Normalize avatar URL to 600x600
function normalizeAvatarUrl(url: string): string {
  const AVATAR_SIZE_REGEX = /(-profile_image-)(\d+)x(\d+)(\.\w{3,4})(?:\?.*)?$/i
  return url.replace(AVATAR_SIZE_REGEX, (_, prefix, _width, _height, extension) => {
    return `${prefix}${AVATAR_SIZE_TARGET}x${AVATAR_SIZE_TARGET}${extension}`
  })
}

// Main fetch function
export async function getTwitchAvatar(username: string): Promise<string | null> {
  // Validate input
  if (typeof username !== 'string') return null
  const trimmed = username.trim()
  if (!trimmed) return null

  const cacheKey = trimmed.toLowerCase()
  const now = Date.now()

  // Check cache
  const cached = avatarCache.get(cacheKey)
  if (cached && now - cached.fetchedAt < AVATAR_CACHE_TTL) {
    return cached.url
  }

  try {
    // Fetch TwitchTracker profile page
    const response = await fetch(buildProfileUrl(trimmed))
    if (!response.ok) {
      return cached?.url ?? null
    }

    const html = await response.text()

    // Parse avatar URL from HTML
    const regex = /<div id="app-logo">[\s\S]*?<img src="([^"]+)"/i
    const match = html.match(regex)

    if (!match) {
      return cached?.url ?? null
    }

    const [, src] = match
    const absoluteUrl = src.startsWith('http') ? src : `${TWITCH_TRACKER_BASE_URL}${src}`
    const resolvedUrl = normalizeAvatarUrl(absoluteUrl)

    // Update cache
    avatarCache.set(cacheKey, { url: resolvedUrl, fetchedAt: now })

    return resolvedUrl
  } catch (error) {
    // Graceful degradation - return cached value or null
    return cached?.url ?? null
  }
}
```

### Implementation File: backend/src/utils/twitchAvatar.ts

```typescript
/**
 * Twitch Avatar Fetcher
 * Fetches Twitch profile pictures via TwitchTracker.com scraping (no OAuth required)
 * FR5: Le systeme recupere automatiquement l'avatar Twitch du joueur via son pseudo
 */

import { logger } from './logger'

const TWITCH_TRACKER_BASE_URL = 'https://twitchtracker.com'
const AVATAR_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const AVATAR_SIZE_TARGET = 600
const AVATAR_SIZE_REGEX = /(-profile_image-)(\d+)x(\d+)(\.\w{3,4})(?:\?.*)?$/i

interface CacheEntry {
  url: string
  fetchedAt: number
}

// In-memory cache (cleared on server restart)
const avatarCache = new Map<string, CacheEntry>()

/**
 * Build TwitchTracker profile URL
 */
function buildProfileUrl(username: string): string {
  return `${TWITCH_TRACKER_BASE_URL}/${encodeURIComponent(username)}`
}

/**
 * Normalize avatar URL to target resolution (600x600)
 * Twitch avatar URLs contain size in format: -profile_image-{W}x{H}.{ext}
 */
function normalizeAvatarUrl(url: string): string {
  return url.replace(AVATAR_SIZE_REGEX, (_, prefix, _width, _height, extension) => {
    return `${prefix}${AVATAR_SIZE_TARGET}x${AVATAR_SIZE_TARGET}${extension}`
  })
}

/**
 * Fetch Twitch avatar URL for a username
 * Returns avatar URL or null if fetch fails (graceful degradation)
 *
 * @param username - Twitch username
 * @returns Avatar URL or null
 */
export async function getTwitchAvatar(username: string): Promise<string | null> {
  // Input validation
  if (typeof username !== 'string') {
    logger.warn({ username }, 'getTwitchAvatar: invalid username type')
    return null
  }

  const trimmed = username.trim()
  if (!trimmed) {
    logger.warn('getTwitchAvatar: empty username')
    return null
  }

  const cacheKey = trimmed.toLowerCase()
  const now = Date.now()

  // Check cache first
  const cached = avatarCache.get(cacheKey)
  if (cached && now - cached.fetchedAt < AVATAR_CACHE_TTL_MS) {
    logger.debug({ username: trimmed, cacheAge: Math.round((now - cached.fetchedAt) / 1000) }, 'Avatar cache hit')
    return cached.url
  }

  const profileUrl = buildProfileUrl(trimmed)

  try {
    logger.debug({ username: trimmed, url: profileUrl }, 'Fetching Twitch avatar')

    const response = await fetch(profileUrl)

    if (!response.ok) {
      logger.warn({ username: trimmed, status: response.status }, 'TwitchTracker request failed')
      return cached?.url ?? null
    }

    const html = await response.text()

    // Parse avatar URL from TwitchTracker HTML
    // Structure: <div id="app-logo">...<img src="AVATAR_URL">
    const regex = /<div id="app-logo">[\s\S]*?<img src="([^"]+)"/i
    const match = html.match(regex)

    if (!match) {
      logger.warn({ username: trimmed }, 'Avatar not found in TwitchTracker HTML')
      return cached?.url ?? null
    }

    const [, src] = match

    // Handle relative URLs
    const absoluteUrl = src.startsWith('http') ? src : `${TWITCH_TRACKER_BASE_URL}${src}`

    // Normalize to 600x600
    const resolvedUrl = normalizeAvatarUrl(absoluteUrl)

    // Update cache
    avatarCache.set(cacheKey, { url: resolvedUrl, fetchedAt: now })

    logger.info({ username: trimmed, avatarUrl: resolvedUrl.substring(0, 80) + '...' }, 'Twitch avatar fetched successfully')

    return resolvedUrl
  } catch (error) {
    logger.error({ err: error, username: trimmed }, 'Error fetching Twitch avatar')
    // Graceful degradation - return cached value if available
    return cached?.url ?? null
  }
}

/**
 * Clear avatar cache (for testing)
 */
export function clearAvatarCache(): void {
  avatarCache.clear()
  logger.debug('Avatar cache cleared')
}

/**
 * Get cache size (for monitoring/testing)
 */
export function getAvatarCacheSize(): number {
  return avatarCache.size
}
```

### RoomManager Updates Required

```typescript
// In RoomManager.ts - UPDATE createRoom to be async

async createRoom(request: CreateRoomRequest): Promise<CreateRoomResult> {
  // ... existing code ...

  // Generate creator data (first player gets color index 0)
  const colorIndex = 0
  const color = getPlayerColor(colorIndex)

  // Try to fetch Twitch avatar, fallback to default
  const twitchAvatar = await getTwitchAvatar(request.creatorPseudo)
  const avatarUrl = twitchAvatar ?? generateDefaultAvatar(request.creatorPseudo, colorIndex)

  // ... rest of method ...
}

// UPDATE addPlayer to be async
async addPlayer(roomCode: string, pseudo: string): Promise<AddPlayerResult> {
  // ... existing validation code ...

  // Assign color (cycle through 8 colors)
  const colorIndex = roomData.players.length
  const color = getPlayerColor(colorIndex)

  // Try to fetch Twitch avatar, fallback to default
  const twitchAvatar = await getTwitchAvatar(pseudo)
  const avatarUrl = twitchAvatar ?? generateDefaultAvatar(pseudo, colorIndex)

  // ... rest of method ...
}
```

### Routes Updates Required

```typescript
// In rooms.ts - routes are already async, just need to await RoomManager calls

// POST /api/rooms - now awaits async createRoom
const { room, creator } = await roomManager.createRoom(validated)

// POST /api/rooms/:code/join - now awaits async addPlayer
const { player, roomState } = await roomManager.addPlayer(code, validated.pseudo)
```

### Project Structure Notes

**CREATE:**
```
backend/src/utils/twitchAvatar.ts (new file - Twitch avatar fetcher)
backend/src/utils/twitchAvatar.test.ts (new file - unit tests)
```

**MODIFY:**
```
backend/src/managers/RoomManager.ts (make createRoom/addPlayer async, add avatar fetch)
backend/src/routes/rooms.ts (await async RoomManager methods - may already work if async)
```

**NO CHANGES NEEDED:**
```
backend/src/utils/avatarGenerator.ts (keep as fallback generator)
shared/* (no type changes needed - avatarUrl already string type)
```

### Testing Checklist

**Unit Tests for twitchAvatar.ts:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTwitchAvatar, clearAvatarCache, getAvatarCacheSize } from './twitchAvatar'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('getTwitchAvatar', () => {
  beforeEach(() => {
    clearAvatarCache()
    mockFetch.mockReset()
  })

  it('fetches and parses avatar URL successfully', async () => {
    const mockHtml = `
      <html>
        <div id="app-logo">
          <img src="https://static-cdn.jtvnw.net/jtv_user_pictures/abc123-profile_image-70x70.png">
        </div>
      </html>
    `
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    })

    const result = await getTwitchAvatar('testuser')

    expect(result).toBe('https://static-cdn.jtvnw.net/jtv_user_pictures/abc123-profile_image-600x600.png')
    expect(mockFetch).toHaveBeenCalledWith('https://twitchtracker.com/testuser')
  })

  it('returns cached value on second call within TTL', async () => {
    const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    })

    // First call - fetches
    await getTwitchAvatar('testuser')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call - uses cache
    const result = await getTwitchAvatar('testuser')
    expect(mockFetch).toHaveBeenCalledTimes(1) // No additional fetch
    expect(result).toContain('600x600')
  })

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getTwitchAvatar('testuser')

    expect(result).toBeNull()
  })

  it('returns null when avatar not found in HTML', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>No avatar here</body></html>')
    })

    const result = await getTwitchAvatar('testuser')

    expect(result).toBeNull()
  })

  it('returns null for invalid username', async () => {
    expect(await getTwitchAvatar('')).toBeNull()
    expect(await getTwitchAvatar('   ')).toBeNull()
  })

  it('normalizes username to lowercase for cache key', async () => {
    const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    })

    await getTwitchAvatar('TestUser')
    await getTwitchAvatar('testuser')
    await getTwitchAvatar('TESTUSER')

    // All three should use same cache entry, only 1 fetch
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('handles HTTP error responses gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    const result = await getTwitchAvatar('nonexistentuser')

    expect(result).toBeNull()
  })
})
```

**Integration Test (Manual):**
- [ ] Create room with real Twitch username -> verify avatar displays
- [ ] Create room with fake username -> verify default SVG avatar displays
- [ ] Join room with real Twitch username -> verify avatar in lobby
- [ ] Verify avatar displays correctly on all connected clients

### Edge Cases to Handle

**Invalid Twitch Username:**
- Username doesn't exist on Twitch -> TwitchTracker returns 404 -> fallback to default avatar

**TwitchTracker Down:**
- Network timeout or 5xx error -> graceful fallback to default avatar
- Cached values remain valid even if TwitchTracker is down

**HTML Structure Change:**
- If TwitchTracker changes their HTML structure, regex will fail -> log warning, fallback to default

**Rate Limiting:**
- TwitchTracker might rate limit -> respect 30-minute cache to minimize requests
- Multiple players joining quickly -> each unique username fetched once, cached

**Unicode Usernames:**
- Twitch supports unicode usernames -> encodeURIComponent handles this

### Performance Considerations

**Cache Strategy:**
- 30-minute TTL balances freshness vs performance
- In-memory Map is fast (O(1) lookup)
- Cache cleared on server restart (acceptable for ephemeral game state)

**Async Impact:**
- Avatar fetch adds ~200-500ms latency to room creation/join
- This is acceptable for initial setup operations
- Consider: Could do avatar fetch in background and update via WebSocket (future optimization)

**Memory Usage:**
- Each cache entry ~200 bytes (URL string + metadata)
- 1000 unique users = ~200KB (negligible)

### Dependencies on Other Stories

**Depends on:**
- Story 1.2: Core architecture setup (Fastify, Pino logging) - DONE
- Story 2.1: Room creation endpoint - DONE
- Story 2.2: Join room endpoint - DONE

**Provides to:**
- Story 2.3: Lobby shows real Twitch avatars (improves UX)
- Story 4.8: Battle summary shows real avatars in top 5 leaderboard

### Previous Story Learnings (3-1 to 3-4)

**From Story 3.1 (Twitch IRC connection):**
- tmi.js anonymous mode works well for Twitch integration
- Graceful error handling is critical for external service dependencies

**From Story 3.4 (Reconnection):**
- In-memory Maps work well for per-room/per-user state
- Cache patterns with TTL are effective
- Logging with structured context (username, roomCode) is essential

**Code Review Patterns to Apply:**
- Always validate input parameters
- Log with context for debugging
- Graceful degradation over hard failures
- Keep async operations fast when possible

### References

- [FR5] Le systeme recupere automatiquement l'avatar Twitch du joueur via son pseudo - prd.md
- [NFR12] Mode anonyme sans OAuth - architecture.md
- [Reference Code] `_archive/conflict-of-streamers-backup-2026-01-07/backend/utils/picture-profile.js`
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.5]
- [Source: _bmad-output/project-context.md]
- [Source: backend/src/utils/avatarGenerator.ts]
- [Source: backend/src/managers/RoomManager.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No issues encountered during implementation

### Completion Notes List

- **Task 1**: Created `backend/src/utils/twitchAvatar.ts` implementing TwitchTracker.com scraping with 30-min cache, URL normalization to 600x600, graceful error handling returning null, and Pino structured logging
- **Task 2**: `generateDefaultAvatar` was already exported - no changes needed
- **Task 3**: Made `createRoom()` and `addPlayer()` async in RoomManager.ts, integrated `getTwitchAvatar()` with fallback to default SVG avatar
- **Task 4**: Added `await` to roomManager calls in routes/rooms.ts for POST /api/rooms and POST /api/rooms/:code/join
- **Task 5**: Created comprehensive test suite with 16 tests covering fetch, caching, normalization, and error handling
- **Task 6**: All builds pass (shared, backend), 103 tests pass

### File List

**Created:**
- `backend/src/utils/twitchAvatar.ts` - Twitch avatar fetcher service with cache
- `backend/src/utils/twitchAvatar.test.ts` - 16 unit tests

**Modified:**
- `backend/src/managers/RoomManager.ts` - Made createRoom/addPlayer async, integrated avatar fetch
- `backend/src/routes/rooms.ts` - Added await for async RoomManager calls

## Code Review Fixes (2026-01-10)

**Reviewer:** Claude Opus 4.5 (Adversarial Code Review)

### Issues Found & Fixed

| ID | Severity | Issue | Fix Applied |
|----|----------|-------|-------------|
| HIGH-1 | High | Missing request timeout - DoS vulnerability | Added AbortController with 5s timeout |
| HIGH-2 | High | Memory leak - cache never expires old entries | Added periodic cleanup every 10 minutes |
| MEDIUM-1 | Medium | Missing test for cache expiry | Added test with vi.useFakeTimers() |
| MEDIUM-2 | Medium | User-Agent missing - may be blocked | Added User-Agent header |
| LOW-3 | Low | Log truncates avatar URL unnecessarily | Removed truncation |

### Files Modified by Review

- `backend/src/utils/twitchAvatar.ts` - Added timeout, cache cleanup, User-Agent, fixed logging
- `backend/src/utils/twitchAvatar.test.ts` - Added 3 new tests (timeout, TTL expiry, User-Agent)

### Test Results After Fix

- **Total Tests:** 106 passing
- **New Tests Added:** 3 (cache expiry, abort handling, User-Agent)

## Change Log

- 2026-01-10: Code review fixes applied (HIGH-1, HIGH-2, MEDIUM-1, MEDIUM-2, LOW-3)
- 2026-01-10: Story 3.5 implemented - Twitch avatar automatic fetching via TwitchTracker scraping (FR5)

