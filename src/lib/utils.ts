import type { AgeDisplayOptions } from './types';

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
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return null;

  const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));

  if (diffYears === 0) return 'this year';
  if (diffYears === 1) return '1 year ago';
  return `${diffYears} years ago`;
}

function formatRuntime(minutes?: number): string {
  if (!minutes) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '';

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
  const { ageAtRelease, currentAge, deathday, ageRange } = options;

  if (ageRange) return ageRange;

  if (!ageAtRelease) return null;

  if (deathday) {
    return `${ageAtRelease} (deceased)`;
  }

  if (currentAge && currentAge !== ageAtRelease) {
    return `${ageAtRelease} (now ${currentAge})`;
  }

  return `${ageAtRelease}`;
}

export {
  formatDate,
  formatYear,
  formatYearsAgo,
  formatRuntime,
  formatCurrency,
  formatProfit,
  getInitials,
  truncateText,
  formatAgeDisplay,
};
