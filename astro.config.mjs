import cloudflare from '@astrojs/cloudflare';
import solidJs from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';

const DEV_PORT = 4321;
const isProd = process.env.NODE_ENV === 'production';

// https://astro.build/config
export default defineConfig({
  site: isProd ? 'https://minimovie.info' : `http://localhost:${DEV_PORT}`,
  server: { port: DEV_PORT },
  prefetch: false,
  output: 'server',
  adapter: cloudflare(),
  integrations: [solidJs()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      hmr: {
        overlay: false,
      },
    },
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
      PUBLIC_API_BASE_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://api.minimovie.info',
      }),
    },
  },
});
