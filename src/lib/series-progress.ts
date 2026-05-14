// Reads sessionStorage first, then falls through to the /progress API.
// Mutations write through to both layers; sessionStorage is what carries
// state across the SSR-driven page reloads.

import {
  fetchSeriesProgress,
  type SeriesProgressResponse,
} from '@lib/user-api';
import { createStore, produce, unwrap } from 'solid-js/store';

interface SeasonEvent {
  id: string;
  createdAt: string;
  episodeCount: number;
}

interface EpisodeEvent {
  id: string;
  createdAt: string;
}

interface SeriesProgress {
  fetchedAt: number;
  seasonEvents: Record<number, SeasonEvent>;
  episodeEvents: Record<string, EpisodeEvent>;
}

interface EpisodeWatchedResult {
  watched: boolean;
  coveredBySeason: boolean;
  episodeEventId?: string;
}

const STORAGE_KEY = 'mm_series_progress_v1';
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

const [progress, setProgress] = createStore<Record<number, SeriesProgress>>({});
const pending = new Map<number, Promise<void>>();

hydrateFromSessionStorage();
attachVisibilityRefresh();

async function ensureProgressLoaded(seriesId: number): Promise<void> {
  if (progress[seriesId] && !isStale(progress[seriesId])) {
    return;
  }
  if (pending.has(seriesId)) {
    return pending.get(seriesId);
  }
  if (progress[seriesId]) {
    // Stale data is good enough to render immediately; refresh in the
    // background and let reactive updates correct the UI on response.
    void refreshSeriesCache(seriesId);
    return;
  }
  const p = fetchAndStore(seriesId);
  pending.set(seriesId, p);
  try {
    await p;
  } finally {
    pending.delete(seriesId);
  }
}

function isEpisodeWatched(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  airDate?: string
): EpisodeWatchedResult {
  const seriesProgress = progress[seriesId];
  if (!seriesProgress) {
    return { watched: false, coveredBySeason: false };
  }

  const episodeEvent =
    seriesProgress.episodeEvents[episodeKey(seasonNumber, episodeNumber)];
  if (episodeEvent) {
    return {
      watched: true,
      coveredBySeason: false,
      episodeEventId: episodeEvent.id,
    };
  }

  const seasonEvent = seriesProgress.seasonEvents[seasonNumber];
  if (seasonEvent && (!airDate || airDate <= seasonEvent.createdAt)) {
    return { watched: true, coveredBySeason: true };
  }

  return { watched: false, coveredBySeason: false };
}

function getSeasonEvent(
  seriesId: number,
  seasonNumber: number
): SeasonEvent | undefined {
  return progress[seriesId]?.seasonEvents[seasonNumber];
}

// A season is "complete" when the user has explicitly marked it watched OR
// has individually marked at least `totalEpisodes` episodes within it.
function isSeasonComplete(
  seriesId: number,
  seasonNumber: number,
  totalEpisodes: number
): boolean {
  const series = progress[seriesId];
  if (!series) {
    return false;
  }
  if (series.seasonEvents[seasonNumber]) {
    return true;
  }
  if (totalEpisodes <= 0) {
    return false;
  }
  const prefix = `${seasonNumber}:`;
  let count = 0;
  for (const key of Object.keys(series.episodeEvents)) {
    if (key.startsWith(prefix)) {
      count += 1;
    }
  }
  return count >= totalEpisodes;
}

function getEpisodeEventsForSeason(
  seriesId: number,
  seasonNumber: number
): number {
  const series = progress[seriesId];
  if (!series) {
    return 0;
  }
  const prefix = `${seasonNumber}:`;
  let count = 0;
  for (const key of Object.keys(series.episodeEvents)) {
    if (key.startsWith(prefix)) {
      count += 1;
    }
  }
  return count;
}

function applyEpisodeMutation(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  mutation: 'mark' | 'unmark',
  payload?: EpisodeEvent
): void {
  ensureSeriesSlot(seriesId);
  const key = episodeKey(seasonNumber, episodeNumber);
  setProgress(
    seriesId,
    'episodeEvents',
    produce((events: Record<string, EpisodeEvent>) => {
      if (mutation === 'mark' && payload) {
        events[key] = payload;
      } else {
        delete events[key];
      }
    })
  );
  persist();
}

