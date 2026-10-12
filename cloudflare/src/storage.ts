import type { WorkerEnv } from './config.ts';
import { HttpError } from './http.ts';
export interface StoredUpload { id: string; key: string; name: string; mime: string; bytes: number; hash: string; }
const storageEnd = 8640000000000000;
function limit(value: string) {
  const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) throw new HttpError(503, 'Niepoprawna konfiguracja limitów.'); return n;
}
export function operationStatements(env: WorkerEnv, metric: 'r2_class_a' | 'r2_class_b', now: number): D1PreparedStatement[] {
  const date = new Date(now); const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  const monthly = limit(metric === 'r2_class_a' ? env.R2_A_MONTH_LIMIT : env.R2_B_MONTH_LIMIT);
  const daily = limit(metric === 'r2_class_a' ? env.R2_A_DAY_LIMIT : env.R2_B_DAY_LIMIT);
  return [[`r2:${env.ENVIRONMENT}:month`, month, end, monthly], [`r2:${env.ENVIRONMENT}:day`, day, day + 86400000, daily]].flatMap(([scope, start, finish, ceiling]) => [
    env.DB.prepare('INSERT OR IGNORE INTO usage_budgets(scope,metric,period_start,period_end,ceiling) VALUES (?,?,?,?,?)').bind(scope, metric, start, finish, ceiling),
    env.DB.prepare('UPDATE usage_budgets SET consumed = consumed + 1, ceiling = min(ceiling,?) WHERE scope = ? AND metric = ? AND period_start = ?').bind(ceiling, scope, metric, start),
  ]);
}
export async function budgetBatch(env: WorkerEnv, statements: D1PreparedStatement[]) {
  try { await env.DB.batch(statements); }
  catch (error) {
    if (error instanceof Error && error.message.includes('CHECK constraint failed')) throw new HttpError(503, 'Limit załączników został osiągnięty. Spróbuj później lub skontaktuj się telefonicznie.');
    throw error;
  }
}
export async function upload(env: WorkerEnv, file: StoredUpload, bytes: Uint8Array, now: number) {
  const scope = `r2:${env.ENVIRONMENT}:storage`;
  await budgetBatch(env, [
    env.DB.prepare("INSERT OR IGNORE INTO usage_budgets(scope,metric,period_start,period_end,ceiling) VALUES (?,'storage_bytes',0,?,?)").bind(scope, storageEnd, limit(env.R2_STORAGE_LIMIT)),
    env.DB.prepare("UPDATE usage_budgets SET consumed = consumed + ?, ceiling = min(ceiling,?) WHERE scope = ? AND metric = 'storage_bytes' AND period_start = 0").bind(file.bytes, limit(env.R2_STORAGE_LIMIT), scope),
    ...operationStatements(env, 'r2_class_a', now),
    env.DB.prepare('INSERT INTO r2_objects(object_key,bytes,scope,created_at) VALUES (?,?,?,?)').bind(file.key, file.bytes, scope, now),
    env.DB.prepare(`INSERT INTO file_assets(id,object_key,visibility,original_name,content_type,bytes,sha256,state,created_at,expires_at)
      VALUES (?,?,'private',?,?,?,?,'pending',?,?)`).bind(file.id, file.key, file.name, file.mime, file.bytes, file.hash, now, now + 3600000),
  ]);
  // Charge before calling R2; failed/ambiguous puts retain usage and storage ownership.
  await env.FILES.put(file.key, bytes, { httpMetadata: { contentType: file.mime }, storageClass: 'Standard' });
  await env.DB.prepare('UPDATE r2_objects SET uploaded_at = ? WHERE object_key = ?').bind(Date.now(), file.key).run();
}
export async function discardUploads(env: WorkerEnv, ids: string[]) {
  if (ids.length) await env.DB.batch(ids.map(id => env.DB.prepare("DELETE FROM file_assets WHERE id = ? AND state = 'pending'").bind(id)));
  await cleanupFiles(env, Date.now());
}
export async function cleanupFiles(env: WorkerEnv, now: number) {
  await env.DB.prepare(`DELETE FROM file_assets WHERE id IN
    (SELECT a.id FROM file_assets a WHERE a.state = 'pending' AND a.expires_at <= ?
     AND NOT EXISTS(SELECT 1 FROM case_attachments ca WHERE ca.asset_id = a.id) LIMIT 20)`).bind(now).run();
  const jobs = await env.DB.prepare('SELECT object_key,attempts FROM file_deletion_jobs WHERE retry_after <= ? ORDER BY retry_after LIMIT 5').bind(now).all<{ object_key: string; attempts: number }>();
  for (const job of jobs.results) {
    try {
      const uncertain = await env.DB.prepare('SELECT created_at,uploaded_at FROM r2_objects WHERE object_key = ?').bind(job.object_key).first<{ created_at: number; uploaded_at: number | null }>();
      if (uncertain && uncertain.uploaded_at === null && uncertain.created_at + 3600000 > now) {
        await env.DB.prepare('UPDATE file_deletion_jobs SET retry_after = ? WHERE object_key = ?').bind(uncertain.created_at + 3600000, job.object_key).run();
        continue;
      }
      // DeleteObject is free and remains available when read/write quotas are exhausted.
      await env.FILES.delete(job.object_key);
      await env.DB.batch([
        env.DB.prepare(`UPDATE usage_budgets SET consumed = consumed - coalesce((SELECT bytes FROM r2_objects WHERE object_key = ?),0)
          WHERE metric = 'storage_bytes' AND period_start = 0 AND scope = (SELECT scope FROM r2_objects WHERE object_key = ?)`)
          .bind(job.object_key, job.object_key),
        env.DB.prepare('DELETE FROM r2_objects WHERE object_key = ?').bind(job.object_key),
        env.DB.prepare('DELETE FROM file_deletion_jobs WHERE object_key = ?').bind(job.object_key),
      ]);
    } catch {
      await env.DB.prepare('UPDATE file_deletion_jobs SET attempts = attempts + 1, retry_after = ? WHERE object_key = ?')
        .bind(now + Math.min(86400000, 60000 * 2 ** Math.min(job.attempts, 10)), job.object_key).run();
    }
  }
  await env.DB.prepare('DELETE FROM upload_requests WHERE key_hash IN (SELECT key_hash FROM upload_requests WHERE expires_at <= ? LIMIT 20)').bind(now).run();
}
