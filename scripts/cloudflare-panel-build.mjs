import { build } from 'astro';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

// Separate output: the public site's deployment never includes customer data.
process.env.PUBLIC_SERVICE_API_URL='';
process.env.PANEL_BUILD='true';
await build({ base:'/', outDir:'./.panel-build', logLevel:'warn' });
const source='.panel-build', target='.panel-assets';
await rm(target,{recursive:true,force:true});
await mkdir(join(target,'panel'),{recursive:true});
const html=await readFile(join(source,'panel/live/index.html'),'utf8');
await writeFile(join(target,'panel/index.html'),html);
const copied=new Set();
async function dependencies(text) {
  // Copy only assets referenced by this panel, recursively including JS imports.
  for(const match of text.matchAll(/(?:["'(\x60])((?:\/_astro\/|\.\/)[^"'()\s\x60]+\.(?:js|css|woff2|svg))/g)) {
    const path=match[1].startsWith('./')?`_astro/${match[1].slice(2)}`:match[1].slice(1);
    if(copied.has(path))continue;
    copied.add(path);const bytes=await readFile(join(source,path));
    await mkdir(join(target,'_astro'),{recursive:true});await writeFile(join(target,path),bytes);
    if(/\.(js|css)$/.test(path))await dependencies(bytes.toString('utf8'));
  }
}
await dependencies(html);
const cms=await readFile(join(source,'panel/live/realizacje/index.html'),'utf8');
await mkdir(join(target,'panel/realizacje'),{recursive:true});
await writeFile(join(target,'panel/realizacje/index.html'),cms);
await dependencies(cms);
const texts=await readFile(join(source,'panel/live/teksty/index.html'),'utf8');
await mkdir(join(target,'panel/teksty'),{recursive:true});
await writeFile(join(target,'panel/teksty/index.html'),texts);
await dependencies(texts);
await writeFile(join(target,'_headers'),`/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\n/panel/*\n  Cache-Control: private, no-store\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
console.log(`Panel built: HTML and ${copied.size} referenced static assets; no public pages, submissions or uploads.`);
