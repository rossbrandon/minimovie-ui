import type { AstroCookies } from 'astro';

const IS_PROD = import.meta.env.PROD;

const SESSION_COOKIE_NAME = IS_PROD ? '__Host-mm_session' : 'mm_session_dev';

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

export { getCookie, getSessionCookie, SESSION_COOKIE_NAME };
