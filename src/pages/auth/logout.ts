import { fetchUserAPI } from '@lib/api';
import { clearSessionCookies, getSessionCookie } from '@lib/session';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  const sessionCookie = getSessionCookie(cookies);

  if (sessionCookie) {
    await fetchUserAPI('/auth/logout', sessionCookie, { method: 'POST' }).catch(
      () => {}
    );
  }

  clearSessionCookies(cookies);

  const form = await request.formData().catch(() => null);
  const returnTo = form?.get('returnTo');
  if (typeof returnTo === 'string' && returnTo.startsWith('/')) {
    return redirect(returnTo);
  }
  return redirect('/');
};
