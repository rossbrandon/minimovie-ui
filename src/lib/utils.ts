import type { AgeDisplayOptions } from './types';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function formatDate(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatYear(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).getFullYear().toString();
}

function formatYearsAgo(dateString?: string): string | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();

  if (date > now) return null;

  const yearDiff = now.getFullYear() - date.getFullYear();

  if (yearDiff === 0) return 'this year';
  if (yearDiff === 1) return 'last year';
  return `${yearDiff} years ago`;
}

function formatRuntime(minutes?: number): string {
  if (!minutes) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatCurrency(amount?: number, compact = false): string {
  if (amount === undefined || amount === null) return '';

  if (compact) {
    if (amount >= 1_000_000_000)
      return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatProfit(
  budget?: number,
  revenue?: number
): {
  amount: string;
  isProfit: boolean;
} | null {
  if (!budget || !revenue) return null;

  const profit = revenue - budget;
  const isProfit = profit >= 0;

  return {
    amount: formatCurrency(Math.abs(profit)),
    isProfit,
  };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function formatAgeDisplay(options: AgeDisplayOptions): string | null {
  const { ageAtRelease, currentAge, birthday, deathday, ageRange } = options;

  if (ageRange) return `Ages ${ageRange}`;

  if (!ageAtRelease) return null;

  if (birthday && deathday) {
    const ageAtDeath = calculateAgeAtDate(birthday, deathday);
    return `Age ${ageAtRelease} (died at ${ageAtDeath})`;
  }

  if (currentAge && currentAge !== ageAtRelease) {
    return `Age ${ageAtRelease} (now ${currentAge})`;
  }

  return `Age ${ageAtRelease}`;
}

function formatEpisodeCode(
  seasonNumber: number,
  episodeNumber: number
): string {
  const season = String(seasonNumber).padStart(2, '0');
  const episode = String(episodeNumber).padStart(2, '0');
  return `S${season}E${episode}`;
}

function formatRating(voteAverage?: number): string | null {
  if (voteAverage === undefined || voteAverage === null || voteAverage === 0)
    return null;
  return `${voteAverage.toFixed(1)}/10`;
}

function formatPersonAge(
  birthday?: string,
  deathday?: string,
  currentAge?: number
): string | null {
  if (!birthday) return null;

  if (deathday) {
    const ageAtDeath = calculateAgeAtDate(birthday, deathday);
    return `${formatDate(birthday)} – ${formatDate(deathday)} (died at ${ageAtDeath})`;
  }

  if (currentAge) {
    return `${formatDate(birthday)} (${currentAge} years old)`;
  }

  return formatDate(birthday);
}

function calculateAgeAtDate(
  birthday: string,
  targetDate: string
): number | null {
  if (!birthday || !targetDate) return null;

  const birthDate = new Date(birthday);
  const target = new Date(targetDate);

  if (isNaN(birthDate.getTime()) || isNaN(target.getTime())) return null;

  const age = Math.floor(
    (target.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return age >= 0 ? age : null;
}

function getImageUrl(
  path: string | undefined,
  size: string
): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export {
  calculateAgeAtDate,
  escapeHtml,
  formatAgeDisplay,
  formatCurrency,
  formatDate,
  formatEpisodeCode,
  formatPersonAge,
  formatProfit,
  formatRating,
  formatRuntime,
  formatYear,
  formatYearsAgo,
  getHostname,
  getImageUrl,
  getInitials,
  truncateText,
};
