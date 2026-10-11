import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { ServiceSubmission } from '../src/lib/service-schema.ts';
import type { Upload } from './uploads.ts';
export interface StoredCase { id:string; reference:string; module:'serwis'; submittedAt:string; data:ServiceSubmission; attachments:Upload[]; status:string; owner:string; revision:number; events:{at:string;actor:string;message:string}[]; }
export class Store {
  db:DatabaseSync;
  constructor(path:string) {
    this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, reference TEXT UNIQUE NOT NULL, submitted TEXT NOT NULL, payload TEXT NOT NULL, attachments TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', owner TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1, events TEXT NOT NULL, idem TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL, auth TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  }
  settings(key:string,value?:string) { if(value!==undefined)this.db.prepare('INSERT OR IGNORE INTO settings VALUES (?,?)').run(key,value);return (this.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined)?.value; }
  counter(key:string) {this.db.prepare('INSERT INTO counters VALUES (?,1) ON CONFLICT(key) DO UPDATE SET value=value+1').run(key);return Number((this.db.prepare('SELECT value FROM counters WHERE key=?').get(key) as {value:number}).value);}
  consumeGoogle(daily:number,monthly:number) { const day=new Date().toISOString().slice(0,10),month=day.slice(0,7);const get=(key:string)=>Number((this.db.prepare('SELECT value FROM counters WHERE key=?').get(key) as {value:number}|undefined)?.value??0);if(get(`google-day:${day}`)>=daily||get(`google-month:${month}`)>=monthly)return false;this.counter(`google-day:${day}`);this.counter(`google-month:${month}`);return true; }
  existing(key:string) { return this.db.prepare('SELECT id, reference, fingerprint FROM cases WHERE idem=?').get(key) as {id:string;reference:string;fingerprint:string}|undefined; }
  insert(data:ServiceSubmission,attachments:Upload[],key:string,fingerprint:string) {
    this.db.exec('BEGIN IMMEDIATE');try {const year=new Date().getUTCFullYear();const reference=`SRV-${year}-${String(this.counter(`service:${year}`)).padStart(6,'0')}`;const id=randomUUID(),at=new Date().toISOString();this.db.prepare('INSERT INTO cases (id,reference,submitted,payload,attachments,events,idem,fingerprint) VALUES (?,?,?,?,?,?,?,?)').run(id,reference,at,JSON.stringify(data),JSON.stringify(attachments),JSON.stringify([{at,actor:'System',message:'Zgłoszenie zapisane.'}]),key,fingerprint);this.db.exec('COMMIT');return {id,reference};}catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  row(raw:Record<string,unknown>):StoredCase {return {id:String(raw.id),reference:String(raw.reference),module:'serwis',submittedAt:String(raw.submitted),data:JSON.parse(String(raw.payload)),attachments:JSON.parse(String(raw.attachments)),status:String(raw.status),owner:String(raw.owner),revision:Number(raw.revision),events:JSON.parse(String(raw.events))};}
  get(id:string) {const row=this.db.prepare('SELECT * FROM cases WHERE id=?').get(id);return row?this.row(row):undefined;}
  list() {return this.db.prepare('SELECT * FROM cases ORDER BY submitted DESC, reference DESC LIMIT 1000').all().map(row=>this.row(row));}
  patch(id:string,revision:number,status:string,owner:string,note:string,actor:string) {
    this.db.exec('BEGIN IMMEDIATE');try {const current=this.get(id);if(!current)throw Object.assign(new Error('Nie znaleziono zgłoszenia.'),{statusCode:404});if(current.revision!==revision)throw Object.assign(new Error('Sprawa została zmieniona. Odśwież widok.'),{statusCode:409});const events=[...current.events];const at=new Date().toISOString();if(status!==current.status)events.push({at,actor,message:`Status: ${current.status} → ${status}`});if(owner!==current.owner)events.push({at,actor,message:`Opiekun: ${owner||'Nieprzypisane'}`});if(note)events.push({at,actor,message:note});this.db.prepare('UPDATE cases SET status=?,owner=?,events=?,revision=revision+1 WHERE id=?').run(status,owner,JSON.stringify(events),id);this.db.exec('COMMIT');return this.get(id);}catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  close(){this.db.close();}
}
