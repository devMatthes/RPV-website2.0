import type { WorkerEnv } from './config.ts';
import type { JWTVerifyGetKey } from 'jose';
import { administrator } from './admin-session.ts';
import { HttpError, json, objectBody, readBody } from './http.ts';
import { budgetBatch, cleanupFiles, operationStatements } from './storage.ts';
import { journalPrefix, parseJournal, purgeCases, withMaintenanceLock } from './retention.ts';

const checkpointKey = 'recovery/checkpoint.json';
const maxCheckpoint = 262144;
interface Budget { scope: string; metric: string; period_start: number; period_end: number; ceiling: number; consumed: number; reserved: number }
interface CaseState { id: string; status: string; updated_at: number; closed_at: number | null; delete_after: number | null }

async function prepare(env: WorkerEnv, now: number) {
  const uploading = await env.DB.prepare(`SELECT 1 AS busy FROM upload_requests WHERE expires_at>? UNION ALL
    SELECT 1 FROM r2_objects WHERE uploaded_at IS NULL AND created_at>? LIMIT 1`).bind(now,now-3600000).first();
  if (uploading) throw new HttpError(409,'Poczekaj na zakończenie lub wygaśnięcie rozpoczętych uploadów.');
  const scope = `r2:${env.ENVIRONMENT}:storage`;
  await budgetBatch(env, [
    env.DB.prepare("INSERT OR IGNORE INTO usage_budgets(scope,metric,period_start,period_end,ceiling) VALUES (?,'storage_bytes',0,8640000000000000,?)").bind(scope, Number(env.R2_STORAGE_LIMIT)),
    env.DB.prepare(`UPDATE usage_budgets SET consumed=consumed+max(0,?-coalesce((SELECT bytes FROM r2_objects WHERE object_key=?),0))
      WHERE scope=? AND metric='storage_bytes' AND period_start=0`).bind(maxCheckpoint,checkpointKey,scope),
    env.DB.prepare('INSERT INTO r2_objects(object_key,bytes,scope,created_at) VALUES(?,?,?,?) ON CONFLICT(object_key) DO UPDATE SET bytes=max(bytes,excluded.bytes),created_at=excluded.created_at').bind(checkpointKey, maxCheckpoint, scope, now),
    ...operationStatements(env, 'r2_class_a', now),
  ]);
  const budgets = await env.DB.prepare('SELECT * FROM usage_budgets WHERE period_end>? ORDER BY scope,metric,period_start LIMIT 21').bind(now).all<Budget>();
  const cases = await env.DB.prepare('SELECT id,status,updated_at,closed_at,delete_after FROM cases LIMIT 1001').all<CaseState>();
  if (budgets.results.length > 20) throw new HttpError(503, 'Zbyt duża historia limitów.');
  if (cases.results.length > 1000) throw new HttpError(503, 'Odtworzenie wymaga podziału punktu kontrolnego.');
  const payload = JSON.stringify({ schema: 1, environment: env.ENVIRONMENT, createdAt: now, budgets: budgets.results, cases: cases.results });
  if (new TextEncoder().encode(payload).length > maxCheckpoint) throw new HttpError(503, 'Zbyt duży punkt kontrolny.');
  await env.FILES.put(checkpointKey, payload, { httpMetadata: { contentType: 'application/json' }, storageClass: 'Standard' });
  await env.DB.prepare('UPDATE r2_objects SET uploaded_at=? WHERE object_key=?').bind(now, checkpointKey).run();
  return { prepared: true, next: 'Restore D1, apply all migrations, then call start. Keep RECOVERY_MODE=true.' };
}

