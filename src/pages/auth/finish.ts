import { exchangeAuthCode } from '@lib/api';
import { setSessionCookies } from '@lib/session';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const code = url.searchParams.get('code');

  if (!code || !/^[a-zA-Z0-9_-]{20,}$/.test(code)) {
    return redirect('/login?error=expired_code');
  }

  const result = await exchangeAuthCode(code);
  if (!result?.session_token) {
    return redirect('/login?error=expired_code');
  }

  setSessionCookies(cookies, result.session_token);

  return redirect('/');
};
