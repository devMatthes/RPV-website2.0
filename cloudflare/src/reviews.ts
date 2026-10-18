import { googleReviewListing, googleUrl, type GoogleReview, type GoogleReviews } from '../../src/lib/google-reviews.ts';
import { type WorkerEnv, secret } from './config.ts';
import { consumeGoogle, consumeWindow } from './database.ts';
import { boundedText, HttpError, json, objectBody } from './http.ts';
import { sign } from './security.ts';

const unavailable = 'Opinie są chwilowo niedostępne. Zobacz je bezpośrednio w Google Maps.';
const placeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,255}$/.test(value);
const text = (value: unknown, max: number): string | undefined => typeof value === 'string' && value.length <= max ? value : undefined;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const limit = (value: unknown, max: number) => typeof value === 'string' && /^\d+$/.test(value) ? Math.min(max, Number(value)) : 0;

export async function publicReviews(request: Request, env: WorkerEnv, cors: Record<string, string>, fetcher: typeof fetch): Promise<Response> {
  if (new URL(request.url).search) throw new HttpError(400, 'Nieobsługiwane parametry.');
  if (env.GOOGLE_REVIEWS_ENABLED !== 'true' || !env.GOOGLE_PLACES_API_KEY) throw new HttpError(503, unavailable);
  const now = Date.now();
  const owner = await sign(`reviews:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`, secret(env));
  await consumeWindow(env.DB, owner, 'reviews-minute', 2, 60000, now);
  await consumeWindow(env.DB, owner, 'reviews-day', 20, 86400000, now);
  async function google(path: string, mask: string, body?: object) {
    // Separate reviews ceiling plus the existing shared Google budget. Reserve before I/O.
    await consumeGoogle(env.DB, limit(env.GOOGLE_REVIEWS_DAILY_LIMIT, 30), limit(env.GOOGLE_REVIEWS_MONTHLY_LIMIT, 500), now, 'reviews');
    await consumeGoogle(env.DB, limit(env.GOOGLE_DAILY_LIMIT, 100), limit(env.GOOGLE_MONTHLY_LIMIT, 1000), now);
    try {
      const response = await fetcher(`https://places.googleapis.com/v1/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY!, 'X-Goog-FieldMask': mask },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(6000), redirect: 'error',
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error('Provider unavailable'); }
      return objectBody(JSON.parse(await boundedText(response.body, 160 * 1024)));
    } catch { throw new HttpError(503, unavailable); }
  }
  let id = env.GOOGLE_REVIEWS_PLACE_ID || (await env.DB.prepare('SELECT place_id FROM google_review_place WHERE singleton=1').first<{place_id:string}>())?.place_id;
  if (!id) {
    const result = await google('places:searchText', 'places.id', { textQuery: googleReviewListing.search, languageCode: 'pl', regionCode: 'PL', pageSize: 1 });
    id = Array.isArray(result.places) ? record(result.places[0]).id as string : undefined;
  }
  if (!placeId(id)) throw new HttpError(503, unavailable);
  const result = await google(`places/${encodeURIComponent(id)}?languageCode=pl`, 'displayName,formattedAddress,websiteUri,rating,userRatingCount,googleMapsUri,reviews');
  const name = text(record(result.displayName).text, 200) ?? '';
  let matchingWebsite = false;
  try { matchingWebsite = ['rpv.pl', 'www.rpv.pl', 'rpv.net.pl', 'www.rpv.net.pl'].includes(new URL(String(result.websiteUri)).hostname); } catch { /* Address can confirm the listing instead. */ }
  if (!/\brpv\b/i.test(name) || (!matchingWebsite && !/sobawiny/i.test(String(result.formattedAddress)))) throw new HttpError(503, unavailable);
  // Store the identifier only after confirming the business; Place IDs may be retained.
  await env.DB.prepare('INSERT INTO google_review_place(singleton,place_id) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET place_id=excluded.place_id').bind(id).run();
  const url = googleUrl(result.googleMapsUri) ?? googleReviewListing.url;
  const reviews: GoogleReview[] = [];
  for (const entry of (Array.isArray(result.reviews) ? result.reviews : []).slice(0, 5)) {
    const review = record(entry), author = record(review.authorAttribution);
    const authorName = text(author.displayName, 200), rating = review.rating;
    const source = googleUrl(review.googleMapsUri);
    const quote = text(record(review.originalText).text, 16000) ?? text(record(review.text).text, 16000) ?? '';
    if (!authorName || typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5 || !source) continue;
    reviews.push({ author: authorName, authorUrl: googleUrl(author.uri), avatarUrl: googleUrl(author.photoUri, true), rating, text: quote,
      publishedAt: typeof review.publishTime === 'string' && Number.isFinite(Date.parse(review.publishTime)) ? new Date(review.publishTime).toISOString() : undefined,
      relativeDate: text(review.relativePublishTimeDescription, 100), url: source });
  }
  const data: GoogleReviews = { placeId: id, name, url, reviews,
    rating: typeof result.rating === 'number' && Number.isFinite(result.rating) && result.rating >= 0 && result.rating <= 5 ? result.rating : null,
    count: typeof result.userRatingCount === 'number' && Number.isSafeInteger(result.userRatingCount) && result.userRatingCount >= 0 ? result.userRatingCount : 0 };
  return json(data, 200, { ...cors, 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' });
}
