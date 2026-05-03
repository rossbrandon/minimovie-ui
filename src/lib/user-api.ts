import { fetchUserApi } from './client-api';

type MediaType = 'movie' | 'series' | 'episode' | 'season';

interface SessionResponse {
  user: {
    id: string;
    username: string | null;
    givenName: string | null;
    avatarUrl: string | null;
  };
  unseenAchievementCount: number;
}

interface MediaState {
  inWatchlist: boolean;
  watchlistItemId: string | null;
  hasWatched: boolean;
  watchEventId: string | null;
}

interface MediaStateQuery {
  mediaType: MediaType;
  mediaId: number;
  seriesId?: number;
}

interface WatchlistTarget {
  mediaType: 'movie' | 'series';
  mediaId: number;
}

interface WatchEventInput {
  mediaType: MediaType;
  mediaId: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  justWatched: boolean;
  timezone: string;
}

interface CreatedResource {
  id: string;
}

interface UnseenAchievement {
  id: string;
  name: string;
}

interface UnseenAchievementsResponse {
  achievements: UnseenAchievement[];
}

interface DeleteAccountResult {
  redirected: boolean;
  redirectUrl: string;
}

async function asJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function expectOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status}`);
  }
}

async function fetchMediaState(query: MediaStateQuery): Promise<MediaState> {
  const params = new URLSearchParams({
    media_type: query.mediaType,
    media_id: String(query.mediaId),
  });
  if (query.seriesId) {
    params.set('series_id', String(query.seriesId));
  }
  const res = await fetchUserApi(`/users/me/media-state?${params}`);
  return asJson(res, 'fetchMediaState');
}

// Returns null on 401 (marker-cookie says authed but the API disagrees);
// the caller is expected to clear the marker and degrade to the anon UI.
async function fetchSession(): Promise<SessionResponse | null> {
  const res = await fetchUserApi('/auth/session');
  if (res.status === 401) {
    return null;
  }
  return asJson(res, 'fetchSession');
}

async function fetchUnseenAchievements(): Promise<UnseenAchievementsResponse> {
  const res = await fetchUserApi('/users/me/achievements/unseen');
  return asJson(res, 'fetchUnseenAchievements');
}

async function addToWatchlist(
  target: WatchlistTarget
): Promise<CreatedResource> {
  const res = await fetchUserApi('/users/me/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...target, status: 'want_to_watch' }),
  });
  return asJson(res, 'addToWatchlist');
}

async function removeFromWatchlist(itemId: string): Promise<void> {
  const res = await fetchUserApi(`/users/me/watchlist/${itemId}`, {
    method: 'DELETE',
  });
  await expectOk(res, 'removeFromWatchlist');
}

async function recordWatchEvent(
  input: WatchEventInput
): Promise<CreatedResource> {
  const res = await fetchUserApi('/users/me/watch-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return asJson(res, 'recordWatchEvent');
}

async function deleteWatchEvent(eventId: string): Promise<void> {
  const res = await fetchUserApi(`/users/me/watch-events/${eventId}`, {
    method: 'DELETE',
  });
  await expectOk(res, 'deleteWatchEvent');
}

async function markAchievementsSeen(): Promise<void> {
  const res = await fetchUserApi('/users/me/achievements/seen', {
    method: 'PATCH',
  });
  await expectOk(res, 'markAchievementsSeen');
}

async function deleteAccount(): Promise<DeleteAccountResult> {
  const res = await fetchUserApi('/users/me/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'delete' }),
  });
  await expectOk(res, 'deleteAccount');
  return { redirected: res.redirected, redirectUrl: res.url };
}

async function exportData(): Promise<Blob> {
  const res = await fetchUserApi('/users/me/export', { method: 'POST' });
  if (!res.ok) {
    throw new Error(`exportData failed: ${res.status}`);
  }
  return res.blob();
}

export {
  addToWatchlist,
  deleteAccount,
  deleteWatchEvent,
  exportData,
  fetchMediaState,
  fetchSession,
  fetchUnseenAchievements,
  markAchievementsSeen,
  recordWatchEvent,
  removeFromWatchlist,
};

export type {
  CreatedResource,
  MediaState,
  MediaStateQuery,
  MediaType,
  SessionResponse,
  UnseenAchievement,
  UnseenAchievementsResponse,
  WatchEventInput,
  WatchlistTarget,
};
