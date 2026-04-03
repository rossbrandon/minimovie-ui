import type { WatchProvider, WhereToWatch } from '@lib/types';

interface QuickWatchEntry {
  key: string;
  label: string;
  logoPath?: string;
  hasStream: boolean;
  hasRent: boolean;
  hasBuy: boolean;
}

type WatchType = 'stream' | 'rent' | 'buy';

type QuickWatchInfoIcon = 'play' | 'coin' | 'cart';

interface QuickWatchInfo {
  actionText: string;
  icon: QuickWatchInfoIcon;
  colorClass: string;
}

interface BrandRule {
  key: string;
  label: string;
  patterns: string[];
  exactNames?: string[];
}

type Bucket = 'stream' | 'rent' | 'buy' | 'freeAds';

interface Accum {
  hasStream: boolean;
  hasRent: boolean;
  hasBuy: boolean;
  logoStream?: string;
  logoFreeAds?: string;
  logoRentBuy?: string;
}

const BRAND_RULES: BrandRule[] = [
  {
    key: 'apple',
    label: 'Apple TV',
    patterns: ['apple tv'],
    exactNames: ['apple tv'],
  },
  { key: 'netflix', label: 'Netflix', patterns: ['netflix'] },
  { key: 'hulu', label: 'Hulu', patterns: ['hulu'] },
  {
    key: 'disney',
    label: 'Disney+',
    patterns: ['disney+', 'disney plus', 'disney'],
  },
  { key: 'peacock', label: 'Peacock', patterns: ['peacock'] },
  {
    key: 'paramount',
    label: 'Paramount+',
    patterns: ['paramount+', 'paramount plus', 'paramount'],
  },
  {
    key: 'max',
    label: 'HBO Max',
    patterns: ['hbo max'],
    exactNames: ['max'],
  },
  {
    key: 'amazon',
    label: 'Amazon',
    patterns: [
      'amazon prime video',
      'prime video',
      'amazon video',
      'amazon channel',
      'freevee',
      'amazon',
    ],
  },
  {
    key: 'google',
    label: 'YouTube / Google',
    patterns: ['youtube', 'google play', 'google tv'],
  },
  { key: 'starz', label: 'Starz', patterns: ['starz'] },
  { key: 'showtime', label: 'Showtime', patterns: ['showtime'] },
  { key: 'amc', label: 'AMC+', patterns: ['amc+', 'amc plus'] },
  { key: 'roku', label: 'Roku', patterns: ['roku channel', 'roku'] },
];

function normalizeForMatch(name: string): string {
  let s = name.trim().toLowerCase();
  s = s.replace(/\s+with\s+ads\s*$/u, '');
  s = s.replace(/\s*\(ads\)\s*$/u, '');
  return s;
}

function matchBrand(normalized: string): string | null {
  for (const rule of BRAND_RULES) {
    if (rule.exactNames?.some((n) => normalized === n)) {
      return rule.key;
    }
    for (const p of rule.patterns) {
      if (normalized.startsWith(p)) {
        return rule.key;
      }
    }
  }
  return null;
}

function considerLogo(acc: Accum, bucket: Bucket, logoPath?: string) {
  if (!logoPath) return;
  if (bucket === 'stream') {
    acc.logoStream ??= logoPath;
  } else if (bucket === 'freeAds') {
    acc.logoFreeAds ??= logoPath;
  } else {
    acc.logoRentBuy ??= logoPath;
  }
}

function processBucket(
  providers: WatchProvider[] | undefined,
  bucket: Bucket,
  byKey: Map<string, Accum>
) {
  for (const p of providers ?? []) {
    const key = matchBrand(normalizeForMatch(p.name));
    if (!key) continue;

    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        hasStream: false,
        hasRent: false,
        hasBuy: false,
      };
      byKey.set(key, acc);
    }

    if (bucket === 'stream' || bucket === 'freeAds') {
      acc.hasStream = true;
    }
    if (bucket === 'rent') {
      acc.hasRent = true;
    }
    if (bucket === 'buy') {
      acc.hasBuy = true;
    }

    considerLogo(acc, bucket, p.logoPath);
  }
}

function getWatchTypeForEntry(entry: QuickWatchEntry): WatchType {
  if (entry.hasStream) return 'stream';
  if (entry.hasRent) return 'rent';
  return 'buy';
}

function getQuickWatchInfo(entry: QuickWatchEntry): QuickWatchInfo {
  if (entry.hasStream) {
    return {
      actionText: 'Stream on',
      icon: 'play',
      colorClass: 'text-emerald-500',
    };
  }
  if (entry.hasRent && entry.hasBuy) {
    return {
      actionText: 'Rent/Buy on',
      icon: 'coin',
      colorClass: 'text-amber-500',
    };
  }
  if (entry.hasRent) {
    return {
      actionText: 'Rent on',
      icon: 'coin',
      colorClass: 'text-amber-500',
    };
  }
  return {
    actionText: 'Buy on',
    icon: 'cart',
    colorClass: 'text-sky-500',
  };
}

function getQuickWatchEntries(
  whereToWatch: WhereToWatch | undefined
): QuickWatchEntry[] {
  if (!whereToWatch) return [];

  const byKey = new Map<string, Accum>();

  processBucket(whereToWatch.stream, 'stream', byKey);
  processBucket(whereToWatch.free, 'freeAds', byKey);
  processBucket(whereToWatch.ads, 'freeAds', byKey);
  processBucket(whereToWatch.rent, 'rent', byKey);
  processBucket(whereToWatch.buy, 'buy', byKey);

  const labelByKey = new Map(BRAND_RULES.map((r) => [r.key, r.label] as const));

  const order = BRAND_RULES.map((r) => r.key);

  const out: QuickWatchEntry[] = [];
  for (const key of order) {
    const acc = byKey.get(key);
    if (!acc) continue;

    const logoPath =
      acc.logoStream ?? acc.logoFreeAds ?? acc.logoRentBuy ?? undefined;

    out.push({
      key,
      label: labelByKey.get(key) ?? key,
      logoPath,
      hasStream: acc.hasStream,
      hasRent: acc.hasRent,
      hasBuy: acc.hasBuy,
    });
  }

  out.sort((a, b) => {
    if (a.hasStream !== b.hasStream) return a.hasStream ? -1 : 1;
    return 0;
  });

  return out;
}

function getFirstQuickWatchEntry(
  whereToWatch: WhereToWatch | undefined
): QuickWatchEntry | null {
  const list = getQuickWatchEntries(whereToWatch);
  return list[0] ?? null;
}

export type { QuickWatchEntry, QuickWatchInfo, QuickWatchInfoIcon, WatchType };

export {
  getFirstQuickWatchEntry,
  getQuickWatchEntries,
  getQuickWatchInfo,
  getWatchTypeForEntry,
};
