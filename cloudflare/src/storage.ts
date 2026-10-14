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
export async function upload(env: WorkerEnv, file: StoredUpload, bytes: Uint8Array, now: number, visibility: 'private' | 'cms' = 'private') {
  const scope = `r2:${env.ENVIRONMENT}:storage`;
  await budgetBatch(env, [
    env.DB.prepare("INSERT OR IGNORE INTO usage_budgets(scope,metric,period_start,period_end,ceiling) VALUES (?,'storage_bytes',0,?,?)").bind(scope, storageEnd, limit(env.R2_STORAGE_LIMIT)),
    // Keep maintenance journal headroom at real deployment sizes. CHECK rolls back all writes on exhaustion.
    env.DB.prepare(`UPDATE usage_budgets SET consumed = CASE WHEN consumed+?<=?-? THEN consumed+? ELSE -1 END,
      ceiling=min(ceiling,?) WHERE scope=? AND metric='storage_bytes' AND period_start=0`)
      .bind(file.bytes,limit(env.R2_STORAGE_LIMIT),limit(env.R2_STORAGE_LIMIT)>=10485760?1048576:0,file.bytes,limit(env.R2_STORAGE_LIMIT),scope),
    ...operationStatements(env, 'r2_class_a', now),
    env.DB.prepare('INSERT INTO r2_objects(object_key,bytes,scope,created_at) VALUES (?,?,?,?)').bind(file.key, file.bytes, scope, now),
    env.DB.prepare(`INSERT INTO file_assets(id,object_key,visibility,original_name,content_type,bytes,sha256,state,created_at,expires_at)
      VALUES (?,?,?,?,?,?,?,'pending',?,?)`).bind(file.id, file.key, visibility, file.name, file.mime, file.bytes, file.hash, now, now + 3600000),
  ]);
  // Charge before calling R2; failed/ambiguous puts retain usage and storage ownership.
  await env.FILES.put(file.key, bytes, { httpMetadata: { contentType: file.mime }, storageClass: 'Standard' });
  await env.DB.prepare('UPDATE r2_objects SET uploaded_at = ? WHERE object_key = ?').bind(Date.now(), file.key).run();
}
export async function discardUploads(env: WorkerEnv, ids: string[]) {
  if (ids.length) await env.DB.batch(ids.map(id => env.DB.prepare("DELETE FROM file_assets WHERE id = ? AND state = 'pending'").bind(id)));
  await cleanupFiles(env, Date.now());
}
export async function cleanupFiles(env: WorkerEnv, now: number, jobLimit = 5) {
  await env.DB.prepare(`DELETE FROM file_assets WHERE id IN
    (SELECT a.id FROM file_assets a WHERE a.state = 'pending' AND a.expires_at <= ?
     AND NOT EXISTS(SELECT 1 FROM case_attachments ca WHERE ca.asset_id = a.id)
     AND NOT EXISTS(SELECT 1 FROM cms_draft_assets da WHERE da.asset_id = a.id)
     AND NOT EXISTS(SELECT 1 FROM cms_version_assets va WHERE va.asset_id = a.id) LIMIT 20)`).bind(now).run();
  const jobs = await env.DB.prepare(`SELECT j.object_key,j.attempts,o.created_at,o.uploaded_at FROM file_deletion_jobs j
    LEFT JOIN r2_objects o ON o.object_key=j.object_key WHERE j.retry_after<=? ORDER BY j.retry_after LIMIT ?`)
    .bind(now,Math.min(50,Math.max(1,jobLimit))).all<{object_key:string;attempts:number;created_at:number|null;uploaded_at:number|null}>();
  const uncertain=jobs.results.filter(job=>job.created_at!==null && job.uploaded_at===null && job.created_at+3600000>now);
  if(uncertain.length)await env.DB.prepare(`UPDATE file_deletion_jobs SET retry_after=(SELECT created_at+3600000 FROM r2_objects o WHERE o.object_key=file_deletion_jobs.object_key)
    WHERE object_key IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(uncertain.map(job=>job.object_key))).run();
  const keys=jobs.results.filter(job=>!uncertain.includes(job)).map(job=>job.object_key);
  if(keys.length){
    const encoded=JSON.stringify(keys);
    try {
      // Batch DeleteObject is free. Ambiguous failures retain ownership until retry succeeds.
      await env.FILES.delete(keys);
      await env.DB.batch([
        env.DB.prepare(`UPDATE usage_budgets SET consumed=consumed-coalesce((SELECT sum(bytes) FROM r2_objects o WHERE o.scope=usage_budgets.scope
          AND o.object_key IN (SELECT value FROM json_each(?))),0) WHERE metric='storage_bytes' AND period_start=0`).bind(encoded),
        env.DB.prepare('DELETE FROM r2_objects WHERE object_key IN (SELECT value FROM json_each(?))').bind(encoded),
        env.DB.prepare('DELETE FROM file_deletion_jobs WHERE object_key IN (SELECT value FROM json_each(?))').bind(encoded),
      ]);
    } catch {
      await env.DB.prepare(`UPDATE file_deletion_jobs SET attempts=attempts+1,retry_after=?+min(86400000,60000*(1<<min(attempts,10)))
        WHERE object_key IN (SELECT value FROM json_each(?))`).bind(now,encoded).run();
    }
  }
  await env.DB.prepare('DELETE FROM upload_requests WHERE key_hash IN (SELECT key_hash FROM upload_requests WHERE expires_at <= ? LIMIT 20)').bind(now).run();
}
