// Shared client-side helpers for the `mm_authed` marker cookie.
//
// The marker is a non-HttpOnly companion to the HttpOnly session cookie. It
// carries no secret — its only purpose is letting client code (the pre-paint
// script in Layout.astro and Solid client islands) know whether to render the
// authed shell before any framework boots. Backend remains the source of
// truth: if a Solid component fetches user data and the API responds 401,
// it should call `clearAuthMarker()` to bring the UI back into sync.

const MARKER_COOKIE = 'mm_authed';

export function isMarkedAuthed(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.cookie.split('; ').includes(`${MARKER_COOKIE}=1`);
}

export function clearAuthMarker(): void {
  const isProd = location.hostname.endsWith('minimovie.info');
  const domain = isProd ? '; Domain=.minimovie.info' : '';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${MARKER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}${domain}`;
  document.documentElement.classList.remove('authed');
}
