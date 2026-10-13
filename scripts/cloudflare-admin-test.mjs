import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';
import { createHandler } from '../cloudflare/src/app.ts';
import { insertService } from '../cloudflare/src/database.ts';
import { digest } from '../cloudflare/src/security.ts';
const state=await mkdtemp(join(tmpdir(),'rpv-admin-'));
let proxy;
try {
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--config','cloudflare/wrangler.jsonc','--local','--persist-to',state],{env:{...process.env,CI:'true'}});
  proxy=await getPlatformProxy({configPath:'cloudflare/wrangler.jsonc',persist:{path:join(state,'v3')},remoteBindings:false});
  const env={...proxy.env,SUBMISSIONS_ENABLED:'false'};const db=env.DB,worker=createHandler();
  const origin='https://panel.example.test',token='b'.repeat(64),now=Date.now();
  const shell=await worker.fetch(new Request(`${origin}/panel/`),env);
  assert.equal(shell.status,200);assert.equal(shell.headers.get('Cache-Control'),'private, no-store');
  assert.match(shell.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  const html=await shell.text();assert.ok(html.includes('data-live-admin'));assert.ok(html.includes('href="/panel/?module=serwis"'));
  for(const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"\s]+)"|url\((\/_astro\/[^)\s]+)\)/g)) {
    assert.equal((await worker.fetch(new Request(`${origin}${match[1]??match[2]}`),env)).status,200);
  }
  const cmsShell=await worker.fetch(new Request(`${origin}/panel/realizacje/`),env);assert.equal(cmsShell.status,200);const cmsHTML=await cmsShell.text();assert.ok(cmsHTML.includes('data-cms-admin'));assert.match(cmsShell.headers.get('Content-Security-Policy'),/worker-src 'self' blob:/);
  for(const match of cmsHTML.matchAll(/(?:src|href)="(\/_astro\/[^"\s]+)"/g))assert.equal((await worker.fetch(new Request(`${origin}${match[1]}`),env)).status,200);
  await db.prepare("INSERT INTO administrators VALUES (1,'admin',1,?)").bind(now).run();
  await db.prepare('INSERT INTO admin_sessions VALUES (?,1,1,?,?)').bind(await digest(token),now,now+60000).run();
  const auth={cookie:`rpv_session=${token}`};
  const send=(path,method='GET',body,headers=auth)=>worker.fetch(new Request(`${origin}/api/admin${path}`,{method,headers:{...headers,...(body?{origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
  assert.equal((await send('/cases','GET',undefined,{})).status,401);
  assert.equal((await send('/me')).status,200); // independent from public-form activation
  assert.equal((await send('/cases?page=-1')).status,422);
  const example={name:'Jan Testowy',email:'jan@example.test',phone:'+48515114676',address:{street:'Testowa',building:'1',apartment:'',postcode:'00-001',city:'Warszawa',commune:'Warszawa',county:'Warszawa',province:'mazowieckie',country:'PL',source:'manual'},installation:'Fotowoltaika',inverter:'SERIAL',battery:'',message:'Synthetic service description',privacy:true,website:''};
  for(let i=0;i<14;i++)await insertService(db,{...example,name:`Jan ${i}`},await digest(`key${i}`),await digest(`body${i}`),now+i);
  const listing=await (await send('/cases')).json();assert.equal(listing.cases.length,12);assert.equal(listing.total,14);assert.equal(listing.counts.serwis,14);
  assert.ok(listing.cases.every(row=>!('email' in row.data)&&row.data.message===''));
  assert.equal((await (await send('/cases?page=2')).json()).cases.length,2);
  assert.equal((await (await send('/cases?q=Jan%2013')).json()).total,1);
  assert.equal((await (await send('/cases?q=%25')).json()).total,0); // literal SQL wildcard
  const id=listing.cases[0].id;const initial=await (await send(`/cases/${id}`)).json();assert.equal(initial.data.address.commune,'Warszawa');assert.equal(initial.events.length,1);
  assert.equal((await send(`/cases/${id}`,'PATCH',{revision:1,status:'closed',owner:'admin',note:'First note'})).status,200);
  const closed=await (await send(`/cases/${id}`)).json();assert.equal(closed.revision,2);assert.equal(closed.status,'closed');assert.equal(closed.events.length,2);
  let row=await db.prepare('SELECT closed_at,delete_after FROM cases WHERE id=?').bind(id).first();assert.equal(row.delete_after-row.closed_at,86400000);
  const deadline=row.delete_after;
  assert.equal((await send(`/cases/${id}`,'PATCH',{revision:1,status:'active',owner:'',note:'Stale'})).status,409);
  assert.equal((await send(`/cases/${id}`,'PATCH',{revision:2,status:'closed',owner:'admin',note:'Later note'})).status,200);
  row=await db.prepare('SELECT delete_after FROM cases WHERE id=?').bind(id).first();assert.equal(row.delete_after,deadline);
  const reopen=await send(`/cases/${id}`,'PATCH',{revision:3,status:'active',owner:'',note:''});assert.equal(reopen.status,200);
  assert.equal((await db.prepare('SELECT delete_after FROM cases WHERE id=?').bind(id).first()).delete_after,null);
  const contenders=await Promise.all(['First','Second'].map(note=>send(`/cases/${id}`,'PATCH',{revision:4,status:'waiting',owner:'admin',note})));
  assert.deepEqual(contenders.map(response=>response.status).sort(),[200,409]);
  const events=await db.prepare("SELECT message FROM case_events WHERE case_id=? AND (message LIKE '%First' OR message LIKE '%Second')").bind(id).all();assert.equal(events.results.length,1);
  const malicious=new Request(`${origin}/api/admin/cases/${id}`,{method:'PATCH',headers:{...auth,origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({revision:5,status:'closed',owner:'',note:'CSRF'})});
  assert.equal((await worker.fetch(malicious,env)).status,403);
  assert.equal((await send(`/cases/${id}`,'PATCH',{revision:5,status:'active',owner:'unknown',note:''})).status,422);
  const expired=listing.cases[1].id;
  await db.prepare("UPDATE cases SET submitted_at=?,updated_at=?,status='closed' WHERE id=?").bind(now-172800000,now-172800000,expired).run();
  assert.equal((await send(`/cases/${expired}`)).status,404);
  assert.equal((await (await send('/cases')).json()).total,13);
  await db.prepare('UPDATE administrators SET auth_version=2').run();assert.equal((await send('/me')).status,401);
  await db.prepare('UPDATE administrators SET auth_version=1').run();await db.prepare('UPDATE admin_sessions SET expires_at=?').bind(now+1).run();assert.equal((await send('/cases')).status,401);
  await db.prepare('UPDATE admin_sessions SET expires_at=?').bind(now+60000).run();
  const logout=await send('/logout','POST',{});assert.equal(logout.status,200);assert.match(logout.headers.get('Set-Cookie'),/HttpOnly; SameSite=Strict; Max-Age=0; Secure/);assert.equal((await send('/me')).status,401);
  console.log('Admin D1: private sessions, paginated lists, detail, optimistic concurrency, audit, CSRF and retention checks passed.');
} finally {await proxy?.dispose();await rm(state,{recursive:true,force:true});}