async function start(env: WorkerEnv, now: number) {
  await budgetBatch(env, operationStatements(env, 'r2_class_b', now));
  const file = await env.FILES.get(checkpointKey);
  if (!file || file.size > maxCheckpoint) throw new HttpError(409, 'Brak punktu kontrolnego sprzed odtwarzania.');
  const checkpoint = JSON.parse(await file.text()) as { schema: number; environment: string; createdAt: number; budgets: Budget[]; cases: CaseState[] };
  if (checkpoint.schema !== 1 || checkpoint.environment !== env.ENVIRONMENT || !Number.isSafeInteger(checkpoint.createdAt) ||
      checkpoint.createdAt > now || checkpoint.createdAt < now - 86400000 || !Array.isArray(checkpoint.budgets) || checkpoint.budgets.length > 20) {
    throw new HttpError(409, 'Niepoprawny lub przeterminowany punkt kontrolny.');
  }
  const statements: D1PreparedStatement[] = [];
  if (!Array.isArray(checkpoint.cases) || checkpoint.cases.length > 1000 || checkpoint.cases.some(row =>
      !/^[a-f0-9-]{36}$/i.test(row.id) || !['new','active','waiting','closed'].includes(row.status) || !Number.isSafeInteger(row.updated_at) || row.updated_at < 0 ||
      (row.status==='closed' ? !Number.isSafeInteger(row.closed_at) || row.delete_after!==Number(row.closed_at)+86400000 : row.closed_at!==null || row.delete_after!==null))) throw new HttpError(409,'Niepoprawny stan retencji.');
  for (const row of checkpoint.budgets) {
    if (typeof row.scope !== 'string' || row.scope.length > 120 || !['storage_bytes','r2_class_a','r2_class_b','google_requests','submissions'].includes(row.metric) ||
        [row.period_start,row.period_end,row.ceiling,row.consumed,row.reserved].some(n => !Number.isSafeInteger(n) || n < 0) ||
        row.period_end <= row.period_start || row.consumed + row.reserved > row.ceiling) throw new HttpError(409, 'Niepoprawne liczniki w punkcie kontrolnym.');
    if (row.metric === 'storage_bytes') continue; // Rebuild actual storage from independent R2 inventory.
    statements.push(env.DB.prepare(`INSERT INTO usage_budgets(scope,metric,period_start,period_end,ceiling,consumed,reserved) VALUES(?,?,?,?,?,?,0)
      ON CONFLICT(scope,metric,period_start) DO UPDATE SET consumed=max(consumed,excluded.consumed),ceiling=min(ceiling,excluded.ceiling)`)
      .bind(row.scope,row.metric,row.period_start,row.period_end,row.ceiling,row.consumed + row.reserved));
  }
  const cases = JSON.stringify(checkpoint.cases);
  statements.push(
    env.DB.prepare(`UPDATE cases SET status=(SELECT json_extract(value,'$.status') FROM json_each(?) WHERE json_extract(value,'$.id')=cases.id),
      updated_at=max(submitted_at,updated_at,(SELECT json_extract(value,'$.updated_at') FROM json_each(?) WHERE json_extract(value,'$.id')=cases.id))
      WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?))`).bind(cases,cases,cases),
    env.DB.prepare(`UPDATE cases SET closed_at=(SELECT json_extract(value,'$.closed_at') FROM json_each(?) WHERE json_extract(value,'$.id')=cases.id),
      delete_after=(SELECT json_extract(value,'$.delete_after') FROM json_each(?) WHERE json_extract(value,'$.id')=cases.id)
      WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?))`).bind(cases,cases,cases),
    env.DB.prepare('DELETE FROM recovery_objects'), env.DB.prepare('DELETE FROM admin_sessions'),
    env.DB.prepare("INSERT INTO recovery_state VALUES(1,'markers',NULL,?,NULL) ON CONFLICT(id) DO UPDATE SET phase='markers',cursor=NULL,started_at=excluded.started_at,finished_at=NULL").bind(now));
  await env.DB.batch(statements);
  return { phase: 'markers', complete: false };
}

