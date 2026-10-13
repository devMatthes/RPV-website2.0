import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {getPlatformProxy} from 'wrangler';
import {createHandler} from '../cloudflare/src/app.ts';import {digest} from '../cloudflare/src/security.ts';
const state=await mkdtemp(join(tmpdir(),'rpv-texts-'));let proxy;
try{
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--config','cloudflare/wrangler.jsonc','--local','--persist-to',state],{env:{...process.env,CI:'true'}});
 proxy=await getPlatformProxy({configPath:'cloudflare/wrangler.jsonc',persist:{path:join(state,'v3')},remoteBindings:false});const env=proxy.env,db=env.DB,worker=createHandler(),origin='https://panel.example.test',now=Date.now(),token='e'.repeat(64);
 await db.prepare("INSERT INTO administrators VALUES (1,'admin',1,?)").bind(now).run();await db.prepare('INSERT INTO admin_sessions VALUES (?,1,1,?,?)').bind(await digest(token),now,now+3600000).run();
 const send=(path='',method='GET',body,headers={})=>worker.fetch(new Request(origin+'/api/admin/content'+path,{method,headers:{cookie:`rpv_session=${token}`,...(body?{origin,'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),env);
 assert.equal((await send('','GET',undefined,{cookie:''})).status,401);assert.equal((await send('/missing')).status,404);assert.equal((await send('','POST',{})).status,405);
 const pages=await(await send()).json();assert.equal(pages.pages.length,5);assert.ok(pages.pages.every(page=>page.revision===0&&page.approvedRevision===null));
 for(const page of pages.pages){const result=await send('/'+page.slug);assert.equal(result.status,200);const item=await result.json();assert.equal(item.revision,0);assert.ok(Object.values(item.draft).every(value=>typeof value==='string'));}
 assert.equal((await db.prepare('SELECT count(*) n FROM cms_entries').first()).n,0);
 const home=await(await send('/home')).json(),draft={...home.draft,heroLine1:'Nowy nagłówek'};
 assert.equal((await send('/home','PATCH',{revision:0,draft},{origin:'https://evil.example'})).status,403);
 assert.equal((await send('/home','PATCH',{revision:0,draft:{...draft,extra:'forged'}})).status,422);
 assert.equal((await send('/home','PATCH',{revision:'0',draft})).status,400);
 assert.equal((await send('/home/approve','POST',{revision:0})).status,409);
 const first=await send('/home','PATCH',{revision:0,draft});assert.equal(first.status,200,await first.clone().text());assert.equal((await first.json()).revision,1);
 assert.equal((await(await send('/home','PATCH',{revision:0,draft})).json()).revision,1);
 assert.equal((await send('/home','PATCH',{revision:0,draft:{...draft,heroLine1:'Inna zmiana'}})).status,409);
 const race=await Promise.all([send('/home','PATCH',{revision:1,draft:{...draft,heroLine1:'Wariant pierwszy'}}),send('/home','PATCH',{revision:1,draft:{...draft,heroLine1:'Wariant drugi'}})]);assert.deepEqual(race.map(response=>response.status).sort(),[200,409]);
 const saved=await(await send('/home')).json();assert.equal(saved.revision,2);assert.equal((await send('/home/approve','POST',{revision:2})).status,200);assert.equal((await send('/home/approve','POST',{revision:2})).status,200);assert.equal((await db.prepare('SELECT count(*) n FROM cms_versions').first()).n,1);
 const approved=await db.prepare('SELECT content_json FROM cms_versions').first();assert.deepEqual(JSON.parse(approved.content_json),saved.draft);
 assert.equal((await send('/home','PATCH',{revision:2,draft:{...saved.draft,heroLine1:'Późniejszy szkic'}})).status,200);assert.equal((await db.prepare('SELECT content_json FROM cms_versions').first()).content_json,approved.content_json);assert.equal((await send('/home/approve','POST',{revision:2})).status,409);
 const contact=await(await send('/shared')).json();assert.equal((await send('/shared','PATCH',{revision:0,draft:{...contact.draft,email:'javascript:bad'}})).status,422);assert.equal((await send('/shared','PATCH',{revision:0,draft:{...contact.draft,phone:'abc'}})).status,422);assert.equal((await send('/shared','PATCH',{revision:0,draft:contact.draft})).status,200);
 assert.equal((await db.prepare('SELECT count(*) n FROM usage_budgets').first()).n,0);assert.equal((await db.prepare('SELECT count(*) n FROM cases').first()).n,0);
 assert.equal((await send('/home','PATCH',{revision:3,draft:{...draft,heroDescription:'x'.repeat(40000)}})).status,413);
 console.log('CMS texts: five read-only defaults, Access-compatible auth/CSRF, strict schema, retry receipt, concurrent edits, immutable/idempotent approval, public contact validation and no R2/customer changes passed.');
}finally{await proxy?.dispose();await rm(state,{recursive:true,force:true});}
