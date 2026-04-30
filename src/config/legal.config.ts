export const legal = {
  entityName: 'MiniMovie',
  contactEmail: 'privacy@minimovie.info',
  effectiveDate: '2026-05-01',
  version: '1.0',
  databaseRegion: 'United States (us-east)',
  subProcessors: [
    {
      name: 'Cloudflare',
      purpose: 'CDN, hosting, and edge compute',
      location: 'Global',
    },
    { name: 'Railway', purpose: 'API hosting and database', location: 'US' },
    {
      name: 'Apple Sign In',
      purpose: 'Authentication only',
      location: 'Global',
    },
    {
      name: 'Google OAuth',
      purpose: 'Authentication only',
      location: 'Global',
    },
  ],
} as const;
