import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { createHandler } from '../cloudflare/src/app.ts';
import { consumeGoogle } from '../cloudflare/src/database.ts';
import { verifiedTeryt } from '../cloudflare/src/address.ts';

const state = await mkdtemp(join(tmpdir(), 'rpv-worker-api-'));
let proxy; let runtime;
const example = { name: 'Jan Testowy', email: 'jan@example.test', phone: '515 114 676',
  address: { street: 'Testowa', building: '12A', apartment: '', postcode: '00-001', city: 'Warszawa', commune: 'Warszawa', county: 'Warszawa', province: 'mazowieckie', country: 'PL', source: 'manual' },
  installation: 'Fotowoltaika', inverter: 'TEST-123', battery: '', message: 'Falownik nie działa.', privacy: true, website: '' };
try {
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--config', 'cloudflare/wrangler.jsonc', '--local', '--persist-to', state], { env: { ...process.env, CI: 'true' } });
  proxy = await getPlatformProxy({ configPath: 'cloudflare/wrangler.jsonc', persist: { path: join(state, 'v3') }, remoteBindings: false });
  const env = { ...proxy.env, APP_SECRET: 'synthetic-test-key-not-a-production-secret', SUBMISSIONS_ENABLED: 'true' };
  const db = env.DB;
  const first = sql => db.prepare(sql).first();
  const worker = createHandler();
  const origin = 'http://127.0.0.1:4321';
  const request = (path, data, headers = {}, handler = worker, environment = env) => handler.fetch(new Request(`https://api.example.test${path}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(data),
  }), environment);
  const key = crypto.randomUUID();
  const send = (data, extra = {}) => request('/api/service', data, { 'Idempotency-Key': key, ...extra });

  assert.equal((await send(example, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await send(example, { origin: '' })).status, 403);
  assert.equal((await request('/api/service', example)).status, 400);
  assert.equal((await send({ ...example, address: {} })).status, 422);
  assert.equal((await send({ ...example, phone: 'letters' })).status, 422);
  assert.equal((await send({ ...example, website: 'bot' })).status, 422);
  const invalid = await send({ ...example, privacy: false });
  assert.ok((await invalid.json()).errors.privacy);
  assert.equal((await first('SELECT count(*) AS n FROM cases')).n, 0);
  const response = await send(example); assert.equal(response.status, 201, await response.clone().text());
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const receipt = await response.json(); assert.match(receipt.reference, /^SRV-\d{4}-000001$/);
  assert.equal((await send(example)).status, 200);
  assert.equal((await send({ ...example, message: 'Changed' })).status, 409);
  assert.equal((await first('SELECT phone FROM cases')).phone, '+48515114676');
  assert.equal((await first('SELECT count(*) AS n FROM case_events')).n, 1);
  assert.equal((await first('SELECT count(*) AS n FROM file_assets')).n, 0);
  assert.deepEqual(JSON.parse((await first('SELECT address_json FROM cases')).address_json), example.address);
  // A restart/new handler must retain receipts and rate limits in D1.
  assert.equal((await request('/api/service', example, { 'Idempotency-Key': key }, createHandler())).status, 200);
  const parallelKey = crypto.randomUUID();
  const parallel = await Promise.all(Array.from({ length: 5 }, () => request('/api/service', example, { 'Idempotency-Key': parallelKey, 'CF-Connecting-IP': '192.0.2.2' })));
  assert.equal(parallel.filter(res => res.status === 201).length, 1);
  assert.ok(parallel.every(res => [200, 201].includes(res.status)), JSON.stringify(await Promise.all(parallel.map(res => res.clone().text()))));
  assert.equal(new Set(await Promise.all(parallel.map(async res => (await res.json()).reference))).size, 1);
  assert.equal((await first('SELECT count(*) AS n FROM cases')).n, 2);
  assert.equal((await first('SELECT value FROM counters')).value, 2);

  const form = new FormData(); form.set('payload', JSON.stringify(example));
  const multipart = await worker.fetch(new Request('https://api.example.test/api/service', { method: 'POST', headers: { origin, 'Idempotency-Key': crypto.randomUUID(), 'CF-Connecting-IP': '192.0.2.3' }, body: form }), env);
  assert.equal(multipart.status, 201, await multipart.clone().text());
  form.append('attachments', new Blob(['fake'], { type: 'image/jpeg' }), 'test.jpg');
  assert.equal((await worker.fetch(new Request('https://api.example.test/api/service', { method: 'POST', headers: { origin, 'Idempotency-Key': crypto.randomUUID() }, body: form }), env)).status, 422);
  form.delete('attachments'); form.append('payload', '{}');
  assert.equal((await worker.fetch(new Request('https://api.example.test/api/service', { method: 'POST', headers: { origin, 'Idempotency-Key': crypto.randomUUID() }, body: form }), env)).status, 400);
  const oversized = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(40000)); controller.close(); } });
  assert.equal((await worker.fetch(new Request('https://api.example.test/api/service', { method: 'POST', headers: { origin, 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' }, body: oversized, duplex: 'half' }), env)).status, 413);
  assert.equal((await request('/api/service', [], { 'Idempotency-Key': crypto.randomUUID() })).status, 400);
  assert.equal((await request('/api/service', example, { 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'text/plain' })).status, 415);
  const rateResponses = [];
  for (let i = 0; i < 7; i++) rateResponses.push(await request('/api/service', example, { 'Idempotency-Key': crypto.randomUUID(), 'CF-Connecting-IP': '192.0.2.4' }));
  assert.equal(rateResponses.filter(res => res.status === 201).length, 6);
  assert.equal(rateResponses.at(-1).status, 429);
  // Receipts can still be retried after the new-submission quota is exhausted.
  assert.equal((await send(example, { 'CF-Connecting-IP': '192.0.2.4' })).status, 200);

  const disabled = { ...env, SUBMISSIONS_ENABLED: 'false' };
  assert.equal((await request('/api/service', example, {}, worker, disabled)).status, 503);
  const config = await worker.fetch(new Request('https://api.example.test/api/config'), disabled);
  assert.equal((await config.json()).submissions, false);
  assert.equal((await request('/api/address/suggestions', { input: 'Test', token: crypto.randomUUID() })).status, 503);
  assert.equal((await worker.fetch(new Request('https://api.example.test/api/admin/cases'), env)).status, 401);
  assert.equal((await worker.fetch(new Request('https://api.example.test/api/service'), env)).status, 405);
  const preflight = await worker.fetch(new Request('https://api.example.test/api/service', { method: 'OPTIONS', headers: { origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Idempotency-Key,Content-Type' } }), env);
  assert.equal(preflight.status, 204);
  assert.equal((await worker.fetch(new Request('https://api.example.test/api/service', { method: 'OPTIONS', headers: { origin, 'Access-Control-Request-Method': 'DELETE' } }), env)).status, 403);

  const calls = [];
  const external = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('autocomplete')) return Response.json({ suggestions: [{ placePrediction: { placeId: 'test-place', text: { text: 'Testowa 12A, Warszawa' } } }] });
    if (String(url).includes('uldk.gugik.gov.pl')) return new Response('0\n146501_1|Warszawa|powiat Warszawa|mazowieckie\n');
    return Response.json({ addressComponents: [
      { longText: 'Polska', shortText: 'PL', types: ['country'] }, { longText: 'Testowa', types: ['route'] },
      { longText: '12A', types: ['street_number'] }, { longText: '00-001', types: ['postal_code'] },
      { longText: 'Warszawa', types: ['locality'] },
    ], location: { longitude: 21, latitude: 52 } });
  };
  const googleEnv = { ...env, GOOGLE_PLACES_API_KEY: 'synthetic-google-key' };
  const addressWorker = createHandler(external); const token = crypto.randomUUID();
  const suggest = (input = 'Test', extra = {}) => request('/api/address/suggestions', { input, token }, extra, addressWorker, googleEnv);
  const details = (id = 'test-place', extra = {}) => request('/api/address/details', { id, token }, extra, createHandler(external), googleEnv);
  assert.equal((await suggest('Te')).status, 400); assert.equal(calls.length, 0);
  assert.equal((await suggest()).status, 200); assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].init.body).sessionToken, token);
  assert.equal(calls[0].init.headers['X-Goog-FieldMask'], 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text');
  assert.equal((await details('unknown')).status, 400);
  assert.equal((await details('test-place', { 'CF-Connecting-IP': '192.0.2.99' })).status, 400);
  assert.equal(calls.length, 1);
  const addressResponse = await details(); assert.equal(addressResponse.status, 200, await addressResponse.clone().text());
  const chosen = await addressResponse.json(); assert.equal(chosen.address.commune, 'Warszawa'); assert.equal(chosen.address.teryt, '1465011');
  assert.equal(calls[1].init.headers['X-Goog-FieldMask'], 'addressComponents,location');
  assert.ok(calls[1].url.includes(`sessionToken=${token}`));
  assert.ok(calls[2].url.includes('GetCommuneByXY'));
  assert.equal((await details()).status, 400); assert.equal(calls.length, 3);
  assert.equal((await suggest()).status, 429);
  const selected = { ...example, address: { ...example.address, ...chosen.address, proof: chosen.proof, teryt: '1111111' } };
  const saved = await request('/api/service', selected, { 'Idempotency-Key': crypto.randomUUID(), 'CF-Connecting-IP': '192.0.2.5' }, worker, googleEnv);
  assert.equal(saved.status, 201, await saved.clone().text());
  const savedAddress = JSON.parse((await db.prepare("SELECT address_json FROM cases WHERE phone = '+48515114676' ORDER BY submitted_at DESC LIMIT 1").first()).address_json);
  assert.equal(savedAddress.teryt, '1465011'); assert.equal(savedAddress.proof, undefined);
  const now = Date.now();
  assert.equal(await verifiedTeryt({ ...selected.address, building: '999' }, chosen.proof, googleEnv, now), undefined);
  assert.equal(await verifiedTeryt(selected.address, chosen.proof, googleEnv, now + 3600001), undefined);
  assert.equal(await verifiedTeryt(selected.address, chosen.proof.replace(/.$/, 'z'), googleEnv, now), undefined);
  const storedSessions = await db.prepare('SELECT * FROM address_sessions').all();
  assert.ok(storedSessions.results.every(row => row.token_hash !== token && !JSON.stringify(row).includes('Testowa')));
  assert.equal((await first("SELECT consumed FROM usage_budgets WHERE scope='google-day'")).consumed, 2);

  // Both daily and monthly reservations roll back together on budget exhaustion.
  const future = Date.UTC(2030, 0, 10);
  const budgets = await Promise.allSettled(Array.from({ length: 10 }, () => consumeGoogle(db, 3, 5, future)));
  assert.equal(budgets.filter(result => result.status === 'fulfilled').length, 3);
  assert.equal((await db.prepare("SELECT consumed FROM usage_budgets WHERE scope='google-month' AND period_start = ?").bind(Date.UTC(2030, 0, 1)).first()).consumed, 3);
  await consumeGoogle(db, 3, 5, future + 86400000); await consumeGoogle(db, 3, 5, future + 86400000);
  await assert.rejects(consumeGoogle(db, 3, 5, future + 86400000));
  assert.equal((await db.prepare("SELECT consumed FROM usage_budgets WHERE scope='google-day' AND period_start = ?").bind(future + 86400000).first()).consumed, 2);
  const beforeFailure = calls.length;
  const failedToken = crypto.randomUUID();
  const failed = createHandler(async () => new Response('do-not-expose-provider-errors', { status: 500 }));
  const failure = await request('/api/address/suggestions', { input: 'Test', token: failedToken }, {}, failed, googleEnv);
  assert.equal(failure.status, 503);
  assert.ok(!(await failure.text()).includes('do-not-expose'));
  const fallbackToken = crypto.randomUUID();
  const fallback = createHandler(async (url, init) => String(url).includes('uldk.gugik.gov.pl')
    ? new Response('unavailable', { status: 503 }) : external(url, init));
  await request('/api/address/suggestions', { input: 'Test', token: fallbackToken }, {}, fallback, googleEnv);
  const withoutPrg = await request('/api/address/details', { id: 'test-place', token: fallbackToken }, {}, fallback, googleEnv);
  assert.equal(withoutPrg.status, 200);
  const manual = await withoutPrg.json(); assert.equal(manual.proof, undefined); assert.equal(manual.address.teryt, undefined);
  assert.ok(calls.length > beforeFailure);

  // Run the compiled application inside workerd as well as testing provider stubs.
  await proxy.dispose(); proxy = undefined;
  const bundle = join(state, 'bundle');
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'cloudflare/wrangler.jsonc', '--env', 'staging', '--dry-run', '--outdir', bundle], { env: { ...process.env, CI: 'true' } });
  runtime = new Miniflare(convertV4MiniflareOptions({ resourcePersistencePath: join(state, 'v3'), workers: [{ name: 'rpv-api-local',
    modules: true, modulesRoot: bundle, scriptPath: join(bundle, 'index.js'), compatibilityDate: '2026-10-11', compatibilityFlags: ['nodejs_compat'],
    bindings: { ENVIRONMENT: 'local', PUBLIC_ORIGINS: origin, SUBMISSIONS_ENABLED: 'true', GOOGLE_DAILY_LIMIT: '100', GOOGLE_MONTHLY_LIMIT: '1000', APP_SECRET: env.APP_SECRET, R2_STORAGE_LIMIT: '7500000000', R2_A_DAY_LIMIT: '1000', R2_A_MONTH_LIMIT: '10000', R2_B_DAY_LIMIT: '5000', R2_B_MONTH_LIMIT: '100000' },
    d1Databases: { DB: '00000000-0000-0000-0000-000000000001' }, r2Buckets: ['FILES'],
  }] }));
  const runtimeKey = crypto.randomUUID();
  const runtimeRequest = () => runtime.dispatchFetch('https://api.example.test/api/service', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json', 'Idempotency-Key': runtimeKey, 'CF-Connecting-IP': '192.0.2.200' }, body: JSON.stringify(example),
  });
  const actual = await runtimeRequest(); assert.equal(actual.status, 201, await actual.clone().text());
  assert.match((await actual.json()).reference, /^SRV-\d{4}-\d{6}$/);
  assert.equal((await runtimeRequest()).status, 200);
  const attachmentKey = crypto.randomUUID();
  const actualForm = new FormData(); actualForm.append('payload', JSON.stringify(example));
  actualForm.append('attachments', new Blob(['%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n'], { type: 'application/pdf' }), 'test.pdf');
  const encodedActual = new Request('https://api.example.test/api/service', { method: 'POST', body: actualForm });
  const actualUpload = await runtime.dispatchFetch('https://api.example.test/api/service', {
    method: 'POST', headers: { origin, 'Idempotency-Key': attachmentKey, 'CF-Connecting-IP': '192.0.2.201', 'Content-Type': encodedActual.headers.get('Content-Type') }, body: await encodedActual.arrayBuffer(),
  });
  assert.equal(actualUpload.status, 201, await actualUpload.clone().text());
  const runtimeDB = await runtime.getD1Database('DB');
  const actualAsset = await runtimeDB.prepare("SELECT object_key FROM file_assets WHERE original_name = 'test.pdf'").first();
  const runtimeBucket = await runtime.getR2Bucket('FILES');
  assert.ok((await (await runtimeBucket.get(actualAsset.object_key)).text()).startsWith('%PDF-'));
  console.log('Compiled Workers runtime: streaming multipart and private R2 put OK');
  console.log('Compiled Workers runtime: real HTTP handler, Web Crypto, shared validation and D1 receipt OK');
  console.log('Workers API: validation, multipart, persistence, idempotency races, limits, CORS, Google sessions, PRG/proof and atomic quotas OK');
} finally {
  if (proxy) await proxy.dispose();
  if (runtime) await runtime.dispose();
  await rm(state, { recursive: true, force: true });
}
