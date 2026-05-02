import { defineMiddleware } from 'astro:middleware';
import { getSession } from '@lib/api';
import { getCookie, SESSION_COOKIE_NAME } from '@lib/session';

const FOUR_HOURS = 14400;

const NO_CACHE_PATHS = [
  '/login',
  '/profile',
  '/watchlist',
  '/api/',
  '/auth/',
  '/_server-islands/',
];

type MiddlewareContext = Parameters<Parameters<typeof defineMiddleware>[0]>[0];
d;
function isPrivateRoute(pathname: string): boolean {
  return NO_CACHE_PATHS.some((p) => pathname.startsWith(p));
}

// True when this request must bypass the edge cache: dev mode, mutating
// methods, or a path we never want to serve from cache (auth/user routes).
function shouldBypassCache(context: MiddlewareContext): boolean {
  if (import.meta.env.DEV || context.request.method !== 'GET') {
    return true;
  }
  return isPrivateRoute(context.url.pathname);
}

async function resolveSession(context: MiddlewareContext): Promise<void> {
  const cookieHeader = context.request.headers.get('cookie') ?? '';
  const sessionToken = getCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    return;
  }

  const session = await getSession(`${SESSION_COOKIE_NAME}=${sessionToken}`);
  if (session?.user) {
    context.locals.user = session.user;
    context.locals.unseenAchievementCount = session.unseenAchievementCount;
  }
}

// Returns the Cloudflare edge cache (`caches.default`) when available.
// Returns null in dev or anywhere the Cache API is missing.
function getEdgeCache(): Cache | null {
  try {
    if (typeof caches === 'undefined') {
      return null;
    }
    return (caches as unknown as { default: Cache }).default;
  } catch {
    return null;
  }
}

async function readFromCache(
  cache: Cache,
  url: string
): Promise<Response | null> {
  try {
    const cached = await cache.match(url);
    if (!cached) return null;
    return new Response(cached.body, {
      status: cached.status,
      headers: new Headers(cached.headers),
    });
  } catch {
    return null;
  }
}

// Only HTML 2xx responses are worth caching at the edge. JSON, redirects,
// and errors short-circuit and pass through unmodified.
function isCacheableResponse(response: Response): boolean {
  if (response.status >= 400) {
    return false;
  }
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('text/html');
}

// Clone the response, stamp Cache-Control, and schedule a cache.put on
// ctx.waitUntil so the user gets bytes immediately while the cache fills
// out-of-band. Returns the clone for the current request.
function writeToCacheAsync(
  cache: Cache,
  url: string,
  response: Response,
  context: MiddlewareContext
): Response {
  const cacheable = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  cacheable.headers.set('Cache-Control', `public, max-age=${FOUR_HOURS}`);

  try {
    const cfContext = (
      context.locals as {
        cfContext?: { waitUntil?: (p: Promise<unknown>) => void };
      }
    ).cfContext;
    cfContext?.waitUntil?.(cache.put(url, cacheable.clone()));
  } catch {
    // Cache write failed; user still gets the response.
  }

  return cacheable;
}

// --- Orchestration ---
//
// The flow reads top-to-bottom:
//   1. Normalize locals so downstream code can rely on them.
//   2. If we shouldn't cache this request, resolve the session and pass through.
//      Mark private routes as no-store so intermediaries don't hold them.
//   3. Otherwise check the edge cache; on hit, return the cached response.
//   4. On miss, render the shell and (if HTML/2xx) schedule a cache write.

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.unseenAchievementCount = 0;

  if (shouldBypassCache(context)) {
    await resolveSession(context);
    const response = await next();
    if (isPrivateRoute(context.url.pathname)) {
      response.headers.set('Cache-Control', 'private, no-store');
    }
    return response;
  }

  const cache = getEdgeCache();
  if (cache) {
    const cached = await readFromCache(cache, context.url.href);
    if (cached) return cached;
  }

  const response = await next();
  if (cache && isCacheableResponse(response)) {
    return writeToCacheAsync(cache, context.url.href, response, context);
  }
  return response;
});
