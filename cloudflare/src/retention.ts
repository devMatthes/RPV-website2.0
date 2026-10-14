import type { WorkerEnv } from './config.ts';
import { budgetBatch, cleanupFiles, operationStatements } from './storage.ts';
import { HttpError } from './http.ts';

export const journalLifetime = 8 * 86400000; // Free D1 history: 7 days, plus a recovery margin.
export const journalPrefix = 'retention/';
interface ExpiredCase { id: string; delete_after: number }
interface Journal { schema: 1; createdAt: number; expiresAt: number; cases: ExpiredCase[] }

export async function withMaintenanceLock<T>(env: WorkerEnv, now: number, work: () => Promise<T>): Promise<T | null> {
  const token = crypto.randomUUID();
  const won = await env.DB.prepare(`INSERT INTO maintenance_locks VALUES('maintenance',?,?)
    ON CONFLICT(name) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at
    WHERE expires_at<=? RETURNING token`).bind(token, now + 300000, now).first();
  if (!won) return null;
  try { return await work(); }
  finally { await env.DB.prepare("DELETE FROM maintenance_locks WHERE name='maintenance' AND token=?").bind(token).run(); }
}

export async function purgeCases(env: WorkerEnv, now: number) {
  let batch = await env.DB.prepare('SELECT * FROM retention_batches WHERE written_at IS NULL ORDER BY expires_at LIMIT 1')
    .first<{ id: string; object_key: string; payload_json: string; expires_at: number }>();
  if (!batch) {
    const rows = await env.DB.prepare(`SELECT id,delete_after FROM cases WHERE delete_after<=? AND status='closed'
      ORDER BY delete_after,id LIMIT 20`).bind(now).all<ExpiredCase>();
    if (!rows.results.length) return 0;
    const id = crypto.randomUUID(), key = journalPrefix + id + '.json';
    const payload = JSON.stringify({ schema: 1, createdAt: now, expiresAt: now + journalLifetime, cases: rows.results } satisfies Journal);
    const bytes = 4096; // Conservative fixed reservation; journal is bounded below this size.
    const scope = `r2:${env.ENVIRONMENT}:storage`;
    // The intent and storage ownership commit before R2. An ambiguous put is retried.
    await budgetBatch(env, [
      env.DB.prepare("INSERT OR IGNORE INTO usage_budgets(scope,metric,period_start,period_end,ceiling) VALUES (?,'storage_bytes',0,8640000000000000,?)").bind(scope, Number(env.R2_STORAGE_LIMIT)),
      env.DB.prepare("UPDATE usage_budgets SET consumed=consumed+?,ceiling=min(ceiling,?) WHERE scope=? AND metric='storage_bytes' AND period_start=0").bind(bytes, Number(env.R2_STORAGE_LIMIT), scope),
      env.DB.prepare('INSERT INTO r2_objects(object_key,bytes,scope,created_at) VALUES(?,?,?,?)').bind(key, bytes, scope, now),
      env.DB.prepare('INSERT INTO retention_batches(id,object_key,payload_json,expires_at) VALUES(?,?,?,?)').bind(id, key, payload, now + journalLifetime),
    ]);
    batch = { id, object_key: key, payload_json: payload, expires_at: now + journalLifetime };
  }
  // A long outage must not shorten the journal's lifetime after the eventual purge.
  const data = JSON.parse(batch.payload_json) as Journal;
  const payload = JSON.stringify({ ...data, createdAt: now, expiresAt: now + journalLifetime });
  // Fail closed: never physically purge before the independent journal is durable.
  await budgetBatch(env, operationStatements(env, 'r2_class_a', now));
  await env.FILES.put(batch.object_key, payload, { httpMetadata: { contentType: 'application/json' }, storageClass: 'Standard' });
  const [removed] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM cases WHERE status='closed' AND delete_after<=? AND EXISTS
      (SELECT 1 FROM json_each(?) j WHERE json_extract(j.value,'$.id')=cases.id
       AND json_extract(j.value,'$.delete_after')=cases.delete_after) RETURNING id`).bind(now, JSON.stringify(data.cases)),
    env.DB.prepare('UPDATE retention_batches SET written_at=?,payload_json=?,expires_at=? WHERE id=?').bind(now, payload, now + journalLifetime, batch.id),
    env.DB.prepare('UPDATE r2_objects SET uploaded_at=?,created_at=? WHERE object_key=?').bind(now,now,batch.object_key),
  ]);
  return removed.results.length;
}

export async function maintenance(env: WorkerEnv, now: number) {
  if (env.RECOVERY_MODE === 'true') return { recovery: true };
  return withMaintenanceLock(env, now, async () => {
    // R2 journal failure must not prevent retrying previously queued file deletes.
    let cases = 0, purgeFailed = false;
    try { cases = await purgeCases(env, now); } catch { purgeFailed = true; }
    await env.DB.prepare('DELETE FROM retention_batches WHERE id IN (SELECT id FROM retention_batches WHERE written_at IS NOT NULL AND expires_at<=? LIMIT 20)').bind(now).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO file_deletion_jobs(object_key,queued_at,retry_after)
      SELECT object_key,?,? FROM r2_objects WHERE object_key='recovery/checkpoint.json' AND created_at<=?`).bind(now,now,now-86400000).run();
    // Recovery can rebuild R2 inventory from objects newer than the restored SQL.
    await env.DB.prepare(`INSERT OR IGNORE INTO file_deletion_jobs(object_key,queued_at,retry_after)
      SELECT object_key,?,? FROM r2_objects WHERE object_key>='retention/' AND object_key<'retention0' AND created_at<=?
      AND NOT EXISTS(SELECT 1 FROM retention_batches b WHERE b.object_key=r2_objects.object_key AND b.written_at IS NULL) LIMIT 20`)
      .bind(now,now,now-journalLifetime).run();
    await cleanupFiles(env, now, 50);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash IN (SELECT token_hash FROM admin_sessions WHERE expires_at<=? LIMIT 100)').bind(now),
      env.DB.prepare('DELETE FROM address_sessions WHERE token_hash IN (SELECT token_hash FROM address_sessions WHERE expires_at<=? LIMIT 100)').bind(now),
      env.DB.prepare('DELETE FROM rate_limit_windows WHERE rowid IN (SELECT rowid FROM rate_limit_windows WHERE expires_at<=? LIMIT 1000)').bind(now),
    ]);
    const remaining = await env.DB.prepare('SELECT count(*) AS n FROM cases WHERE delete_after<=? AND status=\'closed\'').bind(now).first<{ n: number }>();
    const files = await env.DB.prepare('SELECT count(*) AS n FROM file_deletion_jobs').first<{ n: number }>();
    return { casesPurged: cases, casesPending: remaining?.n ?? 0, filesPending: files?.n ?? 0, purgeFailed };
  });
}

export function parseJournal(text: string, now: number): Journal {
  const data = JSON.parse(text) as Journal;
  if (data.schema !== 1 || !Number.isSafeInteger(data.createdAt) || data.createdAt > now ||
      data.expiresAt !== data.createdAt + journalLifetime || !Array.isArray(data.cases) || data.cases.length < 1 || data.cases.length > 20 ||
      data.cases.some(row => !/^[a-f0-9-]{36}$/i.test(row.id) || !Number.isSafeInteger(row.delete_after) || row.delete_after > data.createdAt)) {
    throw new HttpError(503, 'Niepoprawny rejestr retencji. Tryb odtwarzania pozostaje włączony.');
  }
  return data;
}
