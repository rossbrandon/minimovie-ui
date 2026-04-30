import { fetchUserAPI } from '@lib/api';
import { getSessionCookie } from '@lib/session';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies, url }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const params = url.searchParams.toString();
  const res = await fetchUserAPI(
    `/users/me/watchlist/check?${params}`,
    sessionCookie
  );
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
