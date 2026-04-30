import { API_BASE_URL, API_TOKEN } from 'astro:env/server';

import { logger } from './logger';
import type {
  EpisodeDetails,
  MovieDetails,
  PersonDetails,
  PersonInterestingInfo,
  PersonSeriesCredits,
  SearchResponse,
  SeasonDetails,
  SeriesDetails,
} from './types';

function logResponse(
  url: string,
  status: number,
  durationMs: number,
  headers: Headers
): void {
  const responseHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  logger.debug('API response', {
    url,
    status,
    durationMs,
    headers: responseHeaders,
  });
}

async function fetchPublicAPI<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const startTime = performance.now();

  logger.info('API request', { url });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  const durationMs = Math.round(performance.now() - startTime);

  if (!response.ok) {
    const body = await response.text();
    logger.error('API request failed', {
      url,
      status: response.status,
      durationMs,
      body,
    });
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as T;
  logResponse(url, response.status, durationMs, response.headers);
  return data;
}

export async function fetchUserAPI<T>(
  endpoint: string,
  sessionCookie: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const startTime = performance.now();

  const headers = new Headers(init?.headers);
  headers.delete('Authorization');
  headers.set('Cookie', sessionCookie);

  logger.info('User API request', { url, method: init?.method ?? 'GET' });

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const durationMs = Math.round(performance.now() - startTime);
  logResponse(url, response.status, durationMs, response.headers);
  return response;
}

// --- Public catalog functions ---

export type SearchType = 'all' | 'movie' | 'series' | 'person';

export async function search(
  query: string,
  page = 1,
  type: SearchType = 'all'
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: encodeURIComponent(query),
    page: String(page),
    type,
  });

  return fetchPublicAPI<SearchResponse>(`/search?${params}`);
}

export async function getMovie(id: number): Promise<MovieDetails> {
  return fetchPublicAPI<MovieDetails>(`/movies/${id}`);
}

export async function getSeries(id: number): Promise<SeriesDetails> {
  return fetchPublicAPI<SeriesDetails>(`/series/${id}`);
}

export async function getSeason(
  seriesId: number,
  seasonNumber: number
): Promise<SeasonDetails> {
  return fetchPublicAPI<SeasonDetails>(
    `/series/${seriesId}/seasons/${seasonNumber}`
  );
}

export async function getEpisode(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<EpisodeDetails> {
  return fetchPublicAPI<EpisodeDetails>(
    `/series/${seriesId}/seasons/${seasonNumber}/episodes/${episodeNumber}`
  );
}

export async function getPerson(id: number): Promise<PersonDetails> {
  return fetchPublicAPI<PersonDetails>(`/people/${id}`);
}

export async function getPersonInterestingInfo(
  id: number,
  name: string
): Promise<PersonInterestingInfo> {
  const params = new URLSearchParams({ name });
  return fetchPublicAPI<PersonInterestingInfo>(
    `/interesting/person/${id}?${params}`
  );
}

export async function getPersonSeriesCredits(
  seriesId: number,
  personId: number
): Promise<PersonSeriesCredits> {
  return fetchPublicAPI<PersonSeriesCredits>(
    `/series/${seriesId}/person/${personId}/credits`
  );
}

// --- User-data functions (session cookie only) ---

export interface SessionData {
  user: {
    id: string;
    username: string | null;
    givenName: string | null;
    avatarUrl: string | null;
  };
  unseenAchievementCount: number;
}

export async function getSession(
  sessionCookie: string
): Promise<SessionData | null> {
  const res = await fetchUserAPI('/auth/session', sessionCookie);
  if (!res.ok) return null;
  return res.json() as Promise<SessionData>;
}

export async function exchangeAuthCode(
  code: string
): Promise<{ session_token: string } | null> {
  const url = `${API_BASE_URL}/auth/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ session_token: string }>;
}
