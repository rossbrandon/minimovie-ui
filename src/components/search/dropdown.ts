import { MEDIA_CONFIG, mediaBadgeClass, mediaHref } from '@lib/media-config';
import type { SearchResult } from '@lib/types';
import {
  debounce,
  escapeHtml,
  formatYear,
  getImageUrl,
  getInitials,
} from '@lib/utils';

import { DEBOUNCE_MS, MIN_QUERY_LENGTH } from './constants';

export interface DropdownRefs {
  container: HTMLElement;
  input: HTMLInputElement;
  dropdown: HTMLElement;
  dropdownResults: HTMLElement;
  dropdownEmpty: HTMLElement;
  dropdownLoading: HTMLElement;
}

export interface DropdownOptions {
  isHoverCapable: boolean;
  isMobile: () => boolean;
  isSuppressed?: () => boolean;
}

export interface DropdownHandle {
  close(): void;
  destroy(): void;
}

let listboxCounter = 0;
function generateListboxId(): string {
  listboxCounter += 1;
  return `search-listbox-${listboxCounter}`;
}

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

function renderDropdownRow(result: SearchResult, optionId: string): string {
  const href = mediaHref(result.mediaType, result.id);
  const badgeClass = mediaBadgeClass(result.mediaType);
  const label = MEDIA_CONFIG[result.mediaType].label;
  const posterUrl = getImageUrl(result.posterPath, 'w92');
  const initials = getInitials(result.title);
  const year = formatYear(result.releaseDate);

  const posterHtml = posterUrl
    ? `<img src="${posterUrl}" alt="" class="h-full w-full object-cover" loading="lazy" />`
    : `<span class="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">${escapeHtml(initials)}</span>`;

  const isPerson = result.mediaType === 'person';
  const ageText =
    isPerson && result.age !== undefined
      ? result.age === -1
        ? 'Deceased'
        : String(result.age)
      : null;

  const titleHtml = ageText
    ? `${escapeHtml(result.title)} <span class="text-muted-foreground font-normal">(${ageText})</span>`
    : escapeHtml(result.title);

  const subtitleHtml = isPerson
    ? result.knownFor
      ? `<p class="text-xs text-muted-foreground">${escapeHtml(result.knownFor)}</p>`
      : ''
    : year
      ? `<p class="text-xs text-muted-foreground">${year}</p>`
      : '';

  return `
<a href="${href}"
   id="${optionId}"
   role="option"
   aria-selected="false"
   class="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-accent data-active:bg-accent"
   data-result-item>
  <div class="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-muted">${posterHtml}</div>
  <div class="flex-1 min-w-0">
    <p class="font-medium text-sm truncate">${titleHtml}</p>
    ${subtitleHtml}
  </div>
  <span class="starwind-badge inline-flex items-center rounded-full font-medium px-2 py-0.5 text-[10px] uppercase tracking-wide shrink-0 ${badgeClass}">${label}</span>
</a>`.trim();
}

type ActivationSource = 'keyboard' | 'pointer' | null;

