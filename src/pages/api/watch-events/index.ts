import { fetchUserAPI } from '@lib/api';
import { getSessionCookie } from '@lib/session';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, request }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const body = await request.text();
  const res = await fetchUserAPI('/users/me/watch-events', sessionCookie, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
