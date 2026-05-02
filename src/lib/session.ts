import type { AstroCookies } from 'astro';

const IS_PROD = import.meta.env.PROD;
// Session cookie. Prod uses `__Secure-` prefix; dev uses an unprefixed name for localhost
const SESSION_COOKIE_NAME = IS_PROD ? '__Secure-mm_session' : 'mm_session_dev';
// Non-HttpOnly marker cookie used for FOUC prevention in the UI: an inline
// pre-paint script reads it to decide which version of auth-aware components
// to show before any framework boots.
// This is a UI hint only and does not carry any secret.
const MARKER_COOKIE_NAME = 'mm_authed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const COOKIE_DOMAIN = IS_PROD ? '.minimovie.info' : undefined;

function getSessionCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    domain: COOKIE_DOMAIN,
  };
}

function getMarkerCookieOptions() {
  return {
    path: '/',
    httpOnly: false,
    secure: IS_PROD,
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
  if (!token) return null;
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
