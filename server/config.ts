import { resolve } from 'node:path';
export interface ServerConfig { port:number; host:string; dataDir:string; publicOrigins:string[]; apiOrigin:string; adminUser:string; adminHash:string; secure:boolean; googleKey?:string; googleDailyLimit:number; googleMonthlyLimit:number; staticDir?:string; staticBase:string; trustProxy?:string[]; }
export function loadConfig(): ServerConfig {
  const port=Number(process.env.PORT ?? 8787);const secure=process.env.NODE_ENV==='production';
  const apiOrigin=process.env.API_ORIGIN ?? `http://127.0.0.1:${port}`;
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Niepoprawny PORT.');
  if(!process.env.ADMIN_PASSWORD_HASH)throw new Error('Ustaw ADMIN_PASSWORD_HASH. Instrukcja: docs/service.md.');
  for (const name of ['GOOGLE_DAILY_LIMIT','GOOGLE_MONTHLY_LIMIT']) if(process.env[name] && (!Number.isSafeInteger(Number(process.env[name])) || Number(process.env[name])<1)) throw new Error(`Niepoprawny limit ${name}.`);
  if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH))throw new Error('ADMIN_PASSWORD_HASH musi być hashem scrypt z generatora.');
  if(secure && !apiOrigin.startsWith('https://'))throw new Error('Produkcja wymaga API_ORIGIN z HTTPS.');
  return { port,host:process.env.HOST ?? '127.0.0.1',dataDir:resolve(process.env.DATA_DIR ?? '.service-data'),publicOrigins:(process.env.PUBLIC_ORIGINS ?? 'http://127.0.0.1:4321,http://localhost:4321').split(',').map(value=>new URL(value.trim()).origin),apiOrigin:new URL(apiOrigin).origin,adminUser:process.env.ADMIN_USER ?? 'admin',adminHash:process.env.ADMIN_PASSWORD_HASH,secure,googleKey:process.env.GOOGLE_PLACES_API_KEY,googleDailyLimit:Number(process.env.GOOGLE_DAILY_LIMIT ?? 100),googleMonthlyLimit:Number(process.env.GOOGLE_MONTHLY_LIMIT ?? 1000),staticDir:process.env.STATIC_DIR?resolve(process.env.STATIC_DIR):undefined,staticBase:process.env.STATIC_BASE ?? '/',trustProxy:process.env.TRUST_PROXY?.split(',').map(value=>value.trim()) };
}
