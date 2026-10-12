export class HttpError extends Error {
  status: number;
  errors?: Record<string, string>;
  retryAfter?: number;
  constructor(status: number, message: string, errors?: Record<string, string>, retryAfter?: number) { super(message); this.status = status; this.errors = errors; this.retryAfter = retryAfter; }
}
export function json(body: object, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY', ...headers,
  } });
}
// Count actual streamed bytes: Content-Length is only an early rejection hint.
export async function boundedText(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
  if (!body) return '';
  const reader = body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Żądanie przekracza dozwolony rozmiar.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
}
export async function readBody(request: Request, multipart = false): Promise<unknown> {
  const type = request.headers.get('content-type') ?? '';
  const limit = multipart && type.startsWith('multipart/form-data;') ? 40 * 1024 : 32 * 1024;
  const size = request.headers.get('content-length');
  if (size && (!/^\d+$/.test(size) || Number(size) > limit)) throw new HttpError(413, 'Żądanie przekracza dozwolony rozmiar.');
  if (!/^application\/json(?:;|$)/i.test(type) && !(multipart && type.startsWith('multipart/form-data;'))) {
    throw new HttpError(415, 'Nieobsługiwany format formularza.');
  }
  try {
    const text = await boundedText(request.body, limit);
    if (/^application\/json(?:;|$)/i.test(type)) return JSON.parse(text);
    const form = await new Response(text, { headers: { 'Content-Type': type } }).formData();
    const entries = [...form.entries()];
    if (entries.some(([key]) => key === 'attachments')) throw new HttpError(503, 'Załączniki będą dostępne po uruchomieniu obsługi plików.');
    if (entries.length !== 1 || entries[0][0] !== 'payload' || typeof entries[0][1] !== 'string') {
      throw new HttpError(400, 'Niepoprawny formularz.');
    }
    return JSON.parse(entries[0][1]);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Niepoprawne dane formularza.');
  }
}
export function objectBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'Niepoprawne dane.');
  return raw as Record<string, unknown>;
}
