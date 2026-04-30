import { exchangeAuthCode } from '@lib/api';
import { SESSION_COOKIE_NAME } from '@lib/session';
import type { APIRoute } from 'astro';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const code = url.searchParams.get('code');

  if (!code || !/^[a-zA-Z0-9_-]{20,}$/.test(code)) {
    return redirect('/login?error=expired_code');
  }

  const result = await exchangeAuthCode(code);
  if (!result?.session_token) {
    return redirect('/login?error=expired_code');
  }

  const isProd = import.meta.env.PROD;

  cookies.set(SESSION_COOKIE_NAME, result.session_token, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });

  return redirect('/');
};
