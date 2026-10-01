import { SITE_URL } from '@lib/constants';
import { MEDIA_CONFIG } from '@lib/media-config';
import {
  SEED_MOVIE_SLUGS,
  SEED_PEOPLE_SLUGS,
  SEED_SERIES_SLUGS,
} from '@lib/sitemap-seeds';
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const urls = [
    SITE_URL,
    ...SEED_MOVIE_SLUGS.map(
      (slug) => `${SITE_URL}${MEDIA_CONFIG.movie.route}/${slug}`
    ),
    ...SEED_SERIES_SLUGS.map(
      (slug) => `${SITE_URL}${MEDIA_CONFIG.series.route}/${slug}`
    ),
    ...SEED_PEOPLE_SLUGS.map(
      (slug) => `${SITE_URL}${MEDIA_CONFIG.person.route}/${slug}`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
