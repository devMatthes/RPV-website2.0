import { HttpError } from './http.ts';
// Secrets supplement Wrangler-generated resource types; none live in config or Git.
export type WorkerEnv = Env & { APP_SECRET?: string; GOOGLE_PLACES_API_KEY?: string; ADMIN_EMAIL?: string };
export function secret(env: WorkerEnv): string {
  if (!env.APP_SECRET || env.APP_SECRET.length < 32) throw new HttpError(503, 'Usługa nie jest jeszcze uruchomiona.');
  return env.APP_SECRET;
}
export function allowedOrigins(env: WorkerEnv): Set<string> {
  return new Set(env.PUBLIC_ORIGINS.split(',').filter(Boolean));
}
export function enabled(env: WorkerEnv): boolean { return env.SUBMISSIONS_ENABLED === 'true' && !!env.APP_SECRET && env.APP_SECRET.length >= 32; }
