import { googleUrl, type GoogleReviews } from '../lib/google-reviews';

const section = document.querySelector<HTMLElement>('[data-google-reviews]');
const trigger = document.querySelector<HTMLElement>('[data-reviews-trigger]');
if (section && trigger && section.dataset.api) {
  const load = async () => {
    try {
      const endpoint = new URL(`${section.dataset.api!.replace(/\/$/, '')}/api/reviews`, location.origin);
      const response = await fetch(endpoint, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;
      const data: GoogleReviews = await response.json();
      if (!Array.isArray(data.reviews) || !data.reviews.length) return;
      const template = section.querySelector<HTMLTemplateElement>('[data-review-template]')!;
      const cards = section.querySelector<HTMLElement>('[data-review-cards]')!;
      for (const review of data.reviews.slice(0, 5)) {
        const source = googleUrl(review.url);
        if (!source || typeof review.author !== 'string' || !review.author.trim() || typeof review.text !== 'string' || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) continue;
        const fragment = template.content.cloneNode(true) as DocumentFragment;
        const stars = fragment.querySelector<HTMLElement>('[data-review-stars]')!;
        stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        stars.setAttribute('aria-label', `${review.rating} na 5 gwiazdek`);
        const quote = fragment.querySelector<HTMLElement>('[data-review-text]')!;
        quote.textContent = review.text;
        quote.hidden = !review.text;
        const author = fragment.querySelector<HTMLAnchorElement>('[data-review-author]')!;
        author.textContent = review.author;
        author.href = googleUrl(review.authorUrl) ?? source;
        fragment.querySelector<HTMLElement>('[data-review-initials]')!.textContent = review.author.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('');
        const avatar = fragment.querySelector<HTMLImageElement>('[data-review-avatar]')!;
        const avatarUrl = googleUrl(review.avatarUrl, true);
        if (avatarUrl) {
          avatar.addEventListener('load', () => { avatar.hidden = false; }, { once: true });
          avatar.src = avatarUrl;
        }
        fragment.querySelector<HTMLElement>('[data-review-date]')!.textContent = typeof review.relativeDate === 'string' ? review.relativeDate : '';
        fragment.querySelector<HTMLAnchorElement>('[data-review-source]')!.href = source;
        cards.append(fragment);
      }
      if (!cards.children.length) return;
      const listing = googleUrl(data.url);
      if (listing) section.querySelector<HTMLAnchorElement>('[data-review-listing]')!.href = listing;
      const summary = section.querySelector<HTMLElement>('[data-review-summary]')!;
      if (typeof data.rating === 'number' && Number.isFinite(data.rating) && data.rating >= 0 && data.rating <= 5 && Number.isSafeInteger(data.count) && data.count > 0) {
        summary.textContent = `${new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(data.rating)}/5 · Liczba opinii: ${new Intl.NumberFormat('pl-PL').format(data.count)}`;
      }
      section.hidden = false;
    } catch { /* Hidden on timeout, missing configuration, quota exhaustion or provider failure. No retries. */ }
  };
  // Observe a separate marker: a hidden section has no intersection rectangle.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void load();
    }, { rootMargin: '1000px 0px' });
    observer.observe(trigger);
  } else { void load(); }
}
