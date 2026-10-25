import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://pipolune.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
