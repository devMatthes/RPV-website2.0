import type { WorkerEnv } from './config.ts';
import { HttpError, json, objectBody, readBody } from './http.ts';
import { administrator } from './admin-session.ts';

interface CaseRow {
  id: string; reference: string; module: string; submitted_at: number; name: string; email: string; phone: string;
  subject: string; message: string; address_json: string | null; installation_json: string | null;
  status: string; owner: string | null; revision: number; delete_after: number | null;
}
const selection = `SELECT c.*,a.username AS owner FROM cases c LEFT JOIN administrators a ON a.id=c.owner_id`;
const visible = '(c.delete_after IS NULL OR c.delete_after>?)';
function record(row: CaseRow) {
  return { id: row.id, reference: row.reference, module: row.module, submittedAt: new Date(row.submitted_at).toISOString(),
    status: row.status, owner: row.owner ?? '', revision: row.revision,
    deleteAfter: row.delete_after ? new Date(row.delete_after).toISOString() : null,
    data: { name: row.name, email: row.email, phone: row.phone, message: row.message,
      address: row.address_json ? JSON.parse(row.address_json) : null,
      ...(row.installation_json ? JSON.parse(row.installation_json) : { subject: row.subject }) } };
}
async function getCase(env: WorkerEnv, id: string) {
  const row = await env.DB.prepare(`${selection} WHERE c.id=? AND ${visible}`).bind(id, Date.now()).first<CaseRow>();
  if (!row) throw new HttpError(404, 'Nie znaleziono zgłoszenia.');
  return row;
}
async function detail(env: WorkerEnv, row: CaseRow) {
  const [files, events] = await Promise.all([
    env.DB.prepare(`SELECT a.id,a.original_name AS name,a.content_type AS mime,a.bytes AS size FROM case_attachments ca
      JOIN file_assets a ON a.id=ca.asset_id WHERE ca.case_id=? AND a.state='ready' ORDER BY ca.position`).bind(row.id).all(),
    env.DB.prepare('SELECT at,actor,message FROM case_events WHERE case_id=? ORDER BY at DESC,id DESC LIMIT 100').bind(row.id).all<{ at: number; actor: string; message: string }>(),
  ]);
  return { ...record(row), attachments: files.results.map(file => ({ ...file, thumbnail: false })),
    events: events.results.reverse().map(event => ({ ...event, at: new Date(event.at).toISOString() })) };
}
export async function adminCases(request: Request, env: WorkerEnv, id?: string): Promise<Response> {
  const account = await administrator(request, env);
  if (!id) {
    // Bounded list; detailed messages, addresses and history are loaded on demand.
    const url = new URL(request.url); const module = url.searchParams.get('module') ?? 'serwis';
    const status = url.searchParams.get('status') ?? ''; const installation = url.searchParams.get('installation') ?? '';
    const search = (url.searchParams.get('q') ?? '').trim(); const page = Number(url.searchParams.get('page') ?? 1);
    if (!['serwis','kontakt'].includes(module) || (status && !['new','active','waiting','closed'].includes(status)) || search.length>100 || installation.length>100 || !Number.isSafeInteger(page) || page<1 || page>10000) throw new HttpError(422, 'Niepoprawne filtry.');
    const now = Date.now(); const params: (string | number)[] = [now, module];
    let where = `${visible} AND c.module=?`;
    if (status) { where+=' AND c.status=?'; params.push(status); }
    if (installation) { where+=' AND c.subject=?'; params.push(installation); }
    if (search) {
      where += ` AND (c.reference || ' ' || c.name || ' ' || coalesce(c.address_json,'') || ' ' || c.subject) LIKE ? ESCAPE '\\'`;
      params.push(`%${search.replace(/[\\%_]/g, char => `\\${char}`)}%`);
    }
    const [rows, total, counts] = await env.DB.batch<Record<string, string | number>>([
      env.DB.prepare(`SELECT c.id,c.reference,c.submitted_at,c.name,c.subject,c.status,json_extract(c.address_json,'$.city') AS city FROM cases c WHERE ${where} ORDER BY c.submitted_at DESC,c.id DESC LIMIT 12 OFFSET ?`).bind(...params,(page-1)*12),
      env.DB.prepare(`SELECT count(*) AS total FROM cases c WHERE ${where}`).bind(...params),
      env.DB.prepare(`SELECT c.module,count(*) AS total FROM cases c WHERE ${visible} AND c.status='new' GROUP BY c.module`).bind(now),
    ]);
    return json({ cases: rows.results.map(row => ({ id:row.id, reference:row.reference, submittedAt:new Date(Number(row.submitted_at)).toISOString(), status:row.status,
      data:{name:row.name,installation:row.subject,address:{city:row.city ?? ''},message:''} })),
      total:total.results[0].total, page, pageSize:12, counts:Object.fromEntries(counts.results.map(row=>[row.module,row.total])) });
  }
  const row = await getCase(env, id);
  if (request.method==='GET') return json(await detail(env,row));
  const body = objectBody(await readBody(request));
  if (!Number.isSafeInteger(body.revision) || !['new','active','waiting','closed'].includes(String(body.status)) || (row.module==='kontakt' && body.status==='waiting') || !['',account.username].includes(String(body.owner)) || typeof body.note!=='string' || body.note.length>2000 || Object.keys(body).some(key=>!['revision','status','owner','note'].includes(key))) throw new HttpError(422,'Niepoprawna zmiana.');
  if (row.revision!==body.revision) throw new HttpError(409,'Zgłoszenie zmieniło się w innym oknie. Odśwież je przed zapisem.');
  const note = body.note.trim(); const messages: string[]=[];
  if (row.status!==body.status) messages.push(`Status: ${body.status}.`);
  if ((row.owner ?? '')!==body.owner) messages.push(body.owner ? `Przypisano: ${account.username}.` : 'Usunięto przypisanie.');
  if (note) messages.push(note);
  if (!messages.length) return json(await detail(env,row));
  const now = Math.max(Date.now(),row.submitted_at);
  // One transaction: only the winning revision writes its audit entry (changes()).
  const [updated] = await env.DB.batch([
    env.DB.prepare(`UPDATE cases SET status=?,owner_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND (delete_after IS NULL OR delete_after>?) RETURNING revision`).bind(body.status,body.owner ? 1 : null,now,id,body.revision,now),
    env.DB.prepare(`INSERT INTO case_events(case_id,at,actor,kind,message) SELECT ?,?,?,?,? WHERE changes()=1`).bind(id,now,account.username,note?'note':row.status!==body.status?'status':'owner',messages.join('\n')),
  ]);
  if (updated.results.length!==1) throw new HttpError(409,'Zgłoszenie zmieniło się w innym oknie. Odśwież je przed zapisem.');
  return json(await detail(env,await getCase(env,id)));
}
