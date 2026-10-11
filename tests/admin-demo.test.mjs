import test from 'node:test';
import assert from 'node:assert/strict';
import { adminCases } from '../src/data/admin.ts';
import { parseDemoState, filterCases } from '../src/lib/admin-demo.ts';
const item = adminCases[0];
test('demo storage rejects corrupt and invalid state',()=>{
  for(const value of ['{','null','{"status":"hacked","owner":"Piotr M."}','{"status":"new","owner":"unknown"}']) assert.equal(parseDemoState(value,item).status,item.status);
  const state=parseDemoState(JSON.stringify({status:'closed',owner:'Piotr M.',notes:[{text:'<script>literal text</script>',date:'2026-10-11T10:00:00Z'},{text:'invalid',date:'bad'}],history:[]}),item);
  assert.equal(state.status,'closed');assert.equal(state.notes.length,1);
  assert.equal(parseDemoState(JSON.stringify({...state,status:'waiting'}),adminCases.find(c=>c.module==='kontakt')).status,'new');
});
test('filters combine persisted status, topic, Polish search and date',()=>{
  const items=adminCases.filter(c=>c.module==='serwis');
  const states=new Map([[item.id,{status:'closed',owner:'Piotr M.',notes:[],history:[]}]]);
  const filters={query:'',status:'',subject:'',period:'30'};
  assert.equal(filterCases(items,states,{...filters,query:'nowak',status:'new'}).some(c=>c.id===item.id),false);
  assert.equal(filterCases(items,states,{...filters,query:item.id,status:'closed'})[0].id,item.id);
  assert.ok(filterCases(items,states,{...filters,query:'wisniewska'}).length>0);
  assert.equal(filterCases(items,states,{...filters,subject:'Fotowoltaika',query:'falownik',period:'1'}).length,1);
  assert.equal(filterCases(items,states,{...filters,query:'nonexistent'}).length,0);
});
test('sample references are unique, totals match design, all addresses are fictional',()=>{
  assert.equal(new Set(adminCases.map(c=>c.id)).size,42);
  assert.equal(adminCases.filter(c=>c.module==='serwis').length,24);
  assert.equal(adminCases.filter(c=>c.module==='kontakt').length,18);
  assert.ok(adminCases.every(c=>c.email.endsWith('@example.com')));
});

test('demo lists are ordered newest first',()=>{ for(const module of ['serwis','kontakt']){ const items=adminCases.filter(c=>c.module===module);assert.ok(items.every((item,i)=>i===0||Date.parse(item.date)<=Date.parse(items[i-1].date))); } });
