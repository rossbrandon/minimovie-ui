import { fetchUserAPI } from '@lib/api';
import { getSessionCookie } from '@lib/session';
import type { APIRoute } from 'astro';

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const body = await request.text();
  const res = await fetchUserAPI(
    `/users/me/watchlist/${params.id}`,
    sessionCookie,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const res = await fetchUserAPI(
    `/users/me/watchlist/${params.id}`,
    sessionCookie,
    {
      method: 'DELETE',
    }
  );
  return new Response(res.body, { status: res.status });
};
