import assert from 'node:assert/strict';
import { getPlatformProxy } from 'wrangler';
import worker from '../cloudflare/src/index.ts';

// All bindings remain local even when validating a named production configuration.
for (const environment of [undefined, 'staging', 'production']) {
  const proxy = await getPlatformProxy({
    configPath: 'cloudflare/wrangler.jsonc',
    environment,
    persist: false,
    remoteBindings: false,
  });
  try {
    const expected = environment ?? 'local';
    assert.equal(proxy.env.ENVIRONMENT, expected);
    await proxy.env.DB.exec('CREATE TABLE infrastructure_probe (value TEXT NOT NULL)');
    await proxy.env.DB.prepare('INSERT INTO infrastructure_probe (value) VALUES (?)')
      .bind(expected).run();
    const row = await proxy.env.DB.prepare('SELECT value FROM infrastructure_probe').first();
    assert.equal(row.value, expected);

    const key = 'infrastructure-probe.txt';
    await proxy.env.FILES.put(key, expected);
    const object = await proxy.env.FILES.get(key);
    assert.equal(await object.text(), expected);
    await proxy.env.FILES.delete(key);
    assert.equal(await proxy.env.FILES.get(key), null);

    const response = await worker.fetch(new Request('https://example.test/api/health'), proxy.env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), {
      status: 'ok', environment: expected, phase: 'service-api',
    });
    const head = await worker.fetch(new Request('https://example.test/api/health', { method: 'HEAD' }), proxy.env);
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const post = await worker.fetch(new Request('https://example.test/api/health', { method: 'POST' }), proxy.env);
    assert.equal(post.status, 405);
    const missing = await worker.fetch(new Request('https://example.test/api/service'), proxy.env);
    assert.equal(missing.status, 405);
    console.log(`Cloudflare smoke: ${expected} — D1, R2 and health OK (local simulation)`);
  } finally {
    await proxy.dispose();
  }
}
