import { fetchUserAPI } from '@lib/api';
import { getSessionCookie } from '@lib/session';
import type { APIRoute } from 'astro';

export const PATCH: APIRoute = async ({ cookies }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const res = await fetchUserAPI('/users/me/achievements/seen', sessionCookie, {
    method: 'PATCH',
  });
  return new Response(res.body, { status: res.status });
};
