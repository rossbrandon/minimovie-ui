import { defineMiddleware } from 'astro:middleware';

const FOUR_HOURS = 14400;

/*
 * Set a cache-control header for all HTML responses.
 * Does not apply to error or search pages.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  if (response.status >= 400) {
    return response;
  }

  if (context.url.pathname === '/search') {
    return response;
  }

  response.headers.set('Cache-Control', `public, max-age=${FOUR_HOURS}`);

  return response;
});
