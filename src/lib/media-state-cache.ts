import {
  fetchMediaState,
  type MediaState,
  type MediaStateQuery,
  type MediaType,
} from '@lib/user-api';
import { createStore, produce, unwrap } from 'solid-js/store';

interface CacheEntry extends MediaState {
  fetchedAt: number;
}

const STORAGE_KEY = 'mm_media_state_v1';
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

const [cache, setCache] = createStore<Record<string, CacheEntry>>({});
const pending = new Map<string, Promise<void>>();

hydrateFromSessionStorage();
attachVisibilityRefresh();

function entryKey(mediaType: MediaType, mediaId: number): string {
  return `${mediaType}:${mediaId}`;
}

function getMediaStateFromCache(
  mediaType: MediaType,
  mediaId: number
): MediaState | undefined {
  const entry = cache[entryKey(mediaType, mediaId)];
  if (!entry) {
    return undefined;
  }
  return {
    inWatchlist: entry.inWatchlist,
    watchlistItemId: entry.watchlistItemId,
    hasWatched: entry.hasWatched,
    watchEventId: entry.watchEventId,
  };
}

function setMediaStateInCache(
  mediaType: MediaType,
  mediaId: number,
  state: MediaState
): void {
  setCache(entryKey(mediaType, mediaId), { ...state, fetchedAt: Date.now() });
  persist();
}

function patchMediaStateInCache(
  mediaType: MediaType,
  mediaId: number,
  patch: Partial<MediaState>
): void {
  const key = entryKey(mediaType, mediaId);
  if (!cache[key]) {
    setCache(key, {
      inWatchlist: false,
      watchlistItemId: null,
      hasWatched: false,
      watchEventId: null,
      fetchedAt: Date.now(),
      ...patch,
    });
  } else {
    setCache(
      key,
      produce((entry: CacheEntry) => {
        Object.assign(entry, patch);
        entry.fetchedAt = Date.now();
      })
    );
  }
  persist();
}

async function ensureMediaStateLoaded(query: MediaStateQuery): Promise<void> {
  const key = entryKey(query.mediaType, query.mediaId);
  const entry = cache[key];
  if (entry && !isStale(entry)) {
    return;
  }
  if (pending.has(key)) {
    return pending.get(key);
  }
  if (entry) {
    void refreshMediaStateCache(query);
    return;
  }
  const p = fetchAndStore(query);
  pending.set(key, p);
  try {
    await p;
  } finally {
    pending.delete(key);
  }
}

function clearMediaStateCache(): void {
  setCache(
    produce((next: Record<string, CacheEntry>) => {
      for (const key of Object.keys(next)) {
        delete next[key];
      }
    })
  );
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage disabled — nothing to do
    }
  }
}

function isStale(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt > FRESHNESS_WINDOW_MS;
}

function persist(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(unwrap(cache)));
  } catch {
    // Quota exceeded or storage disabled — in-memory state stays correct.
  }
}

function isValidCacheEntry(value: unknown): value is CacheEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Partial<CacheEntry>;
  return (
    typeof v.fetchedAt === 'number' &&
    Number.isFinite(v.fetchedAt) &&
    typeof v.inWatchlist === 'boolean' &&
    typeof v.hasWatched === 'boolean'
  );
}

function hydrateFromSessionStorage(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const cached = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(cached)) {
      if (isValidCacheEntry(entry)) {
        setCache(key, entry);
      }
    }
  } catch {
    // Corrupted JSON — cold start.
  }
}

function attachVisibilityRefresh(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    for (const key of Object.keys(cache)) {
      const [mediaType, mediaIdStr] = key.split(':');
      const mediaId = Number(mediaIdStr);
      if (mediaType && Number.isFinite(mediaId)) {
        void refreshMediaStateCache({
          mediaType: mediaType as MediaType,
          mediaId,
        });
      }
    }
  });
}

async function refreshMediaStateCache(query: MediaStateQuery): Promise<void> {
  const key = entryKey(query.mediaType, query.mediaId);
  if (pending.has(key)) {
    return;
  }
  const entry = cache[key];
  if (entry && !isStale(entry)) {
    return;
  }
  const p = fetchAndStore(query).catch(() => {});
  pending.set(key, p);
  try {
    await p;
  } finally {
    pending.delete(key);
  }
}

async function fetchAndStore(query: MediaStateQuery): Promise<void> {
  const state = await fetchMediaState(query);
  setMediaStateInCache(query.mediaType, query.mediaId, state);
}

export {
  clearMediaStateCache,
  ensureMediaStateLoaded,
  getMediaStateFromCache,
  patchMediaStateInCache,
  setMediaStateInCache,
};
