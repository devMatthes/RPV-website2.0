import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';
import sharp from 'sharp';
import { createHandler } from '../cloudflare/src/app.ts';
import { cleanupFiles, upload } from '../cloudflare/src/storage.ts';
import { inspectFile } from '../cloudflare/src/attachments.ts';
import { digest } from '../cloudflare/src/security.ts';
const state = await mkdtemp(join(tmpdir(), 'rpv-r2-test-'));
let proxy;
const origin = 'http://127.0.0.1:4321';
const example = { name: 'Jan Testowy', email: 'jan@example.test', phone: '515 114 676',
  address: { street: 'Testowa', building: '12A', apartment: '', postcode: '00-001', city: 'Warszawa', commune: 'Warszawa', county: 'Warszawa', province: 'mazowieckie', country: 'PL', source: 'manual' },
  installation: 'Fotowoltaika', inverter: '', battery: '', message: 'Test.', privacy: true, website: '' };
try {
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--config', 'cloudflare/wrangler.jsonc', '--local', '--persist-to', state], { env: { ...process.env, CI: 'true' } });
  proxy = await getPlatformProxy({ configPath: 'cloudflare/wrangler.jsonc', persist: { path: join(state, 'v3') }, remoteBindings: false });
  const env = { ...proxy.env, APP_SECRET: 'synthetic-secret-for-r2-local-tests-only', SUBMISSIONS_ENABLED: 'true' };
  const worker = createHandler(); const db = env.DB;
  const first = (sql, ...params) => db.prepare(sql).bind(...params).first();
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#ffaa22' } }).png().toBuffer();
  const jpg = await sharp(png).jpeg().toBuffer();
  const webp = await sharp(png).webp().toBuffer();
  const pdf = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  const send = (files, key = crypto.randomUUID(), environment = env, payload = example, ip = crypto.randomUUID()) => {
    const body = new FormData(); body.append('payload', JSON.stringify(payload));
    for (const [name, bytes, type] of files) body.append('attachments', new Blob([bytes], { type }), name);
    return worker.fetch(new Request('https://api.example.test/api/service', { method: 'POST', headers: { origin, 'Idempotency-Key': key, 'CF-Connecting-IP': ip }, body }), environment);
  };
  for (const [name, bytes, mime] of [['image.jpg', jpg, 'image/jpeg'], ['image.png', png, 'image/png'], ['image.webp', webp, 'image/webp'], ['document.pdf', pdf, 'application/pdf']]) {
    assert.equal((await inspectFile(bytes, name, mime)).mime, mime);
  }
  await assert.rejects(inspectFile(png, 'image.jpg', 'image/jpeg'));
  await assert.rejects(inspectFile(new Uint8Array([1,2,3]), 'image.heic', 'image/heic'));
  await assert.rejects(inspectFile(new TextEncoder().encode('<script>evil</script>'), 'image.jpg', 'image/jpeg'));
  await assert.rejects(inspectFile(new Uint8Array(5242881), 'big.pdf', 'application/pdf'));
  await assert.rejects(inspectFile(pdf.slice(0,-8), 'broken.pdf', 'application/pdf'));
  const oversizedImage = new Uint8Array(png); new DataView(oversizedImage.buffer, oversizedImage.byteOffset).setUint32(16, 2000000);
  await assert.rejects(inspectFile(oversizedImage, 'big.png', 'image/png'));

  let cancelled = false;
  const invalidStream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('--invalid\r\nContent-Disposition: form-data; name="bogus"\r\n\r\nvalue\r\n--invalid--\r\n'));
  }, cancel() { cancelled = true; } });
  const invalidRequest = new Request('https://api.example.test/api/service', { method: 'POST', headers: { origin, 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'multipart/form-data; boundary=invalid' }, body: invalidStream, duplex: 'half' });
  assert.equal((await worker.fetch(invalidRequest, env)).status, 400);
  assert.equal(cancelled, true);
  const key = crypto.randomUUID(); const goodFiles = [['photo.png', png, 'image/png'], ['report.pdf', pdf, 'application/pdf']];
  const receipt = await send(goodFiles, key); assert.equal(receipt.status, 201, await receipt.clone().text());
  const caseRow = await first('SELECT id FROM cases');
  const assets = await db.prepare('SELECT * FROM file_assets ORDER BY original_name').all(); assert.equal(assets.results.length, 2);
  assert.ok(assets.results.every(file => file.state === 'ready' && file.expires_at === null && file.object_key.startsWith('private/') && !file.object_key.includes(file.original_name)));
  const photo = assets.results.find(file => file.original_name === 'photo.png');
  assert.deepEqual(new Uint8Array(await (await env.FILES.get(photo.object_key)).arrayBuffer()), new Uint8Array(png));
  const storage = () => first("SELECT consumed FROM usage_budgets WHERE metric='storage_bytes'");
  assert.equal((await storage()).consumed, png.length + pdf.length);
  const countA = async () => (await first("SELECT consumed FROM usage_budgets WHERE metric='r2_class_a' AND scope LIKE '%month'")).consumed;
  const before = await countA();
  assert.equal((await send(goodFiles, key)).status, 200); assert.equal(await countA(), before);
  assert.equal((await send([['photo.png', jpg, 'image/jpeg']], key)).status, 422);
  assert.equal((await send(goodFiles, key, env, { ...example, message: 'Changed' })).status, 409);

  const filePath = `https://api.example.test/api/admin/cases/${caseRow.id}/files/${photo.id}`;
  assert.equal((await worker.fetch(new Request(filePath), env)).status, 401);
  await db.prepare("INSERT INTO administrators VALUES (1,'admin',1,?)").bind(Date.now()).run();
  const session = 'a'.repeat(64);
  await db.prepare('INSERT INTO admin_sessions VALUES (?,1,1,?,?)').bind(await digest(session), Date.now(), Date.now()+60000).run();
  const auth = { cookie: `rpv_session=${session}` };
  const download = await worker.fetch(new Request(filePath, { headers: auth }), env);
  assert.equal(download.status, 200); assert.ok(download.headers.get('Content-Disposition').startsWith('attachment'));
  assert.equal(download.headers.get('Cache-Control'), 'private, no-store');
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), new Uint8Array(png));
  assert.equal((await worker.fetch(new Request(`${filePath}?preview=1`, { headers: auth }), env)).headers.get('Content-Disposition').startsWith('inline'), true);
  assert.equal((await worker.fetch(new Request(filePath.replace(caseRow.id, crypto.randomUUID()), { headers: auth }), env)).status, 404);
  let blockedReads = 0;
  const readLimited = { ...env, R2_B_DAY_LIMIT: '1', FILES: { get: async (...args) => { blockedReads++; return env.FILES.get(...args); } } };
  assert.equal((await worker.fetch(new Request(filePath, { headers: auth }), readLimited)).status, 503);
  assert.equal(blockedReads, 0);
  await db.prepare('UPDATE administrators SET auth_version = 2').run();
  assert.equal((await worker.fetch(new Request(filePath, { headers: auth }), env)).status, 401);

  // A failed second file removes the first upload and its storage ownership.
  const currentStorage = (await storage()).consumed;
  const bad = await send([['first.png', png, 'image/png'], ['bad.jpg', new TextEncoder().encode('bad'), 'image/jpeg']]);
  assert.equal(bad.status, 422);
  assert.equal((await storage()).consumed, currentStorage);
  assert.equal((await first('SELECT count(*) AS n FROM r2_objects')).n, 2);
  assert.equal((await first('SELECT count(*) AS n FROM cases')).n, 1);
  assert.equal((await send(Array.from({ length: 6 }, () => ['photo.png', png, 'image/png']))).status, 422);
  assert.equal((await storage()).consumed, currentStorage);

  // Ambiguous put persists ownership; failed deletion cannot free occupied bytes.
  const brokenR2 = { put: async (...args) => { await env.FILES.put(...args); throw new Error('synthetic failure'); }, delete: async () => { throw new Error('synthetic delete failure'); } };
  const failed = await send([['lost.png', png, 'image/png']], crypto.randomUUID(), { ...env, FILES: brokenR2 });
  assert.equal(failed.status, 503);
  assert.equal((await storage()).consumed, currentStorage + png.length);
  const job = await first('SELECT object_key FROM file_deletion_jobs'); assert.ok(job);
  assert.ok(await env.FILES.get(job.object_key));
  await cleanupFiles(env, Date.now() + 120000);
  assert.ok(await env.FILES.get(job.object_key)); // Ambiguous puts keep storage ownership for a grace period.
  await cleanupFiles({ ...env, FILES: brokenR2 }, Date.now() + 3600001);
  assert.ok((await first('SELECT attempts FROM file_deletion_jobs')).attempts > 0);
  await cleanupFiles(env, Date.now() + 7200000);
  assert.equal(await env.FILES.get(job.object_key), null);
  assert.equal((await storage()).consumed, currentStorage);
  // Failed put still consumes its attempted Class A operation.
  assert.ok(await countA() > before);

  // Storage reservation rejects concurrency above the configured ceiling, before R2.
  const tight = { ...env, R2_STORAGE_LIMIT: String(currentStorage + png.length) };
  const candidates = await Promise.all(Array.from({ length: 3 }, () => inspectFile(png, 'reserved.png', 'image/png')));
  const attempts = await Promise.allSettled(candidates.map(file => upload(tight, file, png, Date.now())));
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  const held = candidates[attempts.findIndex(result => result.status === 'fulfilled')];
  await db.prepare('UPDATE file_assets SET expires_at = ? WHERE id = ?').bind(Date.now()-1, held.id).run();
  await cleanupFiles(env, Date.now());
  assert.equal(await env.FILES.get(held.key), null); assert.equal((await storage()).consumed, currentStorage);

  // Deleting a case queues private files; repeating cleanup cannot double-release.
  await db.prepare('DELETE FROM cases WHERE id = ?').bind(caseRow.id).run();
  await cleanupFiles(env, Date.now()+120000); await cleanupFiles(env, Date.now()+120001);
  assert.equal((await storage()).consumed, 0);
  assert.equal((await first('SELECT count(*) AS n FROM r2_objects')).n, 0);
  assert.equal((await first('SELECT count(*) AS n FROM file_deletion_jobs')).n, 0);
  assert.equal((await env.FILES.list()).objects.length, 0);
  const racingKey = crypto.randomUUID(); const operationsBeforeRace = await countA();
  const races = await Promise.all(Array.from({ length: 5 }, () => send(goodFiles, racingKey)));
  assert.equal(races.filter(res => res.status === 201).length, 1);
  assert.ok(races.every(res => [200,201,425].includes(res.status)), JSON.stringify(await Promise.all(races.map(res => res.clone().text()))));
  assert.equal(await countA(), operationsBeforeRace + 2);
  assert.equal((await send(goodFiles, racingKey)).status, 200);
  await db.prepare('DELETE FROM cases').run(); await cleanupFiles(env, Date.now()+120000);
  assert.equal((await storage()).consumed, 0);
  for (const slot of ['slot1','slot2']) await db.prepare('INSERT INTO upload_requests VALUES (?,?,?)').bind(await digest(slot),slot,Date.now()+60000).run();
  assert.equal((await send(goodFiles)).status, 425);
  await db.prepare('DELETE FROM upload_requests').run();
  let blockedPuts = 0;
  const writeLimited = { ...env, R2_A_DAY_LIMIT: '1', FILES: { put: async (...args) => { blockedPuts++; return env.FILES.put(...args); }, delete: (...args) => env.FILES.delete(...args) } };
  assert.equal((await send([['limited.png',png,'image/png']], crypto.randomUUID(), writeLimited)).status, 503);
  assert.equal(blockedPuts, 0); assert.equal((await storage()).consumed, 0);
  console.log('R2 files: formats, private authenticated reads, idempotency, limits, partial/ambiguous failures, concurrent storage reservations and retry cleanup OK');
} finally { if (proxy) await proxy.dispose(); await rm(state, { recursive: true, force: true }); }
