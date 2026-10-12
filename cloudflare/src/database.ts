import type { ServiceSubmission } from '../../src/lib/service-types.ts';
import type { ContactSubmission } from '../../src/lib/contact-types.ts';
import type { StoredUpload } from './storage.ts';
import { HttpError } from './http.ts';
export async function consumeWindow(db: D1Database, owner: string, action: string, max: number, duration: number, now: number) {
  const start = Math.floor(now / duration) * duration;
  const row = await db.prepare(`INSERT INTO rate_limit_windows VALUES (?,?,?,?,1)
    ON CONFLICT(scope_hash,action,window_start) DO UPDATE SET hits = hits + 1
    WHERE hits < ? RETURNING hits`).bind(owner, action, start, start + duration, max).first();
  if (!row) throw new HttpError(429, 'Zbyt wiele prób. Spróbuj ponownie później.', undefined, Math.ceil((start + duration - now) / 1000));
}
export async function consumeGoogle(db: D1Database, daily: number, monthly: number, now: number) {
  const date = new Date(now); const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  const statements = [
    ['google-day', day, day + 86400000, daily], ['google-month', month, nextMonth, monthly],
  ].flatMap(([scope, start, end, ceiling]) => [
    db.prepare("INSERT OR IGNORE INTO usage_budgets(scope,metric,period_start,period_end,ceiling) VALUES (?,'google_requests',?,?,?)").bind(scope, start, end, ceiling),
    db.prepare("UPDATE usage_budgets SET consumed = consumed + 1, ceiling = min(ceiling, ?) WHERE scope = ? AND metric = 'google_requests' AND period_start = ?").bind(ceiling, scope, start),
  ]);
  try { await db.batch(statements); }
  catch (error) {
    if (error instanceof Error && error.message.includes('CHECK constraint failed')) throw new HttpError(429, 'Limit podpowiedzi osiągnięty. Wpisz adres ręcznie.');
    throw error;
  }
}
export async function existing(db: D1Database, keyHash: string) {
  return db.prepare('SELECT reference,fingerprint FROM cases WHERE idempotency_key_hash = ?').bind(keyHash).first<{ reference: string; fingerprint: string }>();
}
export async function insertContact(db:D1Database,data:ContactSubmission,keyHash:string,fingerprint:string,now:number) {
  const id=crypto.randomUUID(),year=new Date(now).getUTCFullYear(),counter=`contact:${year}`;
  try {
    await db.batch([
      db.prepare('INSERT INTO counters VALUES (?,1) ON CONFLICT(key) DO UPDATE SET value=value+1').bind(counter),
      db.prepare(`INSERT INTO cases(id,reference,module,submitted_at,updated_at,name,email,phone,subject,message,privacy_accepted_at,idempotency_key_hash,fingerprint)
        SELECT ?,'KON-'||?||'-'||printf('%06d',value),'kontakt',?,?,?,?,?,?,?,?,?,? FROM counters WHERE key=?`)
        .bind(id,String(year),now,now,data.name,data.email,data.phone,data.topic,data.message,now,keyHash,fingerprint,counter),
      db.prepare("INSERT INTO case_events(case_id,at,actor,kind,message) VALUES (?,?,'System','created','Wiadomość zapisana.')").bind(id,now),
    ]);
    const row=await existing(db,keyHash);if(!row)throw new Error('Receipt missing');
    return {reference:row.reference,created:true};
  } catch(error) {
    const retry=await existing(db,keyHash);
    if(retry) {
      if(retry.fingerprint!==fingerprint)throw new HttpError(409,'Dane zmieniły się od poprzedniej wysyłki. Rozpocznij nową wysyłkę.');
      return {reference:retry.reference,created:false};
    }
    throw error;
  }
}
export async function insertService(db: D1Database, data: ServiceSubmission, keyHash: string, fingerprint: string, now: number, files: StoredUpload[] = []) {
  const id = crypto.randomUUID(); const year = new Date(now).getUTCFullYear(); const counter = `service:${year}`;
  try {
    await db.batch([
      db.prepare('INSERT INTO counters VALUES (?,1) ON CONFLICT(key) DO UPDATE SET value = value + 1').bind(counter),
      db.prepare(`INSERT INTO cases (id,reference,module,submitted_at,updated_at,name,email,phone,subject,message,
        address_json,installation_json,privacy_accepted_at,idempotency_key_hash,fingerprint)
        SELECT ?, 'SRV-' || ? || '-' || printf('%06d',value), 'serwis',?,?,?,?,?,?,?,?,?,?,?,? FROM counters WHERE key = ?`)
        .bind(id, String(year), now, now, data.name, data.email, data.phone, data.installation, data.message,
          JSON.stringify(data.address), JSON.stringify({ installation: data.installation, inverter: data.inverter, battery: data.battery }), now, keyHash, fingerprint, counter),
      ...files.flatMap((file, position) => [
        db.prepare("UPDATE file_assets SET state = 'ready', expires_at = NULL WHERE id = ? AND state = 'pending'").bind(file.id),
        db.prepare('INSERT INTO case_attachments VALUES (?,?,?)').bind(id, file.id, position),
      ]),
      db.prepare("INSERT INTO case_events(case_id,at,actor,kind,message) VALUES (?,?,'System','created','Zgłoszenie zapisane.')").bind(id, now),
    ]);
    const row = await existing(db, keyHash); if (!row) throw new Error('Receipt missing');
    return { reference: row.reference, created: true };
  } catch (error) {
    const retry = await existing(db, keyHash);
    if (retry) {
      if (retry.fingerprint !== fingerprint) throw new HttpError(409, 'Dane zmieniły się od poprzedniej wysyłki. Rozpocznij nową wysyłkę.');
      return { reference: retry.reference, created: false };
    }
    throw error;
  }
}
