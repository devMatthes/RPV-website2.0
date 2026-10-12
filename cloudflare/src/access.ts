import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { WorkerEnv } from './config.ts';
import { HttpError } from './http.ts';

// Cache public verification keys only; never keep user identities/tokens globally.
const keys = new Map<string, JWTVerifyGetKey>();
export function accessEnabled(env: WorkerEnv): boolean {
  return env.ACCESS_ENABLED==='true' && !!env.ADMIN_EMAIL && /^[a-f0-9]{64}$/.test(env.ACCESS_AUD) && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER) && !!env.ADMIN_ORIGIN;
}
export async function verifyAccess(request: Request, env: WorkerEnv, testKeys?: JWTVerifyGetKey) {
  if (!accessEnabled(env) || new URL(request.url).origin!==env.ADMIN_ORIGIN) throw new HttpError(401,'Zaloguj się do panelu.');
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length>8192) throw new HttpError(401,'Zaloguj się do panelu.');
  let key=testKeys ?? keys.get(env.ACCESS_ISSUER);
  if (!key) { key=createRemoteJWKSet(new URL(`${env.ACCESS_ISSUER}/cdn-cgi/access/certs`),{timeoutDuration:5000,cacheMaxAge:600000});keys.set(env.ACCESS_ISSUER,key); }
  try {
    const {payload}=await jwtVerify(token,key,{issuer:env.ACCESS_ISSUER,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email','type'],maxTokenAge:'7d'});
    if (payload.type!=='app' || typeof payload.email!=='string' || payload.email.toLowerCase()!==env.ADMIN_EMAIL!.toLowerCase()) throw new Error('Not administrator');
    return payload;
  } catch { throw new HttpError(401,'Sesja wygasła. Zaloguj się ponownie.'); }
}
