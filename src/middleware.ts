import { defineMiddleware } from 'astro:middleware';

const FOUR_HOURS = 14400;

/*
 * Edge-caches SSR HTML responses using the Cloudflare Cache API.
 *
 * This middleware checks the Cloudflare edge cache before doing
 * a full SSR render. On a cache hit the Worker returns early
 * and on a miss the rendered response is stored for subsequent requests.
 *
 * Excluded: non-GET requests, /search, error pages, and non-HTML responses.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method !== 'GET' || context.url.pathname === '/search') {
    return next();
  }

  let cache: any = null;
  try {
    // Workers runtime exposes caches.default for the zone-scoped cache
    cache =
      typeof caches !== 'undefined'
        ? (caches as unknown as { default: Cache }).default
        : null;
  } catch {
    cache = null;
  }

  const url = context.url.href;

  if (cache) {
    try {
      const cached = await cache.match(url);
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          headers: new Headers(cached.headers),
        });
      }
    } catch {
      // Cache API unavailable, fall through to SSR
    }
  }

  const response = await next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') || response.status >= 400 || !cache) {
    return response;
  }

  const responseToCache = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  responseToCache.headers.set('Cache-Control', `public, max-age=${FOUR_HOURS}`);

  try {
    const cfContext = (context.locals as any).cfContext;
    if (cfContext?.waitUntil) {
      cfContext.waitUntil(cache.put(url, responseToCache.clone()));
    }
  } catch {
    // Cache write failed, response still returned to user
  }

  return responseToCache;
});
