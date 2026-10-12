import { addressAPI } from './address.ts';
import { allowedOrigins, enabled, secret, type WorkerEnv } from './config.ts';
import { consumeWindow } from './database.ts';
import { HttpError, json, objectBody, readBody } from './http.ts';
import { sign, uuid } from './security.ts';
import { submitService } from './submission.ts';
import { submitContact } from './contact.ts';
import { attachmentResponse, fileLimits } from './attachments.ts';
import { adminCases } from './admin-cases.ts';
import { administrator } from './admin-session.ts';
import { accessEnabled } from './access.ts';
import type { JWTVerifyGetKey } from 'jose';
import { verifyTurnstile } from './turnstile.ts';

const routes = new Map([
  ['/api/health', 'GET, HEAD'], ['/api/config', 'GET'], ['/api/service', 'POST'],
  ['/api/contact', 'POST'],
  ['/api/address/suggestions', 'POST'], ['/api/address/details', 'POST'],
  ['/api/admin/me', 'GET'], ['/api/admin/cases', 'GET'], ['/api/admin/logout', 'POST'],
]);
export function createHandler(fetcher?: typeof fetch, accessKeys?: JWTVerifyGetKey) {
  return {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
      const path = new URL(request.url).pathname;
      const attachment = /^\/api\/admin\/cases\/([a-f0-9-]{36})\/files\/([a-f0-9-]{36})$/.exec(path);
      const caseRoute = /^\/api\/admin\/cases\/([a-f0-9-]{36})$/.exec(path);
      const methods = attachment ? 'GET' : caseRoute ? 'GET, PATCH' : routes.get(path);
      const origin = request.headers.get('origin'); const allowed = origin !== null && allowedOrigins(env).has(origin);
      const cors: Record<string, string> = { Vary: 'Origin' };
      if (allowed && !path.startsWith('/api/admin/')) cors['Access-Control-Allow-Origin'] = origin;
      try {
        if (path==='/' && request.method==='GET') return new Response(null,{status:302,headers:{Location:'/panel/','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
        if (path==='/panel' || path.startsWith('/panel/')) {
          if (env.ACCESS_ENABLED==='true') {
            if (new URL(request.url).origin!==env.ADMIN_ORIGIN) return new Response(null,{status:302,headers:{Location:`${env.ADMIN_ORIGIN}/panel/`,'Cache-Control':'no-store'}});
            await administrator(request,env,accessKeys);
          }
        }
        if (!path.startsWith('/api/') && env.ASSETS) return env.ASSETS.fetch(request);
        if (!methods) return json({ error: 'not_found' }, 404, cors);
        if (path.startsWith('/api/admin/') && origin!==null && origin!==new URL(request.url).origin) throw new HttpError(403,'Niedozwolone źródło żądania.');
        if (request.method === 'OPTIONS') {
          if (!allowed) throw new HttpError(403, 'Niedozwolone źródło żądania.');
          const method = request.headers.get('access-control-request-method');
          const headers = (request.headers.get('access-control-request-headers') ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
          if (!method || !methods.split(', ').includes(method) || headers.some(value => !['content-type', 'idempotency-key', 'x-turnstile-token'].includes(value))) throw new HttpError(403, 'Niedozwolone żądanie.');
          return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': methods, 'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, X-Turnstile-Token', 'Access-Control-Max-Age': '600' } });
        }
        if (!methods.split(', ').includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { ...cors, Allow: methods });
        if (path.startsWith('/api/admin/') && ['POST','PATCH'].includes(request.method) && origin!==new URL(request.url).origin) throw new HttpError(403,'Niedozwolone źródło żądania.');
        if (attachment) return await attachmentResponse(request, env, attachment[1], attachment[2],accessKeys);
        if (path==='/api/admin/me') { const account=await administrator(request,env,accessKeys); return json({username:account.username}); }
        if (path==='/api/admin/logout') {
          const account=await administrator(request,env,accessKeys);
          if (account.method==='access') return json({ok:true,redirect:'/cdn-cgi/access/logout'});
          await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(account.token_hash).run();
          return json({ok:true},200,{'Set-Cookie':`rpv_session=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`});
        }
        if (path==='/api/admin/cases' || caseRoute) return await adminCases(request,env,caseRoute?.[1],accessKeys);
        if (path === '/api/health') {
          const response = json({ status: 'ok', environment: env.ENVIRONMENT, phase: 'service-api' }, 200, cors);
          return request.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response;
        }
        if (path === '/api/config') return json({
          googlePlaces: enabled(env) && !!env.GOOGLE_PLACES_API_KEY,
          submissions: enabled(env), contact: enabled(env), attachments: enabled(env),
          admin: accessEnabled(env), auth: accessEnabled(env)?'access':null,
          limits: fileLimits,
        }, 200, cors);
        if (!allowed) throw new HttpError(403, 'Niedozwolone źródło żądania.');
        if (!enabled(env)) throw new HttpError(503, 'Usługa nie jest jeszcze uruchomiona.');
        const now = Date.now();
        const owner = await sign(`ip:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`, secret(env));
        await consumeWindow(env.DB, owner, 'api', 120, 60000, now);
        if (path === '/api/service' || path==='/api/contact') {
          const key = request.headers.get('idempotency-key');
          if (!uuid(key)) throw new HttpError(400, 'Brak poprawnego identyfikatora wysyłki.');
          await verifyTurnstile(request, env, path==='/api/contact'?'contact':'service', fetcher ?? fetch);
          const receipt = path==='/api/contact'?await submitContact(request,env,key,owner,now):await submitService(request, env, key, owner, now);
          return json({ reference: receipt.reference }, receipt.created ? 201 : 200, cors);
        }
        const details = path === '/api/address/details';
        await consumeWindow(env.DB, owner, details ? 'address-details' : 'address-suggestions', details ? 10 : 30, 60000, now);
        const body = objectBody(await readBody(request));
        const api = addressAPI(env, owner, now, fetcher ?? fetch);
        return json(details ? await api.details(body) : await api.suggest(body), 200, cors);
      } catch (error) {
        if (error instanceof HttpError) return json({ message: error.message, ...(error.errors ? { errors: error.errors } : {}) }, error.status, { ...cors, ...(error.status === 429 ? { 'Retry-After': String(error.retryAfter ?? 60) } : {}) });
        // Do not echo SQL, payloads, provider errors or secrets into responses/logs.
        return json({ message: 'Usługa chwilowo niedostępna. Spróbuj ponownie z tym samym formularzem.' }, 503, cors);
      }
    },
  };
}
