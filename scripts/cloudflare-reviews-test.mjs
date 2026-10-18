import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {getPlatformProxy} from 'wrangler';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {createHandler} from '../cloudflare/src/app.ts';
import {consumeGoogle} from '../cloudflare/src/database.ts';
const state=await mkdtemp(join(tmpdir(),'rpv-reviews-'));let proxy,runtime;
try {
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--config','cloudflare/wrangler.jsonc','--local','--persist-to',state],{env:{...process.env,CI:'true'}});
 proxy=await getPlatformProxy({configPath:'cloudflare/wrangler.jsonc',persist:{path:join(state,'v3')},remoteBindings:false});
 const db=proxy.env.DB,env={...proxy.env,APP_SECRET:'synthetic-reviews-test-signing-secret',GOOGLE_PLACES_API_KEY:'synthetic-provider-key',GOOGLE_REVIEWS_ENABLED:'true',SUBMISSIONS_ENABLED:'false'};
 const fixture={displayName:{text:'RPV Sp. z o.o.'},formattedAddress:'Sobawiny 45',rating:4.7,userRatingCount:27,googleMapsUri:'https://www.google.com/maps?cid=123',reviews:[
  {authorAttribution:{displayName:'Autor testowy',uri:'https://www.google.com/maps/contrib/123',photoUri:'https://lh3.googleusercontent.com/test'},rating:3,originalText:{text:'Przykładowa treść wyłącznie do testów.'},googleMapsUri:'https://www.google.com/maps/reviews/test',publishTime:'2026-01-01T00:00:00Z',relativePublishTimeDescription:'miesiąc temu'},
  {authorAttribution:{displayName:'Niebezpieczne linki',uri:'javascript:alert(1)',photoUri:'https://evil.test/avatar'},rating:5,text:{text:'<script>test</script>'},googleMapsUri:'https://www.google.com/maps/reviews/test2'},
  {authorAttribution:{displayName:'Błędna ocena'},rating:8,googleMapsUri:'https://www.google.com/maps/reviews/test3'}]};
 let calls=[];let provider=()=>Response.json(fixture);
 const worker=createHandler(async(url,init)=>{calls.push({url,init});return String(url).includes('searchText')?Response.json({places:[{id:'synthetic_place_id'}]}):provider();});
 let ip=0;
 const send=(overrides={},path='/api/reviews',headers={},method='GET')=>worker.fetch(new Request('https://api.test'+path,{method,headers:{origin:'http://127.0.0.1:4321','CF-Connecting-IP':`192.0.2.${++ip}`,...headers}}),{...env,...overrides});
 assert.equal((await send({GOOGLE_REVIEWS_ENABLED:'false'})).status,503);
 assert.equal((await send({GOOGLE_PLACES_API_KEY:''})).status,503);
 assert.equal((await send({},'/api/reviews',{origin:'https://evil.test'})).status,403);
 assert.equal((await send({},'/api/reviews?place=arbitrary')).status,400);
 assert.equal((await send({},'/api/reviews',{},'POST')).status,405);assert.equal(calls.length,0);
 let response=await send();assert.equal(response.status,200,await response.clone().text());
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 let data=await response.json();assert.equal(calls.length,2);assert.equal(data.reviews.length,2);assert.equal(data.reviews[0].rating,3);assert.equal(data.rating,4.7);assert.equal(data.count,27);
 assert.equal(data.reviews[1].authorUrl,undefined);assert.equal(data.reviews[1].avatarUrl,undefined);assert.equal(data.reviews[1].text,'<script>test</script>');
 assert.equal(JSON.parse(calls[0].init.body).includePureServiceAreaBusinesses,true);assert.equal(calls[0].init.headers['X-Goog-FieldMask'],'places.id');assert.equal(JSON.parse(calls[0].init.body).pageSize,1);
 assert.equal(calls[1].init.redirect,'manual');assert.equal(calls[1].init.headers['X-Goog-Api-Key'],'synthetic-provider-key');assert.ok(!JSON.stringify(data).includes('synthetic-provider-key'));
 assert.deepEqual(await db.prepare('SELECT * FROM google_review_place').all().then(x=>x.results),[{singleton:1,place_id:'synthetic_place_id'}]);
 assert.equal((await send()).status,200);assert.equal(calls.length,3); // No reviews cache; only the Place ID is reused.
 provider=()=>Response.json({error:{message:'synthetic-provider-key'}},{status:403});response=await send();assert.equal(response.status,503);assert.ok(!(await response.text()).includes('synthetic-provider-key'));
 provider=()=>Response.json({error:{status:'PERMISSION_DENIED',message:'synthetic-provider-key',details:[{reason:'API_KEY_HTTP_REFERRER_BLOCKED',metadata:{secret:'synthetic-provider-key'}}]}},{status:403});response=await send();assert.equal((await response.json()).errors.provider,'403 PERMISSION_DENIED API_KEY_HTTP_REFERRER_BLOCKED');
 provider=()=>new Response('x'.repeat(165000));assert.equal((await send()).status,503);
 provider=()=>Response.json({...fixture,displayName:{text:'Inna firma'},formattedAddress:'Warszawa'});assert.equal((await send()).status,503);
 provider=()=>Response.json(fixture);const before=calls.length;
 await db.prepare('DELETE FROM usage_budgets').run();
 const results=await Promise.all(Array.from({length:12},()=>send({GOOGLE_REVIEWS_DAILY_LIMIT:'3'})));
 assert.equal(results.filter(r=>r.status===200).length,3);assert.equal(calls.length-before,3);assert.ok(results.every(r=>[200,429].includes(r.status)));
 await db.prepare('DELETE FROM usage_budgets').run();
 const month=Date.UTC(2026,0,31,23,59);await consumeGoogle(db,10,1,month);
 await assert.rejects(()=>consumeGoogle(db,10,1,month),error=>error.status===429);
 await consumeGoogle(db,10,1,Date.UTC(2026,1,1));
 await db.prepare('DELETE FROM usage_budgets').run();
 await consumeGoogle(db,100,1,Date.now());const sharedBefore=calls.length;
 assert.equal((await send({GOOGLE_MONTHLY_LIMIT:'1'})).status,429);assert.equal(calls.length,sharedBefore);
 assert.equal((await db.prepare('SELECT count(*) n FROM cases').first()).n,0);
 await db.prepare('DELETE FROM usage_budgets').run();
 await proxy.dispose();proxy=undefined;
 const bundle=join(state,'bundle');
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','cloudflare/wrangler.jsonc','--env','production','--dry-run','--outdir',bundle],{env:{...process.env,CI:'true'}});
 let runtimeCalls=0;
 runtime=new Miniflare(convertV4MiniflareOptions({resourcePersistencePath:join(state,'v3'),workers:[{name:'rpv-api-local',modules:true,modulesRoot:bundle,scriptPath:join(bundle,'index.js'),compatibilityDate:'2026-10-11',compatibilityFlags:['nodejs_compat'],
  bindings:{APP_SECRET:env.APP_SECRET,GOOGLE_PLACES_API_KEY:env.GOOGLE_PLACES_API_KEY,PUBLIC_ORIGINS:'http://127.0.0.1:4321',GOOGLE_REVIEWS_ENABLED:'true',GOOGLE_REVIEWS_PLACE_ID:'',GOOGLE_REVIEWS_DAILY_LIMIT:'30',GOOGLE_REVIEWS_MONTHLY_LIMIT:'500',GOOGLE_DAILY_LIMIT:'100',GOOGLE_MONTHLY_LIMIT:'1000'},
  d1Databases:{DB:'00000000-0000-0000-0000-000000000001'},outboundService:async request=>{runtimeCalls++;assert.equal(new URL(request.url).hostname,'places.googleapis.com');return Response.json(fixture);},
 }]}));
 const compiled=await runtime.dispatchFetch('https://api.test/api/reviews',{headers:{origin:'http://127.0.0.1:4321','CF-Connecting-IP':'192.0.2.250'}});
 assert.equal(compiled.status,200,await compiled.clone().text());assert.equal((await compiled.json()).reviews.length,2);assert.equal(runtimeCalls,1);
 console.log('Compiled workerd: real request options, outbound provider fixture and persistent D1 budget passed.');
 console.log('Reviews: fixed verified listing, minimal fields, source/author attribution, real ratings, safe URLs, no content storage, provider failure/size limits, concurrent ceilings, shared address budget and UTC monthly reset passed.');
} finally {await runtime?.dispose();await proxy?.dispose();await rm(state,{recursive:true,force:true});}
