import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
// @ts-check
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
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
