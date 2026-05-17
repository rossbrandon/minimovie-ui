import { defineMiddleware } from 'astro:middleware';
import { getSession } from '@lib/api';
import {
  getCookie,
  MARKER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '@lib/session';

const FOUR_HOURS = 14400;

const NO_CACHE_PATHS = [
  '/login',
  '/profile',
  '/watchlist',
  '/api/',
  '/auth/',
  '/_server-islands/',
];

// Paths that read `Astro.locals.user` server-side (redirect guards or
// rendering user fields). Other routes never look at locals.user, so we can
// skip the /auth/session round-trip entirely. Client islands are responsible
// for fetching session data on the routes that don't appear here.
const SESSION_REQUIRED_PATHS = ['/login', '/profile', '/watchlist'];

type MiddlewareContext = Parameters<Parameters<typeof defineMiddleware>[0]>[0];

function getCfTimezone(request: Request): string | null {
  const tz = (request as Request & { cf?: { timezone?: unknown } }).cf
    ?.timezone;
  if (typeof tz !== 'string' || tz.length === 0) {
    return null;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

function isPrivateRoute(pathname: string): boolean {
  return NO_CACHE_PATHS.some((p) => pathname.startsWith(p));
}

function needsServerSideSession(pathname: string): boolean {
  return SESSION_REQUIRED_PATHS.some((p) => pathname.startsWith(p));
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
  if (getCookie(cookieHeader, MARKER_COOKIE_NAME) !== '1') {
    return;
  }
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

// --- Security headers ---

const SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'",
  'https://static.cloudflareinsights.com',
];
const STYLE_SRC = ["'self'", "'unsafe-inline'"];
const IMG_SRC = [
  "'self'",
  'data:',
  'https://image.tmdb.org',
  'https://lh3.googleusercontent.com',
];
const FONT_SRC = ["'self'", 'data:'];
const CONNECT_SRC = ["'self'", 'https://api.minimovie.info'];
const LOCAL_CONNECT_SRC = [...CONNECT_SRC, 'http://localhost:8080'];

function cspDirective(name: string, sources: readonly string[]): string {
  return `${name} ${sources.join(' ')}`;
}

const BASE_CSP_DIRECTIVES = [
  cspDirective('default-src', ["'self'"]),
  cspDirective('script-src', SCRIPT_SRC),
  cspDirective('style-src', STYLE_SRC),
  cspDirective('img-src', IMG_SRC),
  cspDirective('font-src', FONT_SRC),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

function getCspHeader(hostname: string): string {
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const connectSrc = cspDirective(
    'connect-src',
    isLocal ? LOCAL_CONNECT_SRC : CONNECT_SRC
  );
  return [...BASE_CSP_DIRECTIVES, connectSrc].join('; ');
}

function applySecurityHeaders(response: Response, hostname: string): Response {
  response.headers.set('Content-Security-Policy', getCspHeader(hostname));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  return response;
}

// --- Orchestration ---
//
// The flow reads top-to-bottom:
//   1. Normalize locals so downstream code can rely on them.
//   2. Resolve the session only on routes that consume locals.user.
//   3. If we shouldn't cache this request, pass through; private routes
//      get no-store so intermediaries don't hold them.
//   4. Otherwise check the edge cache; on hit, return the cached response.
//   5. On miss, render the shell and (if HTML/2xx) schedule a cache write.
//
// Every return is wrapped with `respond()` so security headers are stamped
// uniformly — including cache hits. The cache stores the bare response
// (headers added after `writeToCacheAsync` returns), so policy changes take
// effect on the next deploy without invalidating the edge cache.

export const onRequest = defineMiddleware(async (context, next) => {
  const respond = (response: Response): Response =>
    applySecurityHeaders(response, context.url.hostname);

  context.locals.user = null;
  context.locals.unseenAchievementCount = 0;
  context.locals.timezone = getCfTimezone(context.request);

  if (needsServerSideSession(context.url.pathname)) {
    await resolveSession(context);
  }

  if (shouldBypassCache(context)) {
    const response = await next();
    if (isPrivateRoute(context.url.pathname)) {
      response.headers.set('Cache-Control', 'private, no-store');
    }
    return respond(response);
  }

  const cache = getEdgeCache();
  if (cache) {
    const cached = await readFromCache(cache, context.url.href);
    if (cached) return respond(cached);
  }

  const response = await next();
  if (cache && isCacheableResponse(response)) {
    return respond(
      writeToCacheAsync(cache, context.url.href, response, context)
    );
  }
  return respond(response);
});
