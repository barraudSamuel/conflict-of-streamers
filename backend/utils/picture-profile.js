
import fetch from 'node-fetch';

const TWITCH_TRACKER_BASE_URL = 'https://twitchtracker.com';
const AVATAR_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const avatarCache = new Map();

const buildProfileUrl = (username) =>
  `${TWITCH_TRACKER_BASE_URL}/${encodeURIComponent(username)}`;

export async function getTwitchAvatar(username) {
  if (typeof username !== 'string') {
    return null;
  }

  const trimmed = username.trim();
  if (!trimmed) {
    return null;
  }

  const cacheKey = trimmed.toLowerCase();
  const now = Date.now();
  const cached = avatarCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < AVATAR_CACHE_TTL) {
    return cached.url;
  }

  try {
    const response = await fetch(buildProfileUrl(trimmed));
    if (!response.ok) {
      return cached?.url ?? null;
    }

    const html = await response.text();
    const regex = /<div id="app-logo">[\s\S]*?<img src="([^"]+)"/i;
    const match = html.match(regex);

    if (!match) {
      return cached?.url ?? null;
    }

    const [_, src] = match;
    const resolvedUrl = src.startsWith('http') ? src : `${TWITCH_TRACKER_BASE_URL}${src}`;
    avatarCache.set(cacheKey, { url: resolvedUrl, fetchedAt: now });

    return resolvedUrl;
  } catch (error) {
    return cached?.url ?? null;
  }
}

export function clearAvatarCache() {
  avatarCache.clear();
}
