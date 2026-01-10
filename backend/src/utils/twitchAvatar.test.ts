/**
 * Twitch Avatar Service Tests
 * FR5: Le systeme recupere automatiquement l'avatar Twitch du joueur via son pseudo
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch before importing module
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import after mocking
import { getTwitchAvatar, clearAvatarCache, getAvatarCacheSize, stopCacheCleanup, CACHE_TTL_MS } from './twitchAvatar'

describe('getTwitchAvatar', () => {
  beforeEach(() => {
    clearAvatarCache()
    mockFetch.mockReset()
    stopCacheCleanup() // Prevent background cleanup during tests
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('successful avatar fetch', () => {
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
      expect(mockFetch).toHaveBeenCalledWith(
        'https://twitchtracker.com/testuser',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      )
    })

    it('handles relative avatar URLs', async () => {
      const mockHtml = `<div id="app-logo"><img src="/images/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const result = await getTwitchAvatar('testuser')

      expect(result).toBe('https://twitchtracker.com/images/avatar-profile_image-600x600.png')
    })

    it('encodes special characters in username', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      await getTwitchAvatar('user name')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://twitchtracker.com/user%20name',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })

    // MEDIUM-2 fix: Test User-Agent header is sent
    it('sends User-Agent header with request', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      await getTwitchAvatar('testuser')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('ConflictOfStreamers')
          })
        })
      )
    })
  })

  describe('URL normalization', () => {
    it('normalizes 70x70 to 600x600', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const result = await getTwitchAvatar('testuser')

      expect(result).toContain('600x600')
      expect(result).not.toContain('70x70')
    })

    it('normalizes 300x300 to 600x600', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-300x300.jpeg"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const result = await getTwitchAvatar('testuser')

      expect(result).toContain('600x600')
      expect(result).not.toContain('300x300')
    })

    it('handles URLs without size pattern', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const result = await getTwitchAvatar('testuser')

      expect(result).toBe('https://example.com/avatar.png')
    })
  })

  describe('caching', () => {
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

    it('reports correct cache size', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      expect(getAvatarCacheSize()).toBe(0)

      await getTwitchAvatar('user1')
      expect(getAvatarCacheSize()).toBe(1)

      await getTwitchAvatar('user2')
      expect(getAvatarCacheSize()).toBe(2)

      // Same user (case-insensitive)
      await getTwitchAvatar('USER1')
      expect(getAvatarCacheSize()).toBe(2)
    })

    it('clears cache correctly', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      await getTwitchAvatar('user1')
      expect(getAvatarCacheSize()).toBe(1)

      clearAvatarCache()
      expect(getAvatarCacheSize()).toBe(0)
    })

    // MEDIUM-1 fix: Add missing cache expiry test
    it('fetches again after cache TTL expires', async () => {
      vi.useFakeTimers()

      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      // First call - fetches
      await getTwitchAvatar('testuser')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call within TTL - uses cache
      await getTwitchAvatar('testuser')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance time past TTL
      vi.advanceTimersByTime(CACHE_TTL_MS + 1000)

      // Third call after TTL - should fetch again
      await getTwitchAvatar('testuser')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    // HIGH-1 fix: Test timeout handling via AbortError
    it('returns null when request is aborted', async () => {
      // Mock a fetch that throws AbortError (simulating timeout abort)
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      // The function should handle the AbortError gracefully
      const result = await getTwitchAvatar('slowuser')

      expect(result).toBeNull()
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

    it('returns null for empty username', async () => {
      expect(await getTwitchAvatar('')).toBeNull()
      expect(await getTwitchAvatar('   ')).toBeNull()
    })

    it('handles HTTP error responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await getTwitchAvatar('nonexistentuser')

      expect(result).toBeNull()
    })

    it('returns cached value on subsequent network error', async () => {
      // First call succeeds
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })
      await getTwitchAvatar('testuser')

      // Clear the cache to allow new fetch
      clearAvatarCache()

      // Next call fails with network error - note: no cached value anymore
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const result = await getTwitchAvatar('testuser')

      expect(result).toBeNull()
    })
  })

  describe('input validation', () => {
    it('trims whitespace from username', async () => {
      const mockHtml = `<div id="app-logo"><img src="https://example.com/avatar-profile_image-70x70.png"></div>`
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      await getTwitchAvatar('  testuser  ')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://twitchtracker.com/testuser',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })
  })
})
