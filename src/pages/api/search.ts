import type { APIRoute } from 'astro';
import { search } from '@lib/api';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || '';

  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const data = await search(query, 1, 'all');
    return Response.json({
      results: data.results.slice(0, 8),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return Response.json({ results: [] }, { status: 500 });
  }
};

