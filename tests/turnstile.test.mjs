import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyTurnstile} from '../cloudflare/src/turnstile.ts';
import {enabled} from '../cloudflare/src/config.ts';
const env={ENVIRONMENT:'production',SUBMISSIONS_ENABLED:'true',APP_SECRET:'synthetic-app-secret-for-tests-only',TURNSTILE_SECRET:'synthetic-turnstile-secret'};
const request=(token='test-token',origin='https://rpv.pl')=>new Request('https://panel.rpv.pl/api/contact',{headers:{Origin:origin,...(token===null?{}:{'X-Turnstile-Token':token}),'CF-Connecting-IP':'192.0.2.5'}});
test('Turnstile requires fresh token, exact hostname/action and literal success',async()=>{
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.body.get('remoteip'),'192.0.2.5');assert.equal(options.body.has('idempotency_key'),false);return Response.json({success:true,hostname:'rpv.pl',action:'contact'});};
 await verifyTurnstile(request(),env,'contact',fetcher);assert.equal(calls,1);
 for(const token of [null,'','x'.repeat(2049)])await assert.rejects(verifyTurnstile(request(token),env,'contact',fetcher),{status:403});assert.equal(calls,1);
 for(const result of [{success:false},{success:'true',hostname:'rpv.pl',action:'contact'},{success:true,hostname:'devmatthes.github.io',action:'contact'},{success:true,hostname:'rpv.pl',action:'service'}])await assert.rejects(verifyTurnstile(request(),env,'contact',async()=>Response.json(result)),{status:403});
 await assert.rejects(verifyTurnstile(request(),env,'contact',async()=>{throw new Error('network');}),{status:503});
 await assert.rejects(verifyTurnstile(request(),env,'contact',async()=>new Response('invalid')),{status:503});
 await assert.rejects(verifyTurnstile(request(),env,'contact',async()=>new Response('x'.repeat(17000))),{status:503});
});
test('staging and production never activate without protection; only explicit local can bypass',async()=>{
 for(const environment of ['production','staging']){assert.equal(enabled({...env,ENVIRONMENT:environment,TURNSTILE_SECRET:undefined}),false);await assert.rejects(verifyTurnstile(request(),{...env,ENVIRONMENT:environment,TURNSTILE_SECRET:undefined},'contact'),{status:503});}
 assert.equal(enabled(env),true);await verifyTurnstile(request(null),{...env,ENVIRONMENT:'local',TURNSTILE_SECRET:undefined},'contact');
});
