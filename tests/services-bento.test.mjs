import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const assets = ['solar-panel', 'heat-pump', 'battery-storage', 'air-conditioner', 'electrical-panel'];

test('bento uses five optimized product photographs with transparent backgrounds', async () => {
  for (const name of assets) {
    const path = new URL(`src/assets/services-bento/${name}.webp`, root);
    const metadata = await sharp(path.pathname).metadata();
    assert.equal(metadata.format, 'webp', name);
    assert.equal(metadata.hasAlpha, true, name);
    assert.ok(metadata.width >= 600 && metadata.height >= 600, name);
    assert.ok((await stat(path)).size < 400_000, `${name}: source art should stay optimized`);
  }
});

test('service cards retain CMS copy and accessible full-card navigation without a quote action', async () => {
  const source = await readFile(new URL('src/components/home/Services.astro', root), 'utf8');
  assert.match(source, /publishedTexts\('home'\)/);
  assert.match(source, /aria-labelledby=\{titleId\} aria-describedby=\{descriptionId\}/);
  assert.match(source, /home \+ 'uslugi\/' \+ service\.slug/);
  assert.doesNotMatch(source, /class="quote"|Darmowa wycena/);
  assert.match(source, /card-link:focus-visible/);
  assert.match(source, /loading="lazy"/);
  assert.doesNotMatch(source, /ArrowDiagonal|SolarModuleLineDrawing|Bestseller|↗|class="benefits"/);
  assert.doesNotMatch(source, /Usługi RPV|class="eyebrow"/);
});

test('PV artwork anchors to the card bottom-right, reserving the left for the offer', async () => {
  const source = await readFile(new URL('src/components/home/Services.astro', root), 'utf8');
  assert.match(source, /\.service-card--fotowoltaika \.artwork \{ position: absolute; width: 76%; aspect-ratio: 1024 \/ 1490; right: -15%; bottom: -14%;/);
  assert.doesNotMatch(source, /\.service-card--fotowoltaika \{[^}]*background:/);
  assert.doesNotMatch(source, /\.service-card--fotowoltaika \.artwork[^}]*object-fit: cover/);
});

test('testimonials use native scrolling without automatic motion', async () => {
  const source = await readFile(new URL('src/components/home/Testimonials.astro', root), 'utf8');
  assert.doesNotMatch(source, /pause-button|user-paused|aria-pressed/);
  assert.doesNotMatch(source, /@keyframes|animation:\s*review-loop/);
  assert.match(source, /overflow-x: auto/);
});

test('cards use borderless subtle hover scaling with reduced-motion support', async () => {
  const source = await readFile(new URL('src/components/home/Services.astro', root), 'utf8');
  assert.match(source, /border: 0/);
  assert.match(source, /transform: scale\(1\.015\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source, /border-color/);
});
