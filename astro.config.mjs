import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  // Homepage CSS is small; inline it to avoid a render-blocking round trip.
  build: { inlineStylesheets: 'always' },
});
