/**
 * UniqueUserTracker Tests - Story 3.3
 * Tests for username normalization
 */

import { describe, it, expect } from 'vitest'
import { normalizeUsername } from './uniqueUserTracker'

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

  it('handles already lowercase', () => {
    expect(normalizeUsername('samstreamer')).toBe('samstreamer')
  })

  it('handles empty string', () => {
    expect(normalizeUsername('')).toBe('')
  })

  it('handles whitespace only', () => {
    expect(normalizeUsername('   ')).toBe('')
  })

  it('handles underscores (valid in Twitch usernames)', () => {
    expect(normalizeUsername('Sam_Streamer_123')).toBe('sam_streamer_123')
  })

  it('handles numbers', () => {
    expect(normalizeUsername('Streamer2024')).toBe('streamer2024')
  })
})
