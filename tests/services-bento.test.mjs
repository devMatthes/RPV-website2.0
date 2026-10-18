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

test('service cards retain CMS copy, accessible full-card navigation and separate quote action', async () => {
  const source = await readFile(new URL('src/components/home/Services.astro', root), 'utf8');
  assert.match(source, /publishedTexts\('home'\)/);
  assert.match(source, /aria-labelledby=\{titleId\} aria-describedby=\{descriptionId\}/);
  assert.match(source, /home \+ 'uslugi\/' \+ service\.slug/);
  assert.match(source, /class="quote" href=\{home \+ 'kontakt\/'\}/);
  assert.match(source, /card-link:focus-visible/);
  assert.match(source, /loading="lazy"/);
  assert.doesNotMatch(source, /ArrowDiagonal|SolarModuleLineDrawing|Bestseller|↗|class="benefits"/);
});
