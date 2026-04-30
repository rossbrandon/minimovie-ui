import type { SearchResult } from '@lib/types';
import { debounce } from '@lib/utils';
import { createFocusTrap, type FocusTrap } from 'focus-trap';

import { renderCard, renderCardSkeleton } from './card-template';
import { DEBOUNCE_MS, MIN_QUERY_LENGTH, SKELETON_COUNT } from './constants';

export type SheetSource = 'hero' | 'icon';

export interface SheetOpenDetail {
  source: SheetSource;
}

declare global {
  interface DocumentEventMap {
    'search-sheet:open': CustomEvent<SheetOpenDetail>;
  }
}

interface SheetRefs {
  sheet: HTMLElement;
  input: HTMLInputElement;
  results: HTMLElement;
  count: HTMLElement;
  empty: HTMLElement;
  hint: HTMLElement;
  brandView: HTMLElement;
  prompt: HTMLElement;
  clear: HTMLButtonElement;
  cancel: HTMLButtonElement;
  status: HTMLElement;
}

let refs: SheetRefs | null = null;
let trap: FocusTrap | null = null;
let inflight: AbortController | null = null;
let isOpen = false;
let source: SheetSource | null = null;
let restoreScrollY = 0;
let didPushHistory = false;

const HISTORY_MARKER = 'minimovie-search-sheet';

function onPopState(): void {
  if (!isOpen) return;
  // Browser already popped our entry; don't try to pop it again on close.
  didPushHistory = false;
  closeSheet();
}

const debounced = debounce((q: string) => void runFetch(q), DEBOUNCE_MS);

async function fetchSearchJson(
  query: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = (await res.json()) as { results?: SearchResult[] };
  return data.results ?? [];
}

export function dispatchOpenSheet(detail: SheetOpenDetail): void {
  document.dispatchEvent(new CustomEvent('search-sheet:open', { detail }));
}

export function openSheet(detail: SheetOpenDetail): void {
  if (!refs || isOpen) return;
  const { sheet, input } = refs;

  isOpen = true;
  source = detail.source;

  input.value = '';
  toggleClearButton();
  renderHint();

  // Sheet must be display:flex (via data-search-active) before focusing,
  // otherwise iOS won't open the keyboard for an element inside display:none.
  restoreScrollY = window.scrollY;
  document.documentElement.setAttribute('data-search-active', '');
  window.scrollTo(0, 0);
  input.focus();

  history.pushState({ [HISTORY_MARKER]: true }, '');
  didPushHistory = true;
  window.addEventListener('popstate', onPopState);

  trap = createFocusTrap(sheet, {
    initialFocus: () => refs?.input ?? false,
    escapeDeactivates: true,
    returnFocusOnDeactivate: false,
    allowOutsideClick: true,
    onDeactivate: () => closeSheet(),
  });
  trap.activate();
}

export function closeSheet(): void {
  if (!refs || !isOpen) return;
  const { input } = refs;
  isOpen = false;

  inflight?.abort();
  debounced.cancel();
  trap?.deactivate();
  trap = null;

  document.documentElement.removeAttribute('data-search-active');
  window.scrollTo(0, restoreScrollY);

  window.removeEventListener('popstate', onPopState);
  if (didPushHistory) {
    didPushHistory = false;
    history.back();
  }

  if (source === 'hero') {
    // Cancel from hero discards the partial query so the hero reverts cleanly.
    const hero = document.querySelector<HTMLInputElement>(
      '[data-hero-root] [data-search-input]'
    );
    if (hero) hero.value = '';
  }

  input.value = '';
  toggleClearButton();
  renderHint();
  source = null;
}

function bindControls(): void {
  if (!refs) return;
  const { input, clear, cancel } = refs;

  input.addEventListener('input', () => {
    toggleClearButton();
    const query = input.value.trim();
    debounced.cancel();
    if (query.length < MIN_QUERY_LENGTH) {
      inflight?.abort();
      renderHint();
      return;
    }
    debounced.call(query);
  });

  clear.addEventListener('click', () => {
    input.value = '';
    toggleClearButton();
    inflight?.abort();
    renderHint();
    input.focus();
  });

  cancel.addEventListener('click', () => closeSheet());
}

