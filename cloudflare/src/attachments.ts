import { imageDimensions } from '../../src/lib/image-dimensions.ts';
import type { WorkerEnv } from './config.ts';
import { budgetBatch, operationStatements, type StoredUpload } from './storage.ts';
import { administrator } from './admin-session.ts';
import { HttpError } from './http.ts';
import type { JWTVerifyGetKey } from 'jose';
export const fileLimits = { count: 5, inputBytes: 5242880, totalBytes: 20971520, pixels: 40000000, imageEdge: 2560 };
export async function inspectFile(bytes: Uint8Array, filename: string, declared: string): Promise<StoredUpload> {
  const name = filename.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, '').normalize('NFC').slice(0, 160);
  if (!name || !bytes.length || bytes.length > fileLimits.inputBytes) throw new HttpError(413, 'Jeden plik może zajmować maksymalnie 5 MB.');
  const start = (n: number) => String.fromCharCode(...bytes.subarray(0, n));
  const end = String.fromCharCode(...bytes.subarray(Math.max(0, bytes.length - 1024)));
  let mime = ''; let extension: RegExp;
  if (start(5) === '%PDF-') {
    mime = 'application/pdf'; extension = /\.pdf$/i;
    if (!/^%PDF-[12]\.\d/.test(start(8)) || !/%%EOF\s*$/.test(end)) throw new HttpError(422, 'Niepoprawny dokument PDF.');
  } else {
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
      mime = 'image/jpeg'; extension = /\.jpe?g$/i;
      if (bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new HttpError(422, 'Niekompletne zdjęcie JPG.');
    } else if (bytes.length >= 24 && bytes.slice(0,8).every((byte, i) => byte === [137,80,78,71,13,10,26,10][i])) {
      mime = 'image/png'; extension = /\.png$/i;
      if (String.fromCharCode(...bytes.slice(-8,-4)) !== 'IEND') throw new HttpError(422, 'Niekompletne zdjęcie PNG.');
    } else if (start(4) === 'RIFF' && String.fromCharCode(...bytes.subarray(8,12)) === 'WEBP') {
      mime = 'image/webp'; extension = /\.webp$/i;
      if (bytes.length < 30 || new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4,true) + 8 !== bytes.length) throw new HttpError(422, 'Niepoprawne zdjęcie WebP.');
    } else throw new HttpError(422, 'Dodaj JPG, PNG, WebP lub PDF. HEIC/HEIF musi zostać przekonwertowany w przeglądarce.');
    const size = imageDimensions(bytes);
    if (!size || size.width <= 0 || size.height <= 0 || size.width * size.height > fileLimits.pixels) throw new HttpError(422, 'Niepoprawny lub zbyt duży obraz.');
  }
  if (!extension.test(name) || (declared && declared !== 'application/octet-stream' && declared !== mime)) throw new HttpError(422, 'Typ pliku nie zgadza się z zawartością.');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  const id = crypto.randomUUID(); return { id, key: `private/${crypto.randomUUID()}`, name, mime, bytes: bytes.length, hash };
}
export async function attachmentResponse(request: Request, env: WorkerEnv, caseId: string, fileId: string, accessKeys?: JWTVerifyGetKey): Promise<Response> {
  await administrator(request, env, accessKeys);
  const now = Date.now();
  const file = await env.DB.prepare(`SELECT a.object_key,a.original_name,a.content_type,a.bytes FROM file_assets a
    JOIN case_attachments ca ON ca.asset_id = a.id JOIN cases c ON c.id=ca.case_id
    WHERE ca.case_id = ? AND a.id = ? AND a.visibility = 'private' AND a.state = 'ready' AND (c.delete_after IS NULL OR c.delete_after>?)`)
    .bind(caseId, fileId, now).first<{ object_key: string; original_name: string; content_type: string; bytes: number }>();
  if (!file) throw new HttpError(404, 'Nie znaleziono załącznika.');
  await budgetBatch(env, operationStatements(env, 'r2_class_b', now));
  const object = await env.FILES.get(file.object_key);
  if (!object) throw new HttpError(404, 'Nie znaleziono pliku.');
  if (object.size !== file.bytes) { await object.body.cancel(); throw new HttpError(503, 'Plik jest chwilowo niedostępny.'); }
  const preview = new URL(request.url).searchParams.get('preview') === '1' && file.content_type.startsWith('image/');
  return new Response(object.body, { headers: {
    'Content-Type': file.content_type, 'Content-Length': String(object.size), 'Cache-Control': 'private, no-store',
    'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.original_name).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16)}`)}`,
    'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
  } });
}
