import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://pipolune.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [preact()],
  vite: {
    server: {
      // `npm run dev` talks to the live API, so bag, account and Studio work locally without PHP.
      proxy: {
        '/api': { target: 'https://pipolune.com', changeOrigin: true, secure: true },
      },
    },
  },
});
