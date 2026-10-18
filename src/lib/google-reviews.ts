// Public configuration only. Google review content is fetched at runtime, never built into Git.
export const googleReviewListing = {
  name: 'RPV Sp. z o.o.',
  url: 'https://share.google/dhmFMs1k595cF5XHi',
  search: 'RPV Sp. z o.o. Sobawiny 45 Polska',
};
export interface GoogleReview {
  author: string;
  authorUrl?: string;
  avatarUrl?: string;
  rating: number;
  text: string;
  publishedAt?: string;
  relativeDate?: string;
  url: string;
}
export interface GoogleReviews {
  placeId: string;
  name: string;
  rating: number | null;
  count: number;
  url: string;
  reviews: GoogleReview[];
}
export function googleUrl(value: unknown, image = false): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return;
    const domain = image ? 'googleusercontent.com' : 'google.com';
    if (url.hostname !== domain && !url.hostname.endsWith('.' + domain)) return;
    return url.href;
  } catch { return; }
}
