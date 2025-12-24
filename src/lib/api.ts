import { API_BASE_URL, API_TOKEN } from 'astro:env/server';
import type {
  EpisodeDetails,
  MovieDetails,
  PersonDetails,
  SearchResponse,
  SeasonDetails,
  SeriesDetails,
} from './types';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export type SearchType = 'all' | 'movie' | 'series' | 'person';

export async function search(
  query: string,
  page = 1,
  type: SearchType = 'all'
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    // we have to encode this because the API returns different results for '+' vs '%20'
    q: encodeURIComponent(query),
    page: String(page),
    type,
  });

  return fetchAPI<SearchResponse>(`/search?${params}`);
}

export async function getMovie(id: number): Promise<MovieDetails> {
  return fetchAPI<MovieDetails>(`/movies/${id}`);
}

export async function getSeries(id: number): Promise<SeriesDetails> {
  return fetchAPI<SeriesDetails>(`/series/${id}`);
}

export async function getSeason(
  seriesId: number,
  seasonNumber: number
): Promise<SeasonDetails> {
  return fetchAPI<SeasonDetails>(`/series/${seriesId}/seasons/${seasonNumber}`);
}

export async function getEpisode(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<EpisodeDetails> {
  return fetchAPI<EpisodeDetails>(
    `/series/${seriesId}/seasons/${seasonNumber}/episodes/${episodeNumber}`
  );
}

export async function getPerson(id: number): Promise<PersonDetails> {
  return fetchAPI<PersonDetails>(`/people/${id}`);
}
