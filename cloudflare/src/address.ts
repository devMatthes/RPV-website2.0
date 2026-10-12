import { googleAddress, parsePrg, type GoogleComponent } from '../../src/lib/service-address.ts';
import type { ServiceAddress } from '../../src/lib/service-types.ts';
import { consumeGoogle } from './database.ts';
import { boundedText, HttpError, objectBody } from './http.ts';
import { digest, sign, uuid, verify } from './security.ts';
import { secret, type WorkerEnv } from './config.ts';

function addressFields(address: Partial<ServiceAddress>): string {
  return JSON.stringify(['street', 'building', 'postcode', 'city', 'commune', 'county', 'province', 'placeId']
    .map(key => address[key as keyof ServiceAddress] ?? ''));
}
export async function addressProof(address: Partial<ServiceAddress>, env: WorkerEnv, now: number): Promise<string | undefined> {
  if (!address.teryt) return;
  const expires = now + 3600000;
  const value = `${address.teryt}.${expires}`;
  return `${value}.${await sign(`${value}.${addressFields(address)}`, secret(env))}`;
}
export async function verifiedTeryt(address: ServiceAddress, proof: unknown, env: WorkerEnv, now: number): Promise<string | undefined> {
  if (typeof proof !== 'string' || proof.length > 120) return;
  const [teryt, expiry, signature, extra] = proof.split('.'); const expires = Number(expiry);
  if (extra !== undefined || !/^\d{7}$/.test(teryt ?? '') || !/^\d{13}$/.test(expiry ?? '') || expires < now || expires > now + 3600000) return;
  return await verify(`${teryt}.${expiry}.${addressFields(address)}`, signature ?? '', secret(env)) ? teryt : undefined;
}
export function addressAPI(env: WorkerEnv, owner: string, now: number, fetcher: typeof fetch) {
  const key = env.GOOGLE_PLACES_API_KEY;
  async function google(url: string, init: RequestInit, mask: string): Promise<Record<string, unknown>> {
    if (!key) throw new HttpError(503, 'Podpowiedzi nie są jeszcze włączone. Wpisz adres ręcznie.');
    await consumeGoogle(env.DB, Number(env.GOOGLE_DAILY_LIMIT), Number(env.GOOGLE_MONTHLY_LIMIT), now);
    try {
      const response = await fetcher(url, { ...init, headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask }, signal: AbortSignal.timeout(6000) });
      if (!response.ok) { await response.body?.cancel(); throw new Error('Provider unavailable'); }
      return objectBody(JSON.parse(await boundedText(response.body, 64 * 1024)));
    } catch { throw new HttpError(503, 'Podpowiedzi są chwilowo niedostępne. Wpisz adres ręcznie.'); }
  }
  async function tokenHash(token: unknown): Promise<string> {
    if (!uuid(token)) throw new HttpError(400, 'Niepoprawna sesja wyszukiwania.');
    return digest(token);
  }
  return {
    async suggest(raw: Record<string, unknown>) {
      if (!key) throw new HttpError(503, 'Podpowiedzi nie są jeszcze włączone. Wpisz adres ręcznie.');
      if (typeof raw.input !== 'string' || raw.input.trim().length < 3 || raw.input.length > 200 || /[\u0000-\u001f]/.test(raw.input)) throw new HttpError(400, 'Niepoprawne zapytanie.');
      const token = await tokenHash(raw.token);
      await env.DB.prepare('DELETE FROM address_sessions WHERE token_hash IN (SELECT token_hash FROM address_sessions WHERE expires_at < ? LIMIT 100)').bind(now).run();
      const session = await env.DB.prepare(`INSERT INTO address_sessions(token_hash,owner_hash,expires_at,calls)
        SELECT ?,?,?,1 WHERE EXISTS(SELECT 1 FROM address_sessions WHERE token_hash = ?) OR (SELECT count(*) FROM address_sessions) < 1000
        ON CONFLICT(token_hash) DO UPDATE SET calls = calls + 1
        WHERE owner_hash = excluded.owner_hash AND expires_at > ? AND details_used = 0 AND calls < 20 RETURNING calls`)
        .bind(token, owner, now + 600000, token, now).first();
      if (!session) throw new HttpError(429, 'Rozpocznij nowe wyszukiwanie lub wpisz adres ręcznie.');
      const result = await google('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST', body: JSON.stringify({ input: raw.input.trim(), sessionToken: raw.token, languageCode: 'pl', includedRegionCodes: ['pl'] }),
      }, 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text');
      const predictions = Array.isArray(result.suggestions) ? result.suggestions : [];
      const suggestions: { id: string; text: string }[] = [];
      for (const item of predictions.slice(0, 5)) {
        if (!item || typeof item !== 'object') continue;
        const p = item.placePrediction;
        if (p && typeof p.placeId === 'string' && /^[A-Za-z0-9_-]{1,255}$/.test(p.placeId) && typeof p.text?.text === 'string' && p.text.text.length <= 500) {
          suggestions.push({ id: p.placeId, text: p.text.text });
        }
      }
      if (suggestions.length) await env.DB.batch(suggestions.map(item => env.DB.prepare('INSERT OR IGNORE INTO address_predictions VALUES (?,?)').bind(token, item.id)));
      return { suggestions };
    },
    async details(raw: Record<string, unknown>) {
      if (!key) throw new HttpError(503, 'Podpowiedzi nie są jeszcze włączone. Wpisz adres ręcznie.');
      const token = await tokenHash(raw.token);
      if (typeof raw.id !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(raw.id)) throw new HttpError(400, 'Wybierz adres z aktualnej listy.');
      const session = await env.DB.prepare(`UPDATE address_sessions SET details_used = 1
        WHERE token_hash = ? AND owner_hash = ? AND expires_at > ? AND details_used = 0
        AND EXISTS(SELECT 1 FROM address_predictions WHERE token_hash = ? AND place_id = ?) RETURNING token_hash`)
        .bind(token, owner, now, token, raw.id).first();
      if (!session) throw new HttpError(400, 'Wybierz adres z aktualnej listy.');
      const result = await google(`https://places.googleapis.com/v1/places/${encodeURIComponent(raw.id)}?languageCode=pl&sessionToken=${encodeURIComponent(String(raw.token))}`, {}, 'addressComponents,location');
      const components: GoogleComponent[] = [];
      if (Array.isArray(result.addressComponents)) for (const item of result.addressComponents.slice(0, 50)) {
        if (item && typeof item.longText === 'string' && Array.isArray(item.types) && item.types.every((type: unknown) => typeof type === 'string')) {
          components.push({ longText: item.longText, shortText: typeof item.shortText === 'string' ? item.shortText : undefined, types: item.types });
        }
      }
      let address: Partial<ServiceAddress>;
      try { address = googleAddress(components, raw.id); } catch { throw new HttpError(422, 'Wybierz adres w Polsce.'); }
      const location = result.location as { longitude?: unknown; latitude?: unknown } | undefined;
      if (typeof location?.longitude === 'number' && Number.isFinite(location.longitude) && typeof location.latitude === 'number' && Number.isFinite(location.latitude) && Math.abs(location.longitude) <= 180 && Math.abs(location.latitude) <= 90) {
        try {
          const url = new URL('https://uldk.gugik.gov.pl/');
          url.searchParams.set('request', 'GetCommuneByXY'); url.searchParams.set('xy', `${location.longitude},${location.latitude},4326`);
          url.searchParams.set('result', 'teryt,commune,county,voivodeship');
          const response = await fetcher(url, { signal: AbortSignal.timeout(4000) });
          if (response.ok) { const prg = parsePrg(await boundedText(response.body, 4096)); if (prg) Object.assign(address, prg); }
          else await response.body?.cancel();
        } catch { /* The user can supply missing administrative fields manually. */ }
      }
      return { address, proof: await addressProof(address, env, now) };
    },
  };
}
