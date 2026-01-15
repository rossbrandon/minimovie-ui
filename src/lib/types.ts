export type MediaType = 'movie' | 'series' | 'person';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface AgeDisplayOptions {
  ageAtRelease?: number;
  currentAge?: number;
  birthday?: string;
  deathday?: string;
  ageRange?: string;
}

export interface SearchResult {
  id: number;
  mediaType: MediaType;
  title: string;
  overview?: string;
  posterUrl?: string;
  releaseDate?: string;
  knownFor?: string;
  age?: number;
}

export interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchResult[];
}

export interface WatchProvider {
  name: string;
  logoUrl?: string;
}

export interface WhereToWatch {
  stream?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
}

export interface Person {
  id: number;
  name: string;
  photoUrl?: string;
  role?: string;
  order?: number;
  birthday?: string;
  deathday?: string;
  currentAge?: number;
  ageAtRelease?: number;
  ageRange?: string;
}

export interface Credits {
  cast?: Person[];
  directors?: Person[];
  writers?: Person[];
  producers?: Person[];
  composers?: Person[];
  cinematographers?: Person[];
  editors?: Person[];
  productionDesign?: Person[];
  costumeDesign?: Person[];
  casting?: Person[];
}

export interface CollectionPart {
  id: number;
  title: string;
  overview?: string;
  posterUrl?: string;
  releaseDate?: string;
  voteAverage?: number;
}

export interface CollectionInfo {
  id: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  parts?: CollectionPart[];
}

export interface MovieDetails {
  id: number;
  imdbID?: string;
  title: string;
  tagline?: string;
  overview?: string;
  genres?: string[];
  posterUrl?: string;
  status?: string;
  releaseDate?: string;
  runtime?: number;
  budget?: number;
  revenue?: number;
  voteAverage?: number;
  originalTitle?: string;
  originalLanguage?: string;
  originCountry?: string;
  spokenLanguages?: string[];
  productionCompanies?: string[];
  productionCountries?: string[];
  whereToWatch?: WhereToWatch;
  credits?: Credits;
  collectionInfo?: CollectionInfo;
}

export interface Network {
  id: number;
  name: string;
  logoUrl?: string;
  originCountry?: string;
}

export interface Season {
  id: number;
  name: string;
  overview?: string;
  seasonNumber: number;
  episodeCount?: number;
  airDate?: string;
  posterUrl?: string;
  voteAverage?: number;
}

export interface SeriesDetails {
  id: number;
  name: string;
  tagline?: string;
  overview?: string;
  genres?: string[];
  posterUrl?: string;
  status?: string;
  inProduction?: boolean;
  firstAirDate?: string;
  lastAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRunTime?: number[];
  voteAverage?: number;
  originalName?: string;
  originalLanguage?: string;
  originCountry?: string;
  spokenLanguages?: string[];
  productionCompanies?: string[];
  productionCountries?: string[];
  createdBy?: Person[];
  networks?: Network[];
  seasons?: Season[];
  whereToWatch?: WhereToWatch;
  credits?: Credits;
}

export interface FilmCredit {
  id: number;
  title: string;
  posterUrl?: string;
  releaseDate?: string;
  role?: string;
  type: 'cast' | 'crew';
  order?: number;
  popularity?: number;
}

export interface PersonDetails {
  id: number;
  imdbId?: string;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  currentAge?: number;
  gender?: 'Female' | 'Male' | 'Non-binary' | 'Not specified';
  placeOfBirth?: string;
  photoUrl?: string;
  knownFor?: string;
  alsoKnownAs?: string[];
  movieCredits?: FilmCredit[];
  seriesCredits?: FilmCredit[];
}

export interface EpisodeSummary {
  id: number;
  name: string;
  overview?: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate?: string;
  runtime?: number;
  stillUrl?: string;
  voteAverage?: number;
}

export interface SeasonDetails {
  id: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  seasonNumber: number;
  airDate?: string;
  voteAverage?: number;
  episodes?: EpisodeSummary[];
  whereToWatch?: WhereToWatch;
  credits?: Credits;
}

export interface EpisodeDetails {
  id: number;
  name: string;
  overview?: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate?: string;
  runtime?: number;
  stillUrl?: string;
  voteAverage?: number;
  voteCount?: number;
  guestStars?: Person[];
  credits?: Credits;
}
