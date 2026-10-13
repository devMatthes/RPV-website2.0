import {validateProject,approvalProblems,type ProjectDraft} from '../../src/lib/cms-project.ts';
import type {WorkerEnv} from './config.ts';
import {administrator} from './admin-session.ts';
import {HttpError,json,objectBody,readBody} from './http.ts';
import {inspectFile} from './attachments.ts';
import {upload,budgetBatch,operationStatements} from './storage.ts';
import {consumeWindow} from './database.ts';
import {digest,uuid} from './security.ts';
import type {JWTVerifyGetKey} from 'jose';
interface Entry {id:string;slug:string;draft_json:string;revision:number;updated_at:number;approvedRevision:number|null;}
export async function cmsProjects(request:Request,env:WorkerEnv,accessKeys?:JWTVerifyGetKey):Promise<Response> {
 await administrator(request,env,accessKeys);
 const now=Date.now(),url=new URL(request.url),path=url.pathname.slice('/api/admin/projects'.length);
 await consumeWindow(env.DB,await digest('cms:administrator:1'),'cms',120,60000,now);
 const asset=/^\/assets\/([a-f0-9-]{36})$/.exec(path);
 if(asset){
  const file=await env.DB.prepare("SELECT object_key,bytes,content_type FROM file_assets WHERE id=? AND visibility='cms' AND state IN ('ready','pending')").bind(asset[1]).first<{object_key:string;bytes:number;content_type:string}>();
  if(!file)throw new HttpError(404,'Nie znaleziono zdjęcia.');
  await budgetBatch(env,operationStatements(env,'r2_class_b',now));const object=await env.FILES.get(file.object_key);
  if(!object)throw new HttpError(404,'Nie znaleziono zdjęcia.');if(object.size!==file.bytes){await object.body.cancel();throw new HttpError(503,'Zdjęcie jest chwilowo niedostępne.');}
  return new Response(object.body,{headers:{'Content-Type':file.content_type,'Content-Length':String(file.bytes),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'X-Robots-Tag':'noindex, nofollow'}});
 }
 if(path==='/assets'){
  await consumeWindow(env.DB,await digest('cms:administrator:1'),'cms-upload',30,3600000,now);
  const lease=crypto.randomUUID(),leaseKey=await digest('cms-upload:'+lease);
  const claimed=await env.DB.prepare('INSERT INTO upload_requests SELECT ?,?,? WHERE (SELECT count(*) FROM upload_requests WHERE expires_at>?)<2 RETURNING key_hash').bind(leaseKey,lease,now+3600000,now).first();
  if(!claimed)throw new HttpError(425,'Inne zdjęcie jest jeszcze wysyłane. Spróbuj za chwilę.');
  try {
  const size=request.headers.get('content-length');if(size&&Number(size)>5242880)throw new HttpError(413,'Zdjęcie może zajmować maksymalnie 5 MB.');
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Brak zdjęcia.');const chunks:Uint8Array[]=[];let length=0,expired=false;
  const timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>{});},120000);
  try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>5242880){await reader.cancel();throw new HttpError(413,'Zdjęcie może zajmować maksymalnie 5 MB.');}chunks.push(value);}}finally{clearTimeout(timer);reader.releaseLock();}
  if(expired)throw new HttpError(408,'Wysyłka zdjęcia trwała zbyt długo.');
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let name:string;try{name=decodeURIComponent(request.headers.get('X-File-Name')??'');}catch{throw new HttpError(400,'Niepoprawna nazwa zdjęcia.');}
  const file=await inspectFile(bytes,name,request.headers.get('content-type')??'');if(file.mime==='application/pdf')throw new HttpError(422,'Galeria przyjmuje tylko JPG, PNG i WebP.');
  file.key=`cms/${crypto.randomUUID()}`;await upload(env,file,bytes,now,'cms');return json({id:file.id,name:file.name,bytes:file.bytes},201);
  } finally {await env.DB.prepare('DELETE FROM upload_requests WHERE key_hash=? AND lease_token=?').bind(leaseKey,lease).run();}
 }
 if(!path&&request.method==='GET'){
  const page=Number(url.searchParams.get('page')??1),search=(url.searchParams.get('search')??'').trim();if(!Number.isInteger(page)||page<1||page>1000||search.length>120)throw new HttpError(400,'Niepoprawne filtry.');
  const term='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
  const where="kind='project' AND (json_extract(draft_json,'$.title') LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')";
  const total=await env.DB.prepare('SELECT count(*) n FROM cms_entries WHERE '+where).bind(term,term).first<{n:number}>();
  const rows=await env.DB.prepare(`SELECT id,slug,revision,updated_at,json_extract(draft_json,'$.title') title,json_extract(draft_json,'$.category') category,json_extract(draft_json,'$.archived') archived,(SELECT max(revision) FROM cms_versions WHERE entry_id=cms_entries.id) approvedRevision FROM cms_entries WHERE ${where} ORDER BY updated_at DESC,id DESC LIMIT 12 OFFSET ?`).bind(term,term,(page-1)*12).all();
  return json({projects:rows.results,total:total?.n??0,page,pageSize:12});
 }
 const match=/^\/([a-f0-9-]{36})(\/approve)?$/.exec(path);const id=match?.[1];
 const entry=id?await env.DB.prepare("SELECT *,(SELECT max(revision) FROM cms_versions WHERE entry_id=cms_entries.id) approvedRevision FROM cms_entries WHERE id=? AND kind='project'").bind(id).first<Entry>():null;
 if(id&&!entry)throw new HttpError(404,'Nie znaleziono realizacji.');
 if(entry&&request.method==='GET')return json({id:entry.id,revision:entry.revision,updatedAt:entry.updated_at,approvedRevision:entry.approvedRevision,draft:JSON.parse(entry.draft_json)});
 const body=objectBody(await readBody(request));const token=crypto.randomUUID();
 const guard="EXISTS(SELECT 1 FROM cms_entries WHERE id=? AND write_token=?)";
 if(match?.[2]){
  if(Object.keys(body).some(k=>k!=='revision')||body.revision!==entry!.revision)throw new HttpError(409,'Realizacja została zmieniona. Otwórz ją ponownie.');
  const draft=validateProject(JSON.parse(entry!.draft_json)),problems=approvalProblems(draft);if(problems.length)throw new HttpError(422,problems.join(' '));
  const version=crypto.randomUUID();
  const results=await env.DB.batch([
   env.DB.prepare("UPDATE cms_entries SET write_token=? WHERE id=? AND revision=? RETURNING id").bind(token,id!,body.revision),
   env.DB.prepare(`INSERT OR IGNORE INTO cms_versions(id,entry_id,revision,content_json,approved_at) SELECT ?,id,revision,draft_json,? FROM cms_entries WHERE id=? AND write_token=?`).bind(version,now,id!,token),
   env.DB.prepare('INSERT INTO cms_version_assets(version_id,asset_id,position) SELECT ?,asset_id,position FROM cms_draft_assets WHERE entry_id=? AND EXISTS(SELECT 1 FROM cms_versions WHERE id=?)').bind(version,id!,version),
  ]);
  if(!results[0].results.length)throw new HttpError(409,'Realizacja została zmieniona. Otwórz ją ponownie.');
  return json({approvedRevision:entry!.revision});
 }
 if(Object.keys(body).some(k=>!['draft','revision'].includes(k)))throw new HttpError(400,'Niepoprawne dane.');
 let draft:ProjectDraft;try{draft=validateProject(body.draft);}catch(error){throw new HttpError(422,error instanceof Error?error.message:'Niepoprawna realizacja.');}
 if(entry?.approvedRevision&&draft.slug!==entry.slug)throw new HttpError(422,'Adres zatwierdzonej realizacji pozostaje stały.');
 if(entry&&body.revision!==entry.revision)throw new HttpError(409,'Realizacja została zmieniona. Otwórz ją ponownie. Dane w formularzu pozostają.');
 // Validate every asset's provenance before the transaction, with SQL constraints again inside it.
 for(const image of draft.images){const found=await env.DB.prepare("SELECT id FROM file_assets WHERE id=? AND visibility='cms' AND state IN ('pending','ready') AND (expires_at IS NULL OR expires_at>?)").bind(image.id,now).first();if(!found)throw new HttpError(422,'Zdjęcie wygasło lub nie należy do galerii CMS.');}
 const entryId=entry?.id??crypto.randomUUID(),revision=(entry?.revision??0)+1;
 const statements: D1PreparedStatement[]=[entry?
  env.DB.prepare("UPDATE cms_entries SET slug=?,draft_json=?,revision=revision+1,updated_at=?,write_token=? WHERE id=? AND revision=? RETURNING id").bind(draft.slug,JSON.stringify(draft),now,token,entryId,body.revision):
  env.DB.prepare("INSERT INTO cms_entries(id,kind,slug,draft_json,updated_at,write_token) VALUES (?,'project',?,?,?,?) RETURNING id").bind(entryId,draft.slug,JSON.stringify(draft),now,token),
  env.DB.prepare(`DELETE FROM cms_draft_assets WHERE entry_id=? AND ${guard}`).bind(entryId,entryId,token),
 ];
 draft.images.forEach((image,position)=>{statements.push(env.DB.prepare(`INSERT INTO cms_draft_assets(entry_id,asset_id,position) SELECT ?,?,? WHERE ${guard}`).bind(entryId,image.id,position,entryId,token),env.DB.prepare(`UPDATE file_assets SET state='ready',expires_at=NULL WHERE id=? AND ${guard}`).bind(image.id,entryId,token));});
 // Preserve anything referenced by an approved version, including photos removed from a later draft.
 statements.push(env.DB.prepare("DELETE FROM file_assets WHERE id IN (SELECT a.id FROM file_assets a WHERE visibility='cms' AND state='ready' AND NOT EXISTS(SELECT 1 FROM cms_draft_assets WHERE asset_id=a.id) AND NOT EXISTS(SELECT 1 FROM cms_version_assets WHERE asset_id=a.id) LIMIT 12)"));
 let results;try{results=await env.DB.batch(statements);}catch(error){if(error instanceof Error&&/UNIQUE constraint|Invalid CMS asset/.test(error.message))throw new HttpError(409,'Adres lub zdjęcie jest już używane. Sprawdź realizację.');if(error instanceof Error&&error.message.includes('Project limit reached'))throw new HttpError(422,'Osiągnięto limit 500 realizacji.');throw error;}
 if(!results[0].results.length)throw new HttpError(409,'Realizacja została zmieniona. Otwórz ją ponownie.');
 return json({id:entryId,revision,draft,approvedRevision:entry?.approvedRevision??null},entry?200:201);
}
