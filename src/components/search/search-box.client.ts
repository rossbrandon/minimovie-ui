import { mountClientSearch } from './client-search';
import { HOVER_CAPABLE_QUERY, MOBILE_BREAKPOINT } from './constants';
import { type DropdownRefs, mountDropdown } from './dropdown';
import { dispatchOpenSheet } from './search-sheet.client';

interface SearchBoxRefs {
  container: HTMLElement;
  input: HTMLInputElement;
  dropdown: HTMLElement | null;
  dropdownResults: HTMLElement | null;
  dropdownEmpty: HTMLElement | null;
  dropdownLoading: HTMLElement | null;
  modifierKey: HTMLElement | null;
}

function getRefs(container: HTMLElement): SearchBoxRefs | null {
  const input = container.querySelector<HTMLInputElement>(
    '[data-search-input]'
  );
  if (!input) return null;
  return {
    container,
    input,
    dropdown: container.querySelector<HTMLElement>('[data-dropdown]'),
    dropdownResults: container.querySelector<HTMLElement>('[data-results]'),
    dropdownEmpty: container.querySelector<HTMLElement>('[data-empty]'),
    dropdownLoading: container.querySelector<HTMLElement>('[data-loading]'),
    modifierKey: container.querySelector<HTMLElement>('[data-modifier-key]'),
  };
}

function detectMode(): { isHoverCapable: boolean; isMobile: () => boolean } {
  const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT);
  return {
    isHoverCapable: window.matchMedia(HOVER_CAPABLE_QUERY).matches,
    isMobile: () => mobileQuery.matches,
  };
}

function isOnSearchPage(): boolean {
  return window.location.pathname === '/search';
}

function toDropdownRefs(refs: SearchBoxRefs): DropdownRefs | null {
  if (
    !refs.dropdown ||
    !refs.dropdownResults ||
    !refs.dropdownEmpty ||
    !refs.dropdownLoading
  ) {
    return null;
  }
  return {
    container: refs.container,
    input: refs.input,
    dropdown: refs.dropdown,
    dropdownResults: refs.dropdownResults,
    dropdownEmpty: refs.dropdownEmpty,
    dropdownLoading: refs.dropdownLoading,
  };
}

function setupGlobalShortcut(input: HTMLInputElement): void {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function setupModifierKey(modifierKey: HTMLElement | null): void {
  if (!modifierKey) return;
  if (navigator.userAgent.toUpperCase().includes('MAC')) {
    modifierKey.textContent = '⌘';
  }
}

function init(container: HTMLElement): void {
  if (container.hasAttribute('data-initialized')) return;
  container.setAttribute('data-initialized', 'true');

  const refs = getRefs(container);
  if (!refs) return;

  const { isHoverCapable, isMobile } = detectMode();
  const onSearchPage = isOnSearchPage();

  const dropdownRefs = !onSearchPage ? toDropdownRefs(refs) : null;
  const dropdown = dropdownRefs
    ? mountDropdown(dropdownRefs, { isHoverCapable, isMobile })
    : null;

  if (onSearchPage) mountClientSearch(refs.input);

  if (container.dataset.variant === 'hero') {
    refs.input.addEventListener('focus', () => {
      if (!isMobile()) return;
      if (document.documentElement.hasAttribute('data-search-active')) return;
      dispatchOpenSheet({ source: 'hero' });
    });
  }

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node)) dropdown?.close();
  });

  setupGlobalShortcut(refs.input);
  setupModifierKey(refs.modifierKey);

  if (container.hasAttribute('data-autofocus') && isHoverCapable) {
    refs.input.focus();
  }
}

function initAll(): void {
  document
    .querySelectorAll<HTMLElement>('search-box')
    .forEach((el) => init(el));
}

initAll();
document.addEventListener('astro:after-swap', initAll);
