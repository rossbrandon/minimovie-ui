import { fetchUserAPI } from '@lib/api';
import { getSessionCookie } from '@lib/session';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  const sessionCookie = getSessionCookie(cookies);
  if (!sessionCookie) return new Response(null, { status: 401 });

  const res = await fetchUserAPI('/users/me/export', sessionCookie, {
    method: 'POST',
  });

  if (!res.ok) {
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="minimovie-export.json"',
    },
  });
};
