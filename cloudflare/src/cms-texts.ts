import {textPage,textPages,textDefaults,validateTexts} from '../../src/lib/cms-texts.ts';
import {administrator} from './admin-session.ts';import type {WorkerEnv} from './config.ts';import {HttpError,json,objectBody,readBody} from './http.ts';import {consumeWindow} from './database.ts';import {digest} from './security.ts';import type {JWTVerifyGetKey} from 'jose';
interface Entry {id:string;draft_json:string;revision:number;updated_at:number;approvedRevision:number|null;}
export async function cmsTexts(request:Request,env:WorkerEnv,accessKeys?:JWTVerifyGetKey):Promise<Response>{
 await administrator(request,env,accessKeys);const now=Date.now();await consumeWindow(env.DB,await digest('cms:administrator:1'),'cms',120,60000,now);
 const match=/^\/api\/admin\/content(?:\/([a-z]+)(\/approve)?)?$/.exec(new URL(request.url).pathname)!;
 if(!match[1]){const rows=await env.DB.prepare("SELECT id,revision,updated_at,(SELECT max(revision) FROM cms_versions WHERE entry_id=cms_entries.id) approvedRevision FROM cms_entries WHERE id IN ('text:home','text:about','text:contact','text:service','text:shared')").all<Entry>();return json({pages:textPages.map(page=>{const row=rows.results.find(row=>row.id==='text:'+page.slug);return {slug:page.slug,title:page.title,revision:row?.revision??0,approvedRevision:row?.approvedRevision??null,updatedAt:row?.updated_at??null};})});}
 const page=textPage(match[1]);if(!page)throw new HttpError(404,'Nie znaleziono grupy tekstów.');const id='text:'+page.slug;
 const entry=await env.DB.prepare('SELECT id,draft_json,revision,updated_at,(SELECT max(revision) FROM cms_versions WHERE entry_id=cms_entries.id) approvedRevision FROM cms_entries WHERE id=?').bind(id).first<Entry>();
 if(request.method==='GET')return json({slug:page.slug,title:page.title,revision:entry?.revision??0,approvedRevision:entry?.approvedRevision??null,draft:entry?JSON.parse(entry.draft_json):textDefaults(page)});
 const body=objectBody(await readBody(request));if(!Number.isSafeInteger(body.revision)||Number(body.revision)<0)throw new HttpError(400,'Brak poprawnej rewizji tekstów.');
 if(match[2]){
  if(Object.keys(body).some(key=>key!=='revision'))throw new HttpError(400,'Niepoprawne dane.');if(!entry||body.revision!==entry.revision)throw new HttpError(409,'Najpierw zapisz aktualny szkic.');
  validateTexts(page,JSON.parse(entry.draft_json));const token=crypto.randomUUID(),version=crypto.randomUUID();const results=await env.DB.batch([
   env.DB.prepare('UPDATE cms_entries SET write_token=? WHERE id=? AND revision=? RETURNING id').bind(token,id,body.revision),
   env.DB.prepare('INSERT OR IGNORE INTO cms_versions(id,entry_id,revision,content_json,approved_at) SELECT ?,id,revision,draft_json,? FROM cms_entries WHERE id=? AND write_token=?').bind(version,now,id,token),
  ]);if(!results[0].results.length)throw new HttpError(409,'Teksty zostały zmienione. Otwórz grupę ponownie.');return json({approvedRevision:entry.revision});
 }
 if(Object.keys(body).some(key=>!['revision','draft'].includes(key)))throw new HttpError(400,'Niepoprawne dane.');let draft:Record<string,string>;try{draft=validateTexts(page,body.draft);}catch(error){throw new HttpError(422,error instanceof Error?error.message:'Sprawdź teksty.');}const content=JSON.stringify(draft);
 // A lost response can be retried without incrementing the revision twice.
 if(entry&&entry.revision===Number(body.revision)+1&&entry.draft_json===content)return json({slug:page.slug,revision:entry.revision,approvedRevision:entry.approvedRevision,draft});
 if(body.revision!==(entry?.revision??0))throw new HttpError(409,'Teksty zostały zmienione. Otwórz grupę ponownie. Twoje dane pozostają w formularzu.');
 let saved:unknown;try{saved=entry?await env.DB.prepare('UPDATE cms_entries SET draft_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id').bind(content,now,id,body.revision).first():await env.DB.prepare("INSERT INTO cms_entries(id,kind,slug,draft_json,updated_at) VALUES (?,? ,?,?,?) RETURNING id").bind(id,page.slug==='shared'?'contact':'page',page.slug,content,now).first();}catch(error){if(error instanceof Error&&error.message.includes('UNIQUE constraint'))throw new HttpError(409,'Teksty zostały zapisane w innej karcie. Otwórz grupę ponownie.');throw error;}
 if(!saved)throw new HttpError(409,'Teksty zostały zmienione. Otwórz grupę ponownie.');return json({slug:page.slug,revision:Number(body.revision)+1,approvedRevision:entry?.approvedRevision??null,draft});
}
