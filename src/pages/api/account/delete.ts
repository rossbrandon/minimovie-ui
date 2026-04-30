import { fetchUserAPI } from '@lib/api';
import { getSessionCookie, SESSION_COOKIE_NAME } from '@lib/session';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const body = await request.text();
  const res = await fetchUserAPI('/users/me/delete', sessionCookie, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  return redirect('/?deleted=true');
};
