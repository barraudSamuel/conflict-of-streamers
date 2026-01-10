/**
 * UniqueUserTracker - Story 3.3
 * Utility functions for tracking unique Twitch users during battles
 *
 * Twitch usernames are case-insensitive, so we normalize them to lowercase
 * for accurate unique user counting in the balancing formula (FR21)
 */

/**
 * Normalize username for comparison
 * Twitch usernames are case-insensitive (FR14, NFR13)
 * @param username - Raw Twitch username
 * @returns Normalized lowercase, trimmed username (empty string if invalid)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim()
}
