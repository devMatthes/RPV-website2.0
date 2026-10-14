import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {getPlatformProxy} from 'wrangler';
import sharp from 'sharp';
import {maintenance,journalLifetime,parseJournal} from '../cloudflare/src/retention.ts';
import {upload,cleanupFiles} from '../cloudflare/src/storage.ts';
import {digest} from '../cloudflare/src/security.ts';
import {createHandler} from '../cloudflare/src/app.ts';

const state=await mkdtemp(join(tmpdir(),'rpv-retention-')),restored=await mkdtemp(join(tmpdir(),'rpv-recovery-'));
const cli=(args,path=state)=>{
  const config=join(path,'wrangler.json');
  writeFileSync(config,JSON.stringify({name:'rpv-api-local',compatibility_date:'2026-10-11',d1_databases:[{binding:'DB',database_name:'rpv-db-local',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:join(process.cwd(),'cloudflare/migrations')}]}));
  return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1',...args,'--config',config,'--local'],{encoding:'utf8',env:{...process.env,CI:'true'}});
};
let proxy,recoveryProxy;
try {
  cli(['migrations','apply','DB']);
  proxy=await getPlatformProxy({configPath:'cloudflare/wrangler.jsonc',persist:{path:join(state,'.wrangler/state/v3')},remoteBindings:false});
  const env={...proxy.env,APP_SECRET:'synthetic-retention-secret-for-local-tests',SUBMISSIONS_ENABLED:'true'};
  const now=Date.now(),day=86400000,db=env.DB;
  const run=(sql,...args)=>db.prepare(sql).bind(...args).run(),first=(sql,...args)=>db.prepare(sql).bind(...args).first();
  const expired=crypto.randomUUID(),future=crypto.randomUUID(),reopened=crypto.randomUUID(),active=crypto.randomUUID();
  const add=async(id,module='kontakt')=>run(`INSERT INTO cases(id,reference,module,submitted_at,updated_at,name,email,phone,subject,message,address_json,installation_json,privacy_accepted_at,idempotency_key_hash,fingerprint)
    VALUES(?,?,?,?,?,'Synthetic','test@example.test','','Test','Test',?,?,?, ?,?)`,id,id,module,now-3*day,now-3*day,module==='serwis'?'{}':null,module==='serwis'?'{}':null,now-3*day,await digest(id),await digest(id));
  await run("INSERT INTO administrators VALUES(1,'admin',1,?)",now);
  const session='a'.repeat(64),sessionHash=await digest(session);
  const authenticate=async(database)=>database.prepare('INSERT OR REPLACE INTO admin_sessions VALUES(?,1,1,?,?)').bind(sessionHash,now,now+day).run();
  await authenticate(db);
  for(const id of [future,reopened,active])await add(id);
  await add(expired,'serwis');
  await run("INSERT INTO case_events(case_id,at,actor,kind,message) VALUES(?,?,'System','note','Synthetic')",expired,now-2*day);
  const png=await sharp({create:{width:20,height:20,channels:3,background:'blue'}}).png().toBuffer();
  const privateId=crypto.randomUUID(),cmsId=crypto.randomUUID();
  const makeFile=(id,prefix)=>({id,key:`${prefix}/${id}`,name:'synthetic.png',mime:'image/png',bytes:png.length,hash:'a'.repeat(64)});
  const privateFile=makeFile(privateId,'private'),cmsFile=makeFile(cmsId,'cms');
  await upload(env,privateFile,png,now-2*day);await upload(env,cmsFile,png,now-2*day,'cms');
  await run("UPDATE file_assets SET state='ready',expires_at=NULL");
  await run('INSERT INTO case_attachments VALUES(?,?,0)',expired,privateId);
  await run("UPDATE cases SET status='closed',updated_at=? WHERE id=?",now-2*day,reopened);
  // Export a real local D1 snapshot before the final statuses and physical erasure.
  const snapshot=join(state,'synthetic-backup.sql');
  cli(['export','DB','--output',snapshot]);assert.ok((await readFile(snapshot,'utf8')).includes('CREATE TABLE'));
  await run("UPDATE cases SET status='closed',updated_at=? WHERE id=?",now-day,expired);
  await run("UPDATE cases SET status='closed',updated_at=? WHERE id=?",now-day+3600000,future);
  await run("UPDATE cases SET status='active',updated_at=? WHERE id=?",now-1000,reopened);
  await maintenance(env,now-1);assert.ok(await first('SELECT id FROM cases WHERE id=?',expired));
  // Journal failure retains the source data and pending intent, without losing storage ownership.
  const failedPut={...env,FILES:{put:async()=>{throw new Error('Synthetic put failure');},delete:(...args)=>env.FILES.delete(...args)}};
  assert.equal((await maintenance(failedPut,now)).purgeFailed,true);
  assert.ok(await first('SELECT id FROM cases WHERE id=?',expired));
  assert.equal((await first('SELECT count(*) AS n FROM retention_batches')).n,1);
  const failedDelete={...env,FILES:{put:(...args)=>env.FILES.put(...args),delete:async()=>{throw new Error('Synthetic delete failure');}}};
  let queries=0;
  const counted={...failedDelete,DB:{prepare(sql){queries++;return db.prepare(sql);},batch:db.batch.bind(db)}};
  const purged=await maintenance(counted,now);assert.equal(purged.casesPurged,1);assert.equal(purged.filesPending,1);assert.ok(queries<=50,`Maintenance prepares ${queries} queries`);
  assert.equal(await first('SELECT id FROM cases WHERE id=?',expired),null);
  assert.equal((await first('SELECT count(*) AS n FROM case_events WHERE case_id=?',expired)).n,0);
  assert.equal(await first('SELECT id FROM file_assets WHERE id=?',privateId),null);
  assert.ok(await env.FILES.get(privateFile.key));
  // Retry deletes do not consume exhausted read/write quotas, and cannot double-release storage.
  await cleanupFiles({...env,R2_A_DAY_LIMIT:'1',R2_B_DAY_LIMIT:'1'},now+120000,50);
  assert.equal(await env.FILES.get(privateFile.key),null);
  const held=await first("SELECT consumed FROM usage_budgets WHERE metric='storage_bytes'");
  await cleanupFiles(env,now+120001,50);assert.equal((await first("SELECT consumed FROM usage_budgets WHERE metric='storage_bytes'")).consumed,held.consumed);
  // Bounded batches: a large deletion backlog takes multiple invocations, using a bulk R2 delete.
  const extraKeys=Array.from({length:51},()=>`private/${crypto.randomUUID()}`);
  for(const key of extraKeys){await env.FILES.put(key,'synthetic');await run('INSERT INTO file_deletion_jobs VALUES(?,?,0,?)',key,now,now);}
  await cleanupFiles(env,now,50);assert.equal((await first('SELECT count(*) AS n FROM file_deletion_jobs')).n,1);
  await cleanupFiles(env,now,50);assert.equal((await first('SELECT count(*) AS n FROM file_deletion_jobs')).n,0);
  assert.ok(await first('SELECT id FROM cases WHERE id=?',future));assert.ok(await first('SELECT id FROM cases WHERE id=?',reopened));
  assert.ok(await env.FILES.get(cmsFile.key));
  const beforeHeadroom=(await first("SELECT consumed FROM usage_budgets WHERE metric='storage_bytes'")).consumed;
  await run("UPDATE usage_budgets SET consumed=? WHERE metric='storage_bytes'",Number(env.R2_STORAGE_LIMIT)-1048576);
  await assert.rejects(upload(env,makeFile(crypto.randomUUID(),'private'),png,now));
  assert.equal((await first("SELECT consumed FROM usage_budgets WHERE metric='storage_bytes'")).consumed,Number(env.R2_STORAGE_LIMIT)-1048576);
  await run("UPDATE usage_budgets SET consumed=? WHERE metric='storage_bytes'",beforeHeadroom);
  const journal=await first('SELECT object_key,payload_json FROM retention_batches');
  assert.equal(parseJournal(journal.payload_json,now).cases[0].id,expired);
  assert.ok(!journal.payload_json.includes('example.test'));assert.throws(()=>parseJournal('{"schema":1}',now));
  await run("INSERT INTO maintenance_locks VALUES('maintenance','busy',?)",now+day);
  assert.equal(await maintenance(env,now),null);await run('DELETE FROM maintenance_locks');
  // Expired sessions, address predictions and rate windows are physically removed.
  await run('INSERT INTO admin_sessions VALUES(?,1,1,?,?)','b'.repeat(64),now-100,now-1);
  await run('INSERT INTO address_sessions VALUES(?,?,?,0,0)','c'.repeat(64),'d'.repeat(64),now-1);
  await run('INSERT INTO address_predictions VALUES(?,?)','c'.repeat(64),'synthetic-place');
  await run('INSERT INTO rate_limit_windows VALUES(?,?,?, ?,1)','e'.repeat(64),'test',now-100,now-1);
  await maintenance(env,now);
  assert.equal((await first('SELECT count(*) AS n FROM address_predictions')).n,0);
  assert.equal((await first('SELECT count(*) AS n FROM rate_limit_windows')).n,0);

  const worker=createHandler(),headers={origin:'https://api.example.test',cookie:`rpv_session=${session}`};
  const request=(action,environment,auth=headers)=>worker.fetch(new Request('https://api.example.test/api/admin/maintenance/recovery',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({action})}),environment);
  assert.equal((await request('prepare',env)).status,409);
  const quarantined={...env,RECOVERY_MODE:'true'};
  assert.equal((await request('prepare',quarantined,{origin:'https://api.example.test'})).status,401);
  assert.equal((await request('prepare',quarantined,{...headers,origin:'https://evil.example.test'})).status,403);
  for(const path of ['/api/admin/cases','/api/config','/api/publishing/current'])assert.equal((await worker.fetch(new Request('https://api.example.test'+path,{headers}),quarantined)).status,503);
  const prepared=await request('prepare',quarantined);assert.equal(prepared.status,200,await prepared.clone().text());
  const floor=(await first("SELECT consumed FROM usage_budgets WHERE metric='r2_class_a' AND scope LIKE '%month'")).consumed;

  // Restore the exported SQL into a different local D1; keep the current independent R2.
  cli(['execute','DB','--file',snapshot],restored);
  recoveryProxy=await getPlatformProxy({configPath:'cloudflare/wrangler.jsonc',persist:{path:join(restored,'.wrangler/state/v3')},remoteBindings:false});
  const recovered={...quarantined,DB:recoveryProxy.env.DB};
  assert.ok(await recovered.DB.prepare('SELECT id FROM cases WHERE id=?').bind(expired).first());
  const started=await request('start',recovered);assert.equal(started.status,200,await started.clone().text());
  await authenticate(recovered.DB);
  const pendingKey=`private/${crypto.randomUUID()}`;
  await env.FILES.put(pendingKey,'synthetic-retry');
  await recovered.DB.prepare('INSERT INTO file_deletion_jobs VALUES(?,?,1,?)').bind(pendingKey,now,now+day).run();
  const waiting=await request('step',recovered);assert.equal((await waiting.json()).filesPending,1);
  assert.equal((await recovered.DB.prepare('SELECT phase FROM recovery_state').first()).phase,'markers');
  await recovered.DB.prepare('UPDATE file_deletion_jobs SET retry_after=? WHERE object_key=?').bind(now,pendingKey).run();
  let result;
  for(let i=0;i<20;i++){const response=await request('step',recovered);assert.equal(response.status,200,await response.clone().text());result=await response.json();if(result.complete)break;}
  assert.equal(result.complete,true);assert.equal(result.missingFiles,0);
  assert.equal(await recovered.DB.prepare('SELECT id FROM cases WHERE id=?').bind(expired).first(),null);
  assert.equal((await recovered.DB.prepare('SELECT status,delete_after FROM cases WHERE id=?').bind(reopened).first()).delete_after,null);
  assert.equal((await recovered.DB.prepare('SELECT status FROM cases WHERE id=?').bind(reopened).first()).status,'active');
  assert.equal((await recovered.DB.prepare('SELECT delete_after FROM cases WHERE id=?').bind(future).first()).delete_after,now+3600000);
  assert.ok(await recovered.DB.prepare('SELECT id FROM cases WHERE id=?').bind(active).first());
  assert.ok((await recovered.DB.prepare("SELECT consumed FROM usage_budgets WHERE metric='r2_class_a' AND scope LIKE '%month'").first()).consumed>=floor);
  const actual=(await env.FILES.list()).objects.reduce((n,item)=>n+item.size,0);
  assert.equal((await recovered.DB.prepare("SELECT consumed FROM usage_budgets WHERE metric='storage_bytes'").first()).consumed,actual);
  // The independent opaque journal expires; CMS assets are not subject to case retention.
  await maintenance({...recovered,RECOVERY_MODE:'false'},now+journalLifetime+120000);
  assert.equal(await env.FILES.get(journal.object_key),null);
  assert.ok(await env.FILES.get(cmsFile.key));
  console.log('Retention and recovery: boundary/reopen, durable purge journal, R2 retries/budgets, cascade, locks, session cleanup, real isolated D1 export/import, quarantine, no resurrection and actual storage reconciliation OK');
} finally {
  if(recoveryProxy)await recoveryProxy.dispose();if(proxy)await proxy.dispose();
  await rm(state,{recursive:true,force:true});await rm(restored,{recursive:true,force:true});
}
