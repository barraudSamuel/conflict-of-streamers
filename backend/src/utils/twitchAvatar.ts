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
const FETCH_TIMEOUT_MS = 5000 // 5 seconds timeout to prevent hanging (HIGH-1 fix)
const CACHE_CLEANUP_INTERVAL_MS = 10 * 60 * 1000 // Cleanup expired entries every 10 minutes (HIGH-2 fix)
const USER_AGENT = 'ConflictOfStreamers/1.0 (+https://github.com/conflict-of-streamers)' // MEDIUM-2 fix

interface CacheEntry {
  url: string
  fetchedAt: number
}

// In-memory cache (cleared on server restart)
const avatarCache = new Map<string, CacheEntry>()

// HIGH-2 fix: Periodic cleanup of expired cache entries to prevent memory leak
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startCacheCleanup(): void {
  if (cleanupInterval) return // Already running

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of avatarCache) {
      if (now - entry.fetchedAt >= AVATAR_CACHE_TTL_MS) {
        avatarCache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned, remaining: avatarCache.size }, 'Avatar cache cleanup completed')
    }
  }, CACHE_CLEANUP_INTERVAL_MS)
}

// Start cleanup on module load
startCacheCleanup()

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

    // HIGH-1 fix: Add timeout to prevent hanging on slow/unresponsive servers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(profileUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT // MEDIUM-2 fix: Add User-Agent to avoid bot blocking
        }
      })
    } finally {
      clearTimeout(timeoutId)
    }

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

    logger.info({ username: trimmed, avatarUrl: resolvedUrl }, 'Twitch avatar fetched successfully')

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

/**
 * Stop cache cleanup interval (for testing)
 */
export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

/**
 * Get cache TTL in ms (for testing)
 */
export const CACHE_TTL_MS = AVATAR_CACHE_TTL_MS
