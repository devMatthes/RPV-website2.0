import test from 'node:test';
import assert from 'node:assert/strict';
import {parseConsent,consentLifetime} from '../src/lib/consent.ts';
const now=1800000000000;
const choice={version:1,analytics:false,marketing:true,updatedAt:now};
test('consent retains the explicit independent category choices',()=>{
  assert.deepEqual(parseConsent(JSON.stringify(choice),now),choice);
});
test('missing, malformed, outdated and incorrectly typed records do not grant consent',()=>{
  for(const raw of [null,'broken','true','{}',JSON.stringify({...choice,version:2}),JSON.stringify({...choice,analytics:'true'}),JSON.stringify({...choice,updatedAt:null}),JSON.stringify({...choice,updatedAt:now+1}),JSON.stringify({...choice,updatedAt:now-consentLifetime-1})]) assert.equal(parseConsent(raw,now),null);
});