function applySeasonMutation(
  seriesId: number,
  seasonNumber: number,
  mutation: 'mark' | 'unmark',
  payload?: SeasonEvent
): void {
  ensureSeriesSlot(seriesId);
  setProgress(
    seriesId,
    produce((series: SeriesProgress) => {
      if (mutation === 'mark' && payload) {
        for (const key of Object.keys(series.episodeEvents)) {
          if (key.startsWith(`${seasonNumber}:`)) {
            delete series.episodeEvents[key];
          }
        }
        series.seasonEvents[seasonNumber] = payload;
      } else {
        delete series.seasonEvents[seasonNumber];
      }
    })
  );
  persist();
}

function clearProgress(): void {
  setProgress(
    produce((next: Record<number, SeriesProgress>) => {
      for (const id of Object.keys(next)) {
        delete next[Number(id)];
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

function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

function isStale(p: SeriesProgress | undefined): boolean {
  if (!p) {
    return true;
  }
  return Date.now() - p.fetchedAt > FRESHNESS_WINDOW_MS;
}

function persist(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(unwrap(progress)));
  } catch {
    // Quota exceeded or storage disabled — in-memory state stays correct.
  }
}

function isValidSeriesProgress(value: unknown): value is SeriesProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Partial<SeriesProgress>;
  return (
    typeof v.fetchedAt === 'number' &&
    Number.isFinite(v.fetchedAt) &&
    v.seasonEvents !== null &&
    typeof v.seasonEvents === 'object' &&
    v.episodeEvents !== null &&
    typeof v.episodeEvents === 'object'
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
    const hydratedIds: number[] = [];
    for (const [id, entry] of Object.entries(cached)) {
      if (!isValidSeriesProgress(entry)) {
        continue;
      }
      const seriesId = Number(id);
      setProgress(seriesId, entry);
      hydratedIds.push(seriesId);
    }
    for (const id of hydratedIds) {
      void refreshSeriesCache(id);
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
    for (const id of Object.keys(progress)) {
      void refreshSeriesCache(Number(id));
    }
  });
}

// Refreshes a series in the background if its cache is stale
async function refreshSeriesCache(seriesId: number): Promise<void> {
  if (pending.has(seriesId)) {
    return;
  }
  if (!isStale(progress[seriesId])) {
    return;
  }
  const p = fetchAndStore(seriesId).catch(() => {});
  pending.set(seriesId, p);
  try {
    await p;
  } finally {
    pending.delete(seriesId);
  }
}

async function fetchAndStore(seriesId: number): Promise<void> {
  const response = await fetchSeriesProgress(seriesId);
  setProgress(seriesId, toSeriesProgress(response, Date.now()));
  persist();
}

function toSeriesProgress(
  response: SeriesProgressResponse,
  now: number
): SeriesProgress {
  const seasonEvents: Record<number, SeasonEvent> = {};
  for (const ev of response.seasonEvents) {
    seasonEvents[ev.seasonNumber] = {
      id: ev.id,
      createdAt: ev.createdAt,
      episodeCount: ev.episodeCount,
    };
  }
  const episodeEvents: Record<string, EpisodeEvent> = {};
  for (const ev of response.episodeEvents) {
    episodeEvents[episodeKey(ev.seasonNumber, ev.episodeNumber)] = {
      id: ev.id,
      createdAt: ev.createdAt,
    };
  }
  return { fetchedAt: now, seasonEvents, episodeEvents };
}

function ensureSeriesSlot(seriesId: number): void {
  if (!progress[seriesId]) {
    setProgress(seriesId, {
      fetchedAt: Date.now(),
      seasonEvents: {},
      episodeEvents: {},
    });
  }
}

export {
  applyEpisodeMutation,
  applySeasonMutation,
  clearProgress,
  ensureProgressLoaded,
  getEpisodeEventsForSeason,
  getSeasonEvent,
  isEpisodeWatched,
  isSeasonComplete,
};

export type { EpisodeEvent, EpisodeWatchedResult, SeasonEvent, SeriesProgress };
