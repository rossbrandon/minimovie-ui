import { PUBLIC_API_BASE_URL } from 'astro:env/client';

function fetchUserApi(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
  });
}

export { fetchUserApi };
