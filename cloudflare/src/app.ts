import { validateService } from '../../src/lib/service-schema.ts';
import { addressAPI, verifiedTeryt } from './address.ts';
import { allowedOrigins, enabled, secret, type WorkerEnv } from './config.ts';
import { consumeWindow, existing, insertService } from './database.ts';
import { HttpError, json, objectBody, readBody } from './http.ts';
import { digest, sign, uuid } from './security.ts';

const routes = new Map([
  ['/api/health', 'GET, HEAD'], ['/api/config', 'GET'], ['/api/service', 'POST'],
  ['/api/address/suggestions', 'POST'], ['/api/address/details', 'POST'],
]);
export function createHandler(fetcher?: typeof fetch) {
  return {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
      const path = new URL(request.url).pathname; const methods = routes.get(path);
      const origin = request.headers.get('origin'); const allowed = origin !== null && allowedOrigins(env).has(origin);
      const cors: Record<string, string> = { Vary: 'Origin' };
      if (allowed) cors['Access-Control-Allow-Origin'] = origin;
      try {
        if (!methods) return json({ error: 'not_found' }, 404, cors);
        if (request.method === 'OPTIONS') {
          if (!allowed) throw new HttpError(403, 'Niedozwolone źródło żądania.');
          const method = request.headers.get('access-control-request-method');
          const headers = (request.headers.get('access-control-request-headers') ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
          if (!method || !methods.split(', ').includes(method) || headers.some(value => !['content-type', 'idempotency-key'].includes(value))) throw new HttpError(403, 'Niedozwolone żądanie.');
          return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': methods, 'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key', 'Access-Control-Max-Age': '600' } });
        }
        if (!methods.split(', ').includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { ...cors, Allow: methods });
        if (path === '/api/health') {
          const response = json({ status: 'ok', environment: env.ENVIRONMENT, phase: 'service-api' }, 200, cors);
          return request.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response;
        }
        if (path === '/api/config') return json({
          googlePlaces: enabled(env) && !!env.GOOGLE_PLACES_API_KEY,
          submissions: enabled(env), attachments: false,
          limits: { count: 0, inputBytes: 5242880, totalBytes: 20971520, pixels: 40000000, imageEdge: 2560 },
        }, 200, cors);
        if (!allowed) throw new HttpError(403, 'Niedozwolone źródło żądania.');
        if (!enabled(env)) throw new HttpError(503, 'Usługa nie jest jeszcze uruchomiona.');
        const now = Date.now();
        const owner = await sign(`ip:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`, secret(env));
        await consumeWindow(env.DB, owner, 'api', 120, 60000, now);
        if (path === '/api/service') {
          const key = request.headers.get('idempotency-key');
          if (!uuid(key)) throw new HttpError(400, 'Brak poprawnego identyfikatora wysyłki.');
          const raw = objectBody(await readBody(request, true)); const result = validateService(raw);
          if (result.data.website) throw new HttpError(422, 'Nie udało się zweryfikować formularza.');
          if (Object.keys(result.errors).length) throw new HttpError(422, 'Sprawdź zaznaczone pola.', result.errors);
          // Keep the fingerprint independent of temporary proof/expiry and server enrichment.
          const keyHash = await digest(key); const fingerprint = await digest(JSON.stringify(result.data));
          const previous = await existing(env.DB, keyHash);
          if (previous) {
            if (previous.fingerprint !== fingerprint) throw new HttpError(409, 'Dane zmieniły się od poprzedniej wysyłki. Rozpocznij nową wysyłkę.');
            return json({ reference: previous.reference }, 200, cors);
          }
          await consumeWindow(env.DB, owner, 'service', 6, 3600000, now);
          const proof = objectBody(raw.address).proof;
          const teryt = await verifiedTeryt(result.data.address, proof, env, now);
          if (teryt) result.data.address.teryt = teryt;
          const receipt = await insertService(env.DB, result.data, keyHash, fingerprint, now);
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
