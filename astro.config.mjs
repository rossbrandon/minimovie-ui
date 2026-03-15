import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  prefetch: false,
  output: 'server',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-sans',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' https://image.tmdb.org",
      ],
    },
  },
  env: {
    schema: {
      LOG_LEVEL: envField.string({
        context: 'server',
        access: 'public',
        default: 'INFO',
      }),
      API_BASE_URL: envField.string({
        context: 'server',
        access: 'public',
        default: 'https://api.minimovie.info',
      }),
      API_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
});
