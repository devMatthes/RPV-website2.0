import { MaxFileSizeExceededError, MultipartParseError, parseMultipartRequest } from '@mjackson/multipart-parser';
import { validateService } from '../../src/lib/service-schema.ts';
import type { ServiceSubmission } from '../../src/lib/service-types.ts';
import { fileLimits, inspectFile } from './attachments.ts';
import { verifiedTeryt } from './address.ts';
import { secret, type WorkerEnv } from './config.ts';
import { consumeWindow, existing, insertService } from './database.ts';
import { HttpError, objectBody, readBody } from './http.ts';
import { digest, sign } from './security.ts';
import { discardUploads, upload, type StoredUpload } from './storage.ts';

function validated(raw: unknown): ServiceSubmission {
  const result = validateService(objectBody(raw));
  if (result.data.website) throw new HttpError(422, 'Nie udało się zweryfikować formularza.');
  if (Object.keys(result.errors).length) throw new HttpError(422, 'Sprawdź zaznaczone pola.', result.errors);
  return result.data;
}
function limitedBody(request: Request): Request {
  const max = fileLimits.totalBytes + 65536;
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new HttpError(413, 'Załączniki mogą zajmować łącznie do 20 MB.');
  if (!request.body) throw new HttpError(400, 'Brak formularza.');
  let total = 0;
  const stream = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) {
    total += chunk.length; if (total > max) throw new HttpError(413, 'Załączniki mogą zajmować łącznie do 20 MB.'); controller.enqueue(chunk);
  } }));
  // duplex is required by Node's Request during local tests; ignored by Workers.
  const init = { method: 'POST', headers: request.headers, body: stream, duplex: 'half' as const };
  return new Request(request.url, init);
}
export async function submitService(request: Request, env: WorkerEnv, key: string, owner: string, now: number) {
  const keyHash = await digest(key);
  const previous = await existing(env.DB, keyHash);
  const files: StoredUpload[] = []; const attempted: string[] = [];
  let raw: unknown; let data: ServiceSubmission | undefined; let retained = false; let lease: string | undefined; let streamed: Request | undefined;
  const multipart = (request.headers.get('content-type') ?? '').startsWith('multipart/form-data;');
  try {
    if (multipart && !previous) {
      lease = crypto.randomUUID();
      const claimed = await env.DB.prepare(`INSERT INTO upload_requests SELECT ?,?,?
        WHERE EXISTS(SELECT 1 FROM upload_requests WHERE key_hash = ?)
          OR (SELECT count(*) FROM upload_requests WHERE expires_at > ?) < 2
        ON CONFLICT(key_hash) DO UPDATE SET lease_token = excluded.lease_token, expires_at = excluded.expires_at
        WHERE expires_at < ? RETURNING key_hash`).bind(keyHash, lease, now + 3600000, keyHash, now, now).first();
      if (!claimed) throw new HttpError(425, 'Wysyłka jest w toku. Spróbuj ponownie za chwilę z tym samym formularzem.');
    }
    const acceptPayload = async (value: unknown) => {
      raw = value; data = validated(raw);
      if (!previous) {
        await consumeWindow(env.DB, owner, 'service', 6, 3600000, now);
        await consumeWindow(env.DB, await sign('global:service', secret(env)), 'service-global', env.ENVIRONMENT === 'staging' ? 10 : 50, 86400000, now);
      }
    };
    if (!multipart) await acceptPayload(await readBody(request));
    else {
      let total = 0; let count = 0;
      streamed = limitedBody(request);
      for await (const part of parseMultipartRequest(streamed, { maxFileSize: fileLimits.inputBytes, maxHeaderSize: 4096 })) {
        if (Date.now() - now > 120000) throw new HttpError(408, 'Wysyłka trwała zbyt długo. Spróbuj ponownie.');
        count++; if (count > 6) throw new HttpError(422, 'Dodaj maksymalnie 5 załączników.');
        if (part.name === 'payload' && !part.filename && raw === undefined) {
          if (part.bytes.length > 32768) throw new HttpError(413, 'Dane formularza są zbyt duże.');
          let parsed: unknown; try { parsed = JSON.parse(part.text); } catch { throw new HttpError(400, 'Niepoprawny formularz.'); }
          await acceptPayload(parsed);
        } else if (part.name === 'attachments' && part.filename && data) {
          const bytes = part.bytes; total += bytes.length;
          if (files.length >= fileLimits.count || total > fileLimits.totalBytes) throw new HttpError(413, 'Maksymalnie 5 plików i 20 MB łącznie.');
          const file = await inspectFile(bytes, part.filename, part.mediaType ?? ''); files.push(file);
          if (!previous) { attempted.push(file.id); await upload(env, file, bytes, Date.now()); }
        } else throw new HttpError(400, 'Niepoprawny układ formularza.');
      }
    }
    if (!data) throw new HttpError(400, 'Brak danych formularza.');
    // Preserve CF3 fingerprints for receipts without attachments.
    const fingerprint = await digest(files.length ? JSON.stringify([data, files.map(file => [file.name, file.hash])]) : JSON.stringify(data));
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new HttpError(409, 'Dane zmieniły się od poprzedniej wysyłki. Rozpocznij nową wysyłkę.');
      return { reference: previous.reference, created: false };
    }
    const proof = objectBody(objectBody(raw).address).proof;
    const teryt = await verifiedTeryt(data.address, proof, env, now); if (teryt) data.address.teryt = teryt;
    const receipt = await insertService(env.DB, data, keyHash, fingerprint, now, files);
    retained = receipt.created;
    return receipt;
  } catch (error) {
    if (error instanceof MaxFileSizeExceededError) throw new HttpError(413, 'Jeden plik może zajmować maksymalnie 5 MB.');
    if (error instanceof MultipartParseError) throw new HttpError(400, 'Niepoprawny lub niekompletny formularz.');
    throw error;
  } finally {
    if (streamed?.body && !streamed.body.locked) {
      try { await streamed.body.cancel(); } catch { /* Client may already be disconnected. */ }
    }
    if (!retained && attempted.length) {
      // On DB/R2 outages retain durable pending metadata for scheduled retry.
      try { await discardUploads(env, attempted); } catch { /* Hourly cleanup retries after the upload lease expires. */ }
    }
    if (lease) await env.DB.prepare('DELETE FROM upload_requests WHERE key_hash = ? AND lease_token = ?').bind(keyHash, lease).run();
  }
}
