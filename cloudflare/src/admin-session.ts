import type { WorkerEnv } from './config.ts';
import { digest } from './security.ts';
import { HttpError } from './http.ts';
import { verifyAccess } from './access.ts';
import type { JWTVerifyGetKey } from 'jose';

export function sessionToken(request: Request): string | undefined {
  const value = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith('rpv_session='))?.slice(12);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
export async function administrator(request: Request, env: WorkerEnv, accessKeys?: JWTVerifyGetKey) {
  if (env.ACCESS_ENABLED==='true') {
    await verifyAccess(request,env,accessKeys);
    const account=await env.DB.prepare('SELECT username FROM administrators WHERE id=1').first<{username:string}>();
    if (!account) throw new HttpError(503,'Panel jest chwilowo niedostępny.');
    return {...account,token_hash:null,method:'access' as const};
  }
  // Cookie sessions exist only for local tests of the previous backend.
  if (env.ENVIRONMENT!=='local') throw new HttpError(401,'Zaloguj się do panelu.');
  const token = sessionToken(request);
  if (!token) throw new HttpError(401, 'Zaloguj się do panelu.');
  const account = await env.DB.prepare(`SELECT a.username,s.token_hash FROM admin_sessions s JOIN administrators a ON a.id=s.administrator_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.auth_version=a.auth_version`).bind(await digest(token), Date.now()).first<{ username: string; token_hash: string }>();
  if (!account) throw new HttpError(401, 'Sesja wygasła. Zaloguj się ponownie.');
  return {...account,method:'session' as const};
}
