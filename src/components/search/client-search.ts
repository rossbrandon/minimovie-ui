import { debounce } from '@lib/utils';

import { DEBOUNCE_MS, MIN_QUERY_LENGTH } from './constants';

export interface ClientSearchHandle {
  destroy(): void;
}

function buildSearchUrl(query: string): string {
  const current = new URLSearchParams(window.location.search);
  const next = new URLSearchParams();
  if (query) next.set('q', query);
  const type = current.get('type');
  if (type && type !== 'all') next.set('type', type);
  return next.toString() ? `/search?${next}` : '/search';
}

async function swapSearchPage(
  query: string,
  signal: AbortSignal
): Promise<void> {
  const target = buildSearchUrl(query);
  const current = document.querySelector<HTMLElement>('[data-search-page]');
  if (!current) return;

  current.setAttribute('aria-busy', 'true');
  current.classList.add('opacity-60');

  try {
    const res = await fetch(target, {
      signal,
      headers: { Accept: 'text/html' },
    });
    if (!res.ok) throw new Error(`Search page fetch failed: ${res.status}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const incoming = doc.querySelector<HTMLElement>('[data-search-page]');
    if (!incoming) throw new Error('Missing [data-search-page] in response');

    current.replaceWith(incoming);
    window.history.replaceState({}, '', target);
    document.title = doc.title;
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    console.error('Live search swap failed:', err);
    current.removeAttribute('aria-busy');
    current.classList.remove('opacity-60');
  }
}

export function mountClientSearch(input: HTMLInputElement): ClientSearchHandle {
  let inflight: AbortController | null = null;

  const debounced = debounce((q: string) => {
    inflight?.abort();
    inflight = new AbortController();
    void swapSearchPage(q, inflight.signal);
  }, DEBOUNCE_MS);

  function handleInput(): void {
    const query = input.value.trim();
    debounced.cancel();
    if (query.length < MIN_QUERY_LENGTH && query.length !== 0) return;
    debounced.call(query);
  }

  input.addEventListener('input', handleInput);

  return {
    destroy() {
      inflight?.abort();
      debounced.cancel();
      input.removeEventListener('input', handleInput);
    },
  };
}
