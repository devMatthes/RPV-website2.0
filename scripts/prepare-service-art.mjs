// Normalize only the generated service art: remove transparent padding without
// changing product proportions, then produce optimized alpha WebP assets.
import { mkdir, rename, access } from 'node:fs/promises';
import sharp from 'sharp';

const directory = new URL('../src/assets/services-bento/', import.meta.url);
const archive = new URL('../outputs/bento/source-art/', import.meta.url);
await mkdir(archive, { recursive: true });
const names = ['solar-panel', 'heat-pump', 'battery-storage', 'air-conditioner', 'electrical-panel'];
for (const name of names) {
  const original = new URL(`${name}.png`, directory);
  let input = original;
  try { await access(original); } catch { input = new URL(`${name}.png`, archive); }
  const { data, info } = await sharp(input.pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 12) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  const margin = 24;
  left = Math.max(0, left - margin); top = Math.max(0, top - margin);
  right = Math.min(info.width - 1, right + margin); bottom = Math.min(info.height - 1, bottom + margin);
  if (right <= left || bottom <= top) throw new Error(`Empty generated asset: ${name}`);
  await sharp(input.pathname).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .webp({ quality: 90, alphaQuality: 100 }).toFile(new URL(`${name}.webp`, directory).pathname);
  if (input === original) await rename(original, new URL(`${name}.png`, archive));
  console.log(`${name}: ${right - left + 1} × ${bottom - top + 1}, alpha WebP`);
}
