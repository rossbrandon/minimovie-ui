import { SITE_URL } from '@lib/constants';
import {
  SEED_MOVIE_IDS,
  SEED_PEOPLE_IDS,
  SEED_SERIES_IDS,
} from '@lib/sitemap-seeds';
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const urls = [
    SITE_URL,
    ...SEED_MOVIE_IDS.map((id) => `${SITE_URL}/movies/${id}`),
    ...SEED_SERIES_IDS.map((id) => `${SITE_URL}/series/${id}`),
    ...SEED_PEOPLE_IDS.map((id) => `${SITE_URL}/people/${id}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
