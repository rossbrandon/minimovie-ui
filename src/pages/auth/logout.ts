import { fetchUserAPI } from '@lib/api';
import { getSessionCookie, SESSION_COOKIE_NAME } from '@lib/session';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  const sessionCookie = getSessionCookie(cookies);

  if (sessionCookie) {
    await fetchUserAPI('/auth/logout', sessionCookie, { method: 'POST' }).catch(
      () => {}
    );
  }

  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

  const form = await request.formData().catch(() => null);
  const returnTo = form?.get('returnTo');
  if (typeof returnTo === 'string' && returnTo.startsWith('/')) {
    return redirect(returnTo);
  }
  return redirect('/');
};
