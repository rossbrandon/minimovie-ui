import type { MediaType } from './types';

type BadgeVariant = 'movie' | 'tv' | 'person';

interface MediaTypeConfig {
  route: string;
  label: string;
  badgeVariant: BadgeVariant;
}

export const MEDIA_CONFIG: Record<MediaType, MediaTypeConfig> = {
  movie: { route: '/movies', label: 'Movie', badgeVariant: 'movie' },
  series: { route: '/series', label: 'TV', badgeVariant: 'tv' },
  person: { route: '/people', label: 'Person', badgeVariant: 'person' },
};

export interface RouteTarget {
  id: number;
  slug?: string;
}

export function getMediaHref(type: MediaType, target: RouteTarget): string {
  return `${MEDIA_CONFIG[type].route}/${target.slug ?? target.id}`;
}

export function getSeasonHref(
  series: RouteTarget,
  seasonNumber: number
): string {
  return `${getMediaHref('series', series)}/seasons/${seasonNumber}`;
}

export function getEpisodeHref(
  series: RouteTarget,
  seasonNumber: number,
  episodeNumber: number
): string {
  return `${getSeasonHref(series, seasonNumber)}/episodes/${episodeNumber}`;
}

export function getSeriesPersonHref(
  series: RouteTarget,
  person: RouteTarget
): string {
  return `${getMediaHref('series', series)}/person/${person.slug ?? person.id}`;
}

// Gets the media id from the slug, e.g. "550-fight-club" -> 550
export function parseSlugId(param: string | undefined): number | undefined {
  const id = Number(param?.match(/^(\d+)(?:-|$)/)?.[1]);
  return id > 0 ? id : undefined;
}

const BADGE_CLASSES: Record<MediaType, string> = {
  movie: 'bg-amber-500/90 text-black',
  series: 'bg-violet-500/90 text-white',
  person: 'bg-teal-500/90 text-white',
};

export function getMediaBadgeClass(type: MediaType): string {
  return BADGE_CLASSES[type];
}
