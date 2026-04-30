import { defineMiddleware } from 'astro:middleware';
import { getSession } from '@lib/api';
import { getCookie, SESSION_COOKIE_NAME } from '@lib/session';

const FOUR_HOURS = 14400;

const NO_CACHE_PATHS = ['/profile', '/watchlist', '/api/', '/auth/', '/_server-islands/'];

function isPrivateRoute(pathname: string): boolean {
  return NO_CACHE_PATHS.some((p) => pathname.startsWith(p));
}

export const onRequest = defineMiddleware(async (context, next) => {
  // --- Session check (runs on every request) ---
  const cookieHeader = context.request.headers.get('cookie') ?? '';
  const sessionToken = getCookie(cookieHeader, SESSION_COOKIE_NAME);

  context.locals.user = null;
  context.locals.unseenAchievementCount = 0;

  if (sessionToken) {
    const cookieForAPI = `${SESSION_COOKIE_NAME}=${sessionToken}`;
    const session = await getSession(cookieForAPI);
    if (session?.user) {
      context.locals.user = session.user;
      context.locals.unseenAchievementCount = session.unseenAchievementCount;
    }
  }

  // --- Dev mode or non-GET: skip cache ---
  if (import.meta.env.DEV || context.request.method !== 'GET') {
    return next();
  }

  // --- Private routes: always skip cache ---
  if (isPrivateRoute(context.url.pathname)) {
    const response = await next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // Cloudflare Cache API
  let cache: any = null;
  try {
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
      // Cache API unavailable
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
    // Cache write failed
  }

  return responseToCache;
});
