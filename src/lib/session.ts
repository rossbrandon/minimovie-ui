import type { AstroCookies } from 'astro';

const SITE = new URL(import.meta.env.SITE ?? 'https://minimovie.info');

const SECURE_SESSION_COOKIE_NAME = '__Secure-mm_session';
const DEV_SESSION_COOKIE_NAME = 'mm_session_dev';
const MARKER_COOKIE_NAME = 'mm_authed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MINIMOVIE_COOKIE_DOMAIN = '.minimovie.info';

const isSecureSite = SITE.protocol === 'https:';
const isMinimovieDomain =
  SITE.hostname === 'minimovie.info' ||
  SITE.hostname.endsWith('.minimovie.info');

const SESSION_COOKIE_NAME = isSecureSite
  ? SECURE_SESSION_COOKIE_NAME
  : DEV_SESSION_COOKIE_NAME;
const COOKIE_DOMAIN =
  isSecureSite && isMinimovieDomain ? MINIMOVIE_COOKIE_DOMAIN : undefined;

function getSessionCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: isSecureSite,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    domain: COOKIE_DOMAIN,
  };
}

function getMarkerCookieOptions() {
  return {
    path: '/',
    httpOnly: false,
    secure: isSecureSite,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    domain: COOKIE_DOMAIN,
  };
}

function setSessionCookies(cookies: AstroCookies, sessionToken: string): void {
  cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
  cookies.set(MARKER_COOKIE_NAME, '1', getMarkerCookieOptions());
}

// Path + domain must match the set call for the browser to actually clear.
function clearSessionCookies(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
    domain: COOKIE_DOMAIN,
  });
  cookies.delete(MARKER_COOKIE_NAME, {
    path: '/',
    domain: COOKIE_DOMAIN,
  });
}

function getCookie(header: string, name: string): string | undefined {
  const pairs = header.split(';');
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (key.trim() === name) {
      return rest.join('=').trim();
    }
  }
  return undefined;
}

function getSessionCookie(cookies: AstroCookies): string | null {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return `${SESSION_COOKIE_NAME}=${token}`;
}

export {
  clearSessionCookies,
  getCookie,
  getSessionCookie,
  MARKER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  setSessionCookies,
};
