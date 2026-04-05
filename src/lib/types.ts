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
  posterPath?: string;
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
  logoPath?: string;
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
  photoPath?: string;
  role?: string;
  order?: number;
  episodeCount?: number;
  birthday?: string;
  deathday?: string;
  currentAge?: number;
  ageAtRelease?: number;
  ageRange?: string;
}

export interface OverflowItem {
  id: number;
  name: string;
  photoPath?: string;
  role?: string;
  ageDisplay?: string;
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
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
}

export interface CollectionInfo {
  id: number;
  name: string;
  overview?: string;
  posterPath?: string;
  parts?: CollectionPart[];
}

export interface MovieDetails {
  id: number;
  imdbID?: string;
  title: string;
  tagline?: string;
  overview?: string;
  genres?: string[];
  posterPath?: string;
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
  logoPath?: string;
  originCountry?: string;
}

export interface Season {
  id: number;
  name: string;
  overview?: string;
  seasonNumber: number;
  episodeCount?: number;
  airDate?: string;
  posterPath?: string;
  voteAverage?: number;
}

export interface SeriesDetails {
  id: number;
  name: string;
  tagline?: string;
  overview?: string;
  genres?: string[];
  posterPath?: string;
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
  posterPath?: string;
  releaseDate?: string;
  role?: string;
  type: 'cast' | 'crew';
  order?: number;
  popularity?: number;
  voteAverage?: number;
  voteCount?: number;
  episodeCount?: number;
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
  photoPath?: string;
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
  stillPath?: string;
  voteAverage?: number;
}

export interface SeasonDetails {
  id: number;
  name: string;
  overview?: string;
  posterPath?: string;
  seasonNumber: number;
  airDate?: string;
  voteAverage?: number;
  episodes?: EpisodeSummary[];
  whereToWatch?: WhereToWatch;
  credits?: Credits;
}

export interface PersonSeriesEpisode {
  episodeNumber: number;
  name: string;
  airDate?: string;
  stillPath?: string;
}

export interface PersonSeriesSeason {
  seasonNumber: number;
  name: string;
  airDate?: string;
  totalEpisodes: number;
  episodes: PersonSeriesEpisode[];
}

export interface PersonSeriesCredits {
  person: {
    id: number;
    name: string;
    photoPath?: string;
  };
  series: {
    id: number;
    name: string;
    posterPath?: string;
  };
  totalEpisodeCount: number;
  roles: { character: string }[];
  seasons: PersonSeriesSeason[];
}

export interface EnrichedSource {
  title: string;
  url: string;
}

export interface EnrichedField {
  value: any;
  confidence: number;
  sources?: EnrichedSource[];
}

export interface PersonInterestingInfo {
  netWorth?: EnrichedField;
  parents?: EnrichedField;
  siblings?: EnrichedField;
  children?: EnrichedField;
  spouse?: EnrichedField;
  notes: string;
}

export interface EpisodeDetails {
  id: number;
  name: string;
  overview?: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate?: string;
  runtime?: number;
  stillPath?: string;
  voteAverage?: number;
  voteCount?: number;
  credits?: Credits;
}
