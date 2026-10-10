import { defineConfig } from 'astro/config';

const githubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: 'https://devMatthes.github.io',
  base: githubPages ? '/RPV-website2.0' : '/',
  trailingSlash: 'always',
  output: 'static',
  // Homepage CSS is small; inline it to avoid a render-blocking round trip.
  build: { inlineStylesheets: 'always' },
});
