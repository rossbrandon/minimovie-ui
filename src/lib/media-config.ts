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

export function mediaHref(type: MediaType, id: number | string): string {
  return `${MEDIA_CONFIG[type].route}/${id}`;
}

const BADGE_CLASSES: Record<MediaType, string> = {
  movie: 'bg-amber-500/90 text-black',
  series: 'bg-violet-500/90 text-white',
  person: 'bg-teal-500/90 text-white',
};

export function mediaBadgeClass(type: MediaType): string {
  return BADGE_CLASSES[type];
}