function toggleClearButton(): void {
  if (!refs) return;
  const { input, clear } = refs;
  const hasValue = input.value.length > 0;
  clear.classList.toggle('hidden', !hasValue);
  clear.classList.toggle('inline-flex', hasValue);
}

function syncHintView(): void {
  if (!refs) return;
  const { brandView, prompt } = refs;
  const useBrand = source === 'hero';
  brandView.classList.toggle('is-active', useBrand);
  prompt.classList.toggle('is-active', !useBrand);
}

async function runFetch(query: string): Promise<void> {
  inflight?.abort();
  inflight = new AbortController();
  showSkeletons();
  try {
    const results = await fetchSearchJson(query, inflight.signal);
    if (results.length === 0) showEmpty(query);
    else renderResults(results, query);
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    console.error('Sheet search failed:', err);
    showEmpty(query);
  }
}

function renderResults(results: SearchResult[], query: string): void {
  if (!refs) return;
  const { results: grid, count, empty, hint } = refs;
  grid.classList.remove('hidden');
  empty.classList.add('hidden');
  hint.classList.add('hidden');
  count.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
  count.classList.remove('hidden');
  grid.innerHTML = results.map(renderCard).join('');
  announce(`${results.length} results for ${query}`);
}

function showSkeletons(): void {
  if (!refs) return;
  const { results: grid, count, empty, hint } = refs;
  grid.classList.remove('hidden');
  empty.classList.add('hidden');
  hint.classList.add('hidden');
  count.classList.add('hidden');
  grid.innerHTML = Array.from({ length: SKELETON_COUNT })
    .map(renderCardSkeleton)
    .join('');
}

function showEmpty(query: string): void {
  if (!refs) return;
  const { results: grid, count, empty, hint } = refs;
  grid.classList.add('hidden');
  hint.classList.add('hidden');
  count.classList.add('hidden');
  empty.classList.remove('hidden');
  const queryEl = empty.querySelector<HTMLElement>('[data-sheet-empty-query]');
  if (queryEl) queryEl.textContent = query;
  announce(`No results for ${query}`);
}

function renderHint(): void {
  if (!refs) return;
  const { results: grid, count, empty, hint } = refs;
  grid.classList.add('hidden');
  empty.classList.add('hidden');
  count.classList.add('hidden');
  hint.classList.remove('hidden');
  syncHintView();
}

function announce(message: string): void {
  if (!refs) return;
  refs.status.textContent = message;
}

function moveSheetToBody(): void {
  // Keep singleton as a direct body child so the active-state CSS sibling
  // selector can cleanly hide the rest of the page.
  const sheet = document.querySelector<HTMLElement>('[data-search-sheet]');
  if (sheet && sheet.parentElement !== document.body) {
    document.body.appendChild(sheet);
  }
}

function resolveRefs(): SheetRefs | null {
  const sheet = document.querySelector<HTMLElement>('[data-search-sheet]');
  if (!sheet) return null;
  const input = sheet.querySelector<HTMLInputElement>('[data-search-input]');
  const results = sheet.querySelector<HTMLElement>('[data-sheet-results]');
  const count = sheet.querySelector<HTMLElement>('[data-sheet-count]');
  const empty = sheet.querySelector<HTMLElement>('[data-sheet-empty]');
  const hint = sheet.querySelector<HTMLElement>('[data-sheet-hint]');
  const brandView = sheet.querySelector<HTMLElement>('[data-sheet-brand-view]');
  const prompt = sheet.querySelector<HTMLElement>('[data-sheet-prompt]');
  const clear = sheet.querySelector<HTMLButtonElement>('[data-search-clear]');
  const cancel = sheet.querySelector<HTMLButtonElement>('[data-sheet-cancel]');
  const status = sheet.querySelector<HTMLElement>('[data-sheet-status]');
  if (
    !input ||
    !results ||
    !count ||
    !empty ||
    !hint ||
    !brandView ||
    !prompt ||
    !clear ||
    !cancel ||
    !status
  ) {
    return null;
  }
  return {
    sheet,
    input,
    results,
    count,
    empty,
    hint,
    brandView,
    prompt,
    clear,
    cancel,
    status,
  };
}

function init(): void {
  if (refs) return;
  moveSheetToBody();
  refs = resolveRefs();
  if (!refs) return;
  bindControls();
  document.addEventListener('search-sheet:open', (e) =>
    openSheet(e.detail ?? { source: 'icon' })
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
