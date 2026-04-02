import { SITE_NAME, SITE_URL } from './constants';
import type {
  EpisodeDetails,
  MovieDetails,
  PersonDetails,
  SeasonDetails,
  SeriesDetails,
} from './types';
import { getImageUrl } from './utils';

const MAX_CAST_IN_SCHEMA = 16; // Should match Top Cast section

function toIsoDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `PT${m}M`;
  if (m === 0) return `PT${h}H`;
  return `PT${h}H${m}M`;
}

function personRef(person: { id: number; name: string }) {
  return {
    '@type': 'Person' as const,
    name: person.name,
    url: `${SITE_URL}/people/${person.id}`,
  };
}

function buildMovieSchema(movie: MovieDetails) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    url: `${SITE_URL}/movies/${movie.id}`,
    ...(movie.overview && { description: movie.overview }),
    ...(movie.posterPath && { image: getImageUrl(movie.posterPath, 'w780') }),
    ...(movie.releaseDate && { datePublished: movie.releaseDate }),
    ...(movie.runtime && { duration: toIsoDuration(movie.runtime) }),
    ...(movie.genres?.length && { genre: movie.genres }),
    ...(movie.credits?.directors?.[0] && {
      director: personRef(movie.credits.directors[0]),
    }),
    ...(movie.credits?.cast?.length && {
      actor: movie.credits.cast.slice(0, MAX_CAST_IN_SCHEMA).map(personRef),
    }),
    ...(movie.productionCompanies?.length && {
      productionCompany: movie.productionCompanies.map((name) => ({
        '@type': 'Organization',
        name,
      })),
    }),
    ...(movie.imdbID && {
      sameAs: `https://www.imdb.com/title/${movie.imdbID}`,
    }),
  };
}

function buildSeriesSchema(series: SeriesDetails) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: series.name,
    url: `${SITE_URL}/series/${series.id}`,
    ...(series.overview && { description: series.overview }),
    ...(series.posterPath && {
      image: getImageUrl(series.posterPath, 'w780'),
    }),
    ...(series.firstAirDate && { startDate: series.firstAirDate }),
    ...(series.lastAirDate && { endDate: series.lastAirDate }),
    ...(series.numberOfSeasons && {
      numberOfSeasons: series.numberOfSeasons,
    }),
    ...(series.numberOfEpisodes && {
      numberOfEpisodes: series.numberOfEpisodes,
    }),
    ...(series.genres?.length && { genre: series.genres }),
    ...(series.credits?.cast?.length && {
      actor: series.credits.cast.slice(0, MAX_CAST_IN_SCHEMA).map(personRef),
    }),
    ...(series.createdBy?.[0] && {
      creator: personRef(series.createdBy[0]),
    }),
  };
}

function buildSeasonSchema(season: SeasonDetails, series: SeriesDetails) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeason',
    name: season.name,
    url: `${SITE_URL}/series/${series.id}/seasons/${season.seasonNumber}`,
    ...(season.overview && { description: season.overview }),
    ...(season.posterPath && {
      image: getImageUrl(season.posterPath, 'w780'),
    }),
    seasonNumber: season.seasonNumber,
    ...(season.episodes?.length && {
      numberOfEpisodes: season.episodes.length,
    }),
    ...(season.airDate && { datePublished: season.airDate }),
    partOfSeries: {
      '@type': 'TVSeries',
      name: series.name,
      url: `${SITE_URL}/series/${series.id}`,
    },
  };
}

function buildEpisodeSchema(
  episode: EpisodeDetails,
  series: SeriesDetails,
  seasonName: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    name: episode.name,
    url: `${SITE_URL}/series/${series.id}/seasons/${episode.seasonNumber}/episodes/${episode.episodeNumber}`,
    ...(episode.overview && { description: episode.overview }),
    ...(episode.stillPath && {
      image: getImageUrl(episode.stillPath, 'original'),
    }),
    episodeNumber: episode.episodeNumber,
    ...(episode.airDate && { datePublished: episode.airDate }),
    ...(episode.runtime && { duration: toIsoDuration(episode.runtime) }),
    ...(episode.credits?.directors?.[0] && {
      director: personRef(episode.credits.directors[0]),
    }),
    ...(episode.credits?.cast?.length && {
      actor: episode.credits.cast.slice(0, MAX_CAST_IN_SCHEMA).map(personRef),
    }),
    partOfSeason: {
      '@type': 'TVSeason',
      name: seasonName,
      seasonNumber: episode.seasonNumber,
      url: `${SITE_URL}/series/${series.id}/seasons/${episode.seasonNumber}`,
    },
    partOfSeries: {
      '@type': 'TVSeries',
      name: series.name,
      url: `${SITE_URL}/series/${series.id}`,
    },
  };
}

function buildPersonSchema(person: PersonDetails) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    url: `${SITE_URL}/people/${person.id}`,
    ...(person.biography && { description: person.biography.slice(0, 300) }),
    ...(person.photoPath && { image: getImageUrl(person.photoPath, 'h632') }),
    ...(person.birthday && { birthDate: person.birthday }),
    ...(person.deathday && { deathDate: person.deathday }),
    ...(person.placeOfBirth && {
      birthPlace: { '@type': 'Place', name: person.placeOfBirth },
    }),
    ...(person.knownFor && { jobTitle: person.knownFor }),
    ...(person.alsoKnownAs?.length && {
      alternateName: person.alsoKnownAs,
    }),
    ...(person.imdbId && {
      sameAs: `https://www.imdb.com/name/${person.imdbId}`,
    }),
  };
}

function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

function buildBreadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...(item.url
        ? { item: { '@id': `${SITE_URL}${item.url}`, name: item.name } }
        : { name: item.name }),
    })),
  };
}

export {
  buildBreadcrumbSchema,
  buildEpisodeSchema,
  buildMovieSchema,
  buildPersonSchema,
  buildSeasonSchema,
  buildSeriesSchema,
  buildWebSiteSchema,
  toIsoDuration,
};