async function step(env: WorkerEnv, now: number) {
  const state = await env.DB.prepare('SELECT phase,cursor FROM recovery_state WHERE id=1').first<{ phase: string; cursor: string | null }>();
  if (!state) throw new HttpError(409, 'Najpierw uruchom start.');
  if (state.phase === 'complete') {
    await cleanupFiles(env, now, 50);
    const jobs = await env.DB.prepare('SELECT count(*) AS n FROM file_deletion_jobs').first<{ n: number }>();
    const missing = await env.DB.prepare("SELECT count(*) AS n FROM file_assets WHERE state='ready' AND NOT EXISTS(SELECT 1 FROM r2_objects o WHERE o.object_key=file_assets.object_key)").first<{ n: number }>();
    return { phase: 'complete', complete: (jobs?.n ?? 0) === 0, filesPending: jobs?.n ?? 0, missingFiles: missing?.n ?? 0 };
  }
  await budgetBatch(env, operationStatements(env, 'r2_class_a', now));
  const list = await env.FILES.list({ prefix: state.phase === 'markers' ? journalPrefix : undefined, limit: state.phase === 'markers' ? 3 : 100, cursor: state.cursor ?? undefined });
  if (state.phase === 'markers') {
    for (const item of list.objects) {
      if (item.size > 4096 || !/^retention\/[a-f0-9-]{36}\.json$/i.test(item.key)) throw new HttpError(503, 'Niepoprawny rejestr retencji.');
      await budgetBatch(env, operationStatements(env, 'r2_class_b', now));
      const file = await env.FILES.get(item.key);
      if (!file) continue; // A concurrent lifecycle expiry can remove an old journal.
      const journal = parseJournal(await file.text(), now);
      await env.DB.prepare(`DELETE FROM cases WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?))`)
        .bind(JSON.stringify(journal.cases)).run();
    }
    await cleanupFiles(env, now, 50);
    const remaining = await env.DB.prepare("SELECT count(*) AS n FROM cases WHERE status='closed' AND delete_after<=?").bind(now).first<{ n: number }>();
    if (!list.truncated && remaining?.n) {
      await purgeCases(env,now);
      // Repeat the final marker page until newly expired restored cases are purged.
    } else if (list.truncated) {
      await env.DB.prepare("UPDATE recovery_state SET cursor=? WHERE id=1").bind(list.cursor).run();
    } else {
      const queue = await env.DB.prepare('SELECT count(*) AS n FROM file_deletion_jobs').first<{ n: number }>();
      // Finish deletes before inventory; otherwise an earlier inventory page could resurrect ownership.
      if (queue?.n) return { complete: false, phase: 'markers', filesPending: queue.n, next: 'step' };
      await env.DB.prepare("UPDATE recovery_state SET phase='inventory',cursor=NULL WHERE id=1").run();
    }
  } else {
    await env.DB.batch([
      env.DB.prepare(`INSERT OR REPLACE INTO recovery_objects SELECT json_extract(value,'$.key'),json_extract(value,'$.size'),json_extract(value,'$.createdAt') FROM json_each(?)`)
        .bind(JSON.stringify(list.objects.map(item=>({key:item.key,size:item.size,createdAt:item.uploaded.getTime()})))),
      env.DB.prepare('UPDATE recovery_state SET cursor=? WHERE id=1').bind(list.truncated ? list.cursor : null),
    ]);
    if (!list.truncated) {
      const scope = `r2:${env.ENVIRONMENT}:storage`;
      // Never trust historical storage counters after restoring D1. Include every actual R2 object.
      await env.DB.batch([
        env.DB.prepare('DELETE FROM usage_reservations'),
        env.DB.prepare('UPDATE usage_budgets SET reserved=0'),
        env.DB.prepare('DELETE FROM r2_objects'),
        env.DB.prepare('INSERT INTO r2_objects SELECT object_key,bytes,?,created_at,? FROM recovery_objects').bind(scope, now),
        env.DB.prepare("INSERT INTO usage_budgets(scope,metric,period_start,period_end,ceiling,consumed) VALUES (?,'storage_bytes',0,8640000000000000,?,(SELECT coalesce(sum(bytes),0) FROM recovery_objects)) ON CONFLICT(scope,metric,period_start) DO UPDATE SET consumed=excluded.consumed,ceiling=min(ceiling,excluded.ceiling)").bind(scope,Number(env.R2_STORAGE_LIMIT)),
        env.DB.prepare("UPDATE recovery_state SET phase='complete',finished_at=? WHERE id=1").bind(now),
      ]);
    }
  }
  return { complete: false, phase: state.phase, next: 'step' };
}

export async function adminRecovery(request: Request, env: WorkerEnv, accessKeys?: JWTVerifyGetKey) {
  await administrator(request, env, accessKeys);
  if (env.RECOVERY_MODE !== 'true') throw new HttpError(409, 'Odtwarzanie wymaga RECOVERY_MODE=true.');
  const body = objectBody(await readBody(request));
  if (Object.keys(body).length !== 1 || !['prepare','start','step'].includes(String(body.action))) throw new HttpError(422, 'Niepoprawna operacja.');
  const now = Date.now();
  const result = await withMaintenanceLock<Record<string, unknown>>(env, now, () => body.action === 'prepare' ? prepare(env,now) : body.action === 'start' ? start(env,now) : step(env,now));
  if (!result) throw new HttpError(409, 'Trwa inna operacja odtwarzania.');
  return json(result);
}