export function mountDropdown(
  refs: DropdownRefs,
  opts: DropdownOptions
): DropdownHandle {
  let results: SearchResult[] = [];
  let activeIndex = -1;
  let activationSource: ActivationSource = null;
  let isOpen = false;
  let inflight: AbortController | null = null;
  const debounced = debounce((q: string) => void runFetch(q), DEBOUNCE_MS);
  const listboxId = generateListboxId();
  const itemCleanups: (() => void)[] = [];

  setupAriaShell();

  function setupAriaShell(): void {
    const { input, dropdownResults } = refs;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listboxId);
    dropdownResults.setAttribute('id', listboxId);
    dropdownResults.setAttribute('role', 'listbox');
    dropdownResults.setAttribute('aria-label', 'Search suggestions');
  }

  function handleInput(): void {
    if (opts.isMobile()) return;
    if (opts.isSuppressed?.()) return;
    const query = refs.input.value.trim();
    debounced.cancel();
    activeIndex = -1;
    activationSource = null;
    refs.input.removeAttribute('aria-activedescendant');

    if (query.length < MIN_QUERY_LENGTH) {
      close();
      return;
    }
    debounced.call(query);
  }

  function handleFocus(): void {
    if (opts.isMobile()) return;
    if (opts.isSuppressed?.()) return;
    if (results.length > 0) open();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (opts.isMobile()) return;
    if (opts.isSuppressed?.()) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        e.preventDefault();
        open();
        setActive(0, 'keyboard');
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(
          activeIndex < results.length - 1 ? activeIndex + 1 : 0,
          'keyboard'
        );
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive(
          activeIndex > 0 ? activeIndex - 1 : results.length - 1,
          'keyboard'
        );
        return;
      case 'Enter':
        if (
          activeIndex >= 0 &&
          activationSource === 'keyboard' &&
          results[activeIndex]
        ) {
          e.preventDefault();
          window.location.href = mediaHref(
            results[activeIndex].mediaType,
            results[activeIndex].id
          );
        }
        return;
      case 'Escape':
        e.preventDefault();
        close();
    }
  }

  function open(): void {
    if (opts.isSuppressed?.()) return;
    isOpen = true;
    refs.dropdown.classList.remove('opacity-0', 'invisible');
    refs.dropdown.classList.add('opacity-100', 'visible');
    refs.input.setAttribute('aria-expanded', 'true');
  }

  function close(): void {
    isOpen = false;
    activeIndex = -1;
    activationSource = null;
    refs.dropdown.classList.add('opacity-0', 'invisible');
    refs.dropdown.classList.remove('opacity-100', 'visible');
    refs.input.setAttribute('aria-expanded', 'false');
    refs.input.removeAttribute('aria-activedescendant');
  }

  function setActive(index: number, source: ActivationSource): void {
    activeIndex = index;
    activationSource = source;
    const items =
      refs.dropdownResults.querySelectorAll<HTMLElement>('[data-result-item]');
    items.forEach((item, i) => {
      const active = i === index;
      item.setAttribute('aria-selected', String(active));
      if (active) {
        item.setAttribute('data-active', 'true');
        item.scrollIntoView({ block: 'nearest' });
        refs.input.setAttribute('aria-activedescendant', item.id);
      } else {
        item.removeAttribute('data-active');
      }
    });
    if (index < 0) refs.input.removeAttribute('aria-activedescendant');
  }

  async function runFetch(query: string): Promise<void> {
    inflight?.abort();
    inflight = new AbortController();
    showLoading();
    try {
      results = await fetchSearchJson(query, inflight.signal);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Search dropdown failed:', err);
      close();
      return;
    }
    if (results.length === 0) showEmpty();
    else {
      renderResults();
      open();
    }
  }

  function showLoading(): void {
    refs.dropdownLoading.classList.remove('hidden');
    refs.dropdownResults.classList.add('hidden');
    refs.dropdownEmpty.classList.add('hidden');
    open();
  }

  function showEmpty(): void {
    refs.dropdownEmpty.classList.remove('hidden');
    refs.dropdownResults.classList.add('hidden');
    refs.dropdownLoading.classList.add('hidden');
    open();
  }

  function renderResults(): void {
    refs.dropdownResults.innerHTML = results
      .map((r, i) => renderDropdownRow(r, `${listboxId}-opt-${i}`))
      .join('');
    refs.dropdownResults.scrollTop = 0;
    refs.dropdownResults.classList.remove('hidden');
    refs.dropdownLoading.classList.add('hidden');
    refs.dropdownEmpty.classList.add('hidden');

    itemCleanups.splice(0).forEach((fn) => fn());
    const items =
      refs.dropdownResults.querySelectorAll<HTMLElement>('[data-result-item]');
    items.forEach((item, index) => {
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        const result = results[index];
        window.location.href = mediaHref(result.mediaType, result.id);
      };
      item.addEventListener('click', onClick);
      itemCleanups.push(() => item.removeEventListener('click', onClick));

      if (opts.isHoverCapable) {
        const onMouseEnter = () => setActive(index, 'pointer');
        item.addEventListener('mouseenter', onMouseEnter);
        itemCleanups.push(() =>
          item.removeEventListener('mouseenter', onMouseEnter)
        );
      }
    });
  }

  const onInput = () => handleInput();
  const onFocus = () => handleFocus();
  const onKeydown = (e: KeyboardEvent) => handleKeydown(e);

  refs.input.addEventListener('input', onInput);
  refs.input.addEventListener('focus', onFocus);
  refs.input.addEventListener('keydown', onKeydown);

  return {
    close,
    destroy() {
      inflight?.abort();
      debounced.cancel();
      itemCleanups.splice(0).forEach((fn) => fn());
      refs.input.removeEventListener('input', onInput);
      refs.input.removeEventListener('focus', onFocus);
      refs.input.removeEventListener('keydown', onKeydown);
    },
  };
}
