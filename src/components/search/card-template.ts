import { MEDIA_CONFIG, mediaBadgeClass, mediaHref } from '@lib/media-config';
import type { SearchResult } from '@lib/types';
import { escapeHtml, formatYear, getImageUrl, getInitials } from '@lib/utils';

function renderPoster(result: SearchResult): string {
  const size = result.mediaType === 'person' ? 'w185' : 'w342';
  const url = getImageUrl(result.posterPath, size);
  if (url) {
    return `<img src="${url}" alt="${escapeHtml(result.title)}" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />`;
  }
  return `<div class="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">${escapeHtml(getInitials(result.title))}</div>`;
}

function renderMeta(result: SearchResult): string {
  if (result.mediaType === 'person') {
    return result.knownFor
      ? `<p class="text-xs text-muted-foreground">${escapeHtml(result.knownFor)}</p>`
      : '';
  }
  const year = formatYear(result.releaseDate);
  return year ? `<p class="text-xs text-muted-foreground">${year}</p>` : '';
}

function renderAgeSuffix(result: SearchResult): string {
  if (result.mediaType !== 'person' || result.age === undefined) return '';
  const text = result.age === -1 ? 'Deceased' : String(result.age);
  return ` <span class="text-muted-foreground font-normal">(${text})</span>`;
}

export function renderCard(result: SearchResult): string {
  const href = mediaHref(result.mediaType, result.id);
  const badgeClass = mediaBadgeClass(result.mediaType);
  const label = MEDIA_CONFIG[result.mediaType].label;

  return `
<a href="${href}" class="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-accent/50">
  <div class="relative aspect-2/3 overflow-hidden bg-muted">${renderPoster(result)}</div>
  <div class="flex flex-1 flex-col gap-0.5 p-2">
    <h3 class="font-medium leading-tight line-clamp-2 text-sm group-hover:text-amber-500 transition-colors">
      ${escapeHtml(result.title)}${renderAgeSuffix(result)}
    </h3>
    ${renderMeta(result)}
    <div class="mt-auto">
      <span class="starwind-badge inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-[10px] uppercase tracking-wider opacity-80 ${badgeClass}">${label}</span>
    </div>
  </div>
</a>`.trim();
}

export function renderCardSkeleton(): string {
  return `
<div class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
  <div class="aspect-2/3 bg-muted animate-pulse"></div>
  <div class="flex flex-col gap-1 p-2">
    <div class="h-4 w-3/4 rounded bg-muted animate-pulse"></div>
    <div class="h-3 w-1/3 rounded bg-muted animate-pulse"></div>
  </div>
</div>`.trim();
}
