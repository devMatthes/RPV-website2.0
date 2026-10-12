import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';

const state = await mkdtemp(join(tmpdir(), 'rpv-d1-test-'));
const migrate = () => execFileSync(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB',
  '--config', 'cloudflare/wrangler.jsonc', '--local', '--persist-to', state,
], { encoding: 'utf8', env: { ...process.env, CI: 'true' } });
let proxy;
try {
  migrate();
  proxy = await getPlatformProxy({ configPath: 'cloudflare/wrangler.jsonc', persist: { path: join(state, 'v3') }, remoteBindings: false });
  const db = proxy.env.DB;
  const run = (sql, ...params) => db.prepare(sql).bind(...params).run();
  const first = (sql, ...params) => db.prepare(sql).bind(...params).first();
  const hash = 'a'.repeat(64);
  const now = 1800000000000;
  const createCase = (id, module = 'serwis') => run(`INSERT INTO cases
    (id,reference,module,submitted_at,updated_at,name,email,phone,subject,message,address_json,installation_json,privacy_accepted_at,idempotency_key_hash,fingerprint)
    VALUES (?,?,?,?,?,'Test','test@example.test','+48123456789','Test','Test',?,?,?, ?,?)`,
    id, id, module, now, now, module === 'serwis' ? '{"city":"Test","commune":"Test"}' : null,
    module === 'serwis' ? '{}' : null, now, id.padEnd(64, '0'), hash);
  const asset = (id, visibility = 'private', bytes = 1024) => run(`INSERT INTO file_assets
    (id,object_key,visibility,original_name,content_type,bytes,sha256,state,created_at)
    VALUES (?,?,?,'test.jpg','image/jpeg',?,?,'ready',?)`, id, `opaque/${id}`, visibility, bytes, hash, now);

  await run("INSERT INTO administrators VALUES (1,'admin',1,?)", now);
  await assert.rejects(run("INSERT INTO administrators VALUES (2,'second',1,?)", now));
  await run('INSERT INTO admin_sessions VALUES (?,1,1,?,?)', hash, now, now + 10000);
  await assert.rejects(run('INSERT INTO admin_sessions VALUES (?,1,1,?,?)', 'plain-token', now, now + 10000));
  await assert.rejects(run('INSERT INTO admin_sessions VALUES (?,1,1,?,?)', 'b'.repeat(64), now, now));

  await createCase('service');
  await createCase('contact', 'kontakt');
  await assert.rejects(createCase('service'));
  await assert.rejects(run("UPDATE cases SET address_json = NULL WHERE id = 'service'"));
  await assert.rejects(run("UPDATE cases SET address_json = 'invalid-json' WHERE id = 'service'"));
  await assert.rejects(run("UPDATE cases SET status = 'waiting' WHERE id = 'contact'"));
  await run("UPDATE cases SET status = 'closed', updated_at = ? WHERE id = 'service'", now + 1000);
  assert.equal((await first("SELECT delete_after FROM cases WHERE id = 'service'")).delete_after, now + 1000 + 86400000);
  await run("UPDATE cases SET status = 'closed', updated_at = ? WHERE id = 'service'", now + 2000);
  assert.equal((await first("SELECT delete_after FROM cases WHERE id = 'service'")).delete_after, now + 1000 + 86400000);
  await run("UPDATE cases SET status = 'active', updated_at = ? WHERE id = 'service'", now + 3000);
  assert.deepEqual(await first("SELECT closed_at,delete_after FROM cases WHERE id = 'service'"), { closed_at: null, delete_after: null });
  await run("UPDATE cases SET status = 'closed', updated_at = ? WHERE id = 'service'", now + 4000);
  assert.equal((await first("SELECT delete_after FROM cases WHERE id = 'service'")).delete_after, now + 4000 + 86400000);
  // Optimistic locking: a stale panel revision must not overwrite a newer edit.
  assert.equal((await run("UPDATE cases SET revision = revision + 1 WHERE id = 'contact' AND revision = 1")).meta.changes, 1);
  assert.equal((await run("UPDATE cases SET revision = revision + 1 WHERE id = 'contact' AND revision = 1")).meta.changes, 0);

  await run("INSERT INTO case_events(case_id,at,actor,kind,message) VALUES ('service',?,'Admin','note','Test')", now);
  await asset('private');
  await asset('cms', 'cms');
  await run("INSERT INTO case_attachments VALUES ('service','private',0)");
  await assert.rejects(run("INSERT INTO case_attachments VALUES ('contact','private',0)"));
  await assert.rejects(run("INSERT INTO case_attachments VALUES ('service','cms',1)"));
  await assert.rejects(run("UPDATE file_assets SET visibility = 'cms' WHERE id = 'private'"));
  await assert.rejects(run("UPDATE file_assets SET bytes = 2048 WHERE id = 'private'"));
  await assert.rejects(run("INSERT INTO case_attachments VALUES ('missing','cms',0)"));
  for (let i = 0; i < 5; i++) await asset(`big${i}`, 'private', 5242880);
  for (let i = 0; i < 4; i++) await run('INSERT INTO case_attachments VALUES (?,?,?)', 'contact', `big${i}`, i);
  await assert.rejects(run("INSERT INTO case_attachments VALUES ('contact','big4',4)"));
  await assert.rejects(run("INSERT INTO case_attachments VALUES ('contact','big4',5)"));

  await run(`INSERT INTO cms_entries VALUES ('project','project','test','{"title":"Draft"}',1,?)`, now);
  await run(`INSERT INTO cms_versions VALUES ('v1','project',1,'{"title":"Approved"}',?)`, now);
  await run(`UPDATE cms_entries SET draft_json = '{"title":"Changed draft"}', revision = 2 WHERE id = 'project'`);
  assert.equal((await first("SELECT content_json FROM cms_versions WHERE id = 'v1'")).content_json, '{"title":"Approved"}');
  await assert.rejects(run("UPDATE cms_versions SET content_json = '{}' WHERE id = 'v1'"));
  await run("INSERT INTO cms_version_assets VALUES ('v1','cms',0)");
  await assert.rejects(run("INSERT INTO cms_version_assets VALUES ('v1','private',1)"));
  await assert.rejects(run("UPDATE cms_version_assets SET asset_id = 'private' WHERE version_id = 'v1'"));
  await assert.rejects(run("DELETE FROM file_assets WHERE id = 'cms'"));
  await run("DELETE FROM cases WHERE id = 'service'");
  assert.equal((await first("SELECT count(*) AS n FROM case_events WHERE case_id = 'service'")).n, 0);
  assert.equal(await first("SELECT * FROM file_assets WHERE id = 'private'"), null);
  assert.ok(await first("SELECT * FROM file_deletion_jobs WHERE object_key = 'opaque/private'"));
  assert.ok(await first("SELECT * FROM file_assets WHERE id = 'cms'"));
  // Outbox survives client data deletion; retries do not need customer data.
  await run("DELETE FROM cases WHERE id = 'contact'");
  assert.equal((await first('SELECT count(*) AS n FROM case_attachments')).n, 0);
  assert.equal((await first('SELECT count(*) AS n FROM file_deletion_jobs')).n, 5);

  // A failing statement rolls back the complete D1 batch.
  await assert.rejects(db.batch([
    db.prepare("INSERT INTO counters VALUES ('rollback',1)"),
    db.prepare("INSERT INTO counters VALUES ('rollback',2)"),
  ]));
  assert.equal(await first("SELECT * FROM counters WHERE key = 'rollback'"), null);
  await run("INSERT INTO usage_budgets VALUES ('production','storage_bytes',0,?,10,0,0)", now);
  const results = await Promise.all(Array.from({ length: 20 }, () => run(`UPDATE usage_budgets
    SET reserved = reserved + 1 WHERE scope = 'production' AND metric = 'storage_bytes'
    AND period_start = 0 AND consumed + reserved + 1 <= ceiling`)));
  assert.equal(results.filter(result => result.meta.changes === 1).length, 10);
  assert.equal((await first('SELECT reserved FROM usage_budgets')).reserved, 10);
  await assert.rejects(run('UPDATE usage_budgets SET consumed = 1'));
  await run('UPDATE usage_budgets SET reserved = reserved - 1, consumed = consumed + 1');
  await assert.rejects(run("INSERT INTO usage_reservations VALUES ('bad','missing','storage_bytes',0,1,?)", now));
  // Indexed list and retention queries avoid full scans as the database grows.
  for (const sql of [
    "SELECT id FROM cases WHERE module = 'serwis' AND status = 'new' ORDER BY submitted_at DESC,id DESC LIMIT 20",
    'SELECT id FROM cases WHERE delete_after <= 1800000000000 LIMIT 20',
  ]) {
    const plan = await db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
    assert.ok(plan.results.some(row => /USING (COVERING )?INDEX/.test(row.detail)), JSON.stringify(plan.results));
  }
  await run("INSERT INTO counters VALUES ('migration-preserved',7)");
  await proxy.dispose(); proxy = undefined;
  assert.match(migrate(), /No migrations to apply/);
  proxy = await getPlatformProxy({ configPath: 'cloudflare/wrangler.jsonc', persist: { path: join(state, 'v3') }, remoteBindings: false });
  assert.equal((await proxy.env.DB.prepare("SELECT value FROM counters WHERE key = 'migration-preserved'").first()).value, 7);
  assert.equal((await proxy.env.DB.prepare('SELECT count(*) AS n FROM d1_migrations').first()).n, 3);
  console.log('D1 migrations: retention, private files, CMS isolation, session constraints, atomic budgets, rollback and reapply OK');
} finally {
  if (proxy) await proxy.dispose();
  await rm(state, { recursive: true, force: true });
}
