import { type WorkerEnv } from './config.ts';
import { boundedText, HttpError } from './http.ts';

export async function verifyTurnstile(request: Request, env: WorkerEnv, action: 'contact' | 'service', fetcher: typeof fetch = fetch): Promise<void> {
  // Only the explicit local environment may omit CAPTCHA. Staging/production fail closed.
  if (env.ENVIRONMENT === 'local' && !env.TURNSTILE_SECRET) return;
  if (!env.TURNSTILE_SECRET) throw new HttpError(503, 'Ochrona formularza jest chwilowo niedostępna.');
  const token = request.headers.get('X-Turnstile-Token');
  if (!token || token.length > 2048) throw new HttpError(403, 'Potwierdź weryfikację formularza i spróbuj ponownie.');
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  const ip = request.headers.get('CF-Connecting-IP'); if (ip) body.set('remoteip', ip);
  let result: Record<string, unknown>;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('provider');
    result = JSON.parse(await boundedText(response.body, 16384));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('provider');
  } catch { throw new HttpError(503, 'Weryfikacja jest chwilowo niedostępna. Spróbuj ponownie.'); }
  // Bind to this request's allowed Origin, not merely any hostname on the widget.
  const hostname = new URL(request.headers.get('Origin')!).hostname;
  if (result.success !== true || result.hostname !== hostname || result.action !== action) {
    throw new HttpError(403, 'Weryfikacja wygasła lub nie powiodła się. Spróbuj ponownie.');
  }
  // No provider idempotency key: an already consumed token must never be accepted again.
}
