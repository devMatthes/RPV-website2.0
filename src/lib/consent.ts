export interface Consent { version: 1; analytics: boolean; marketing: boolean; updatedAt: number; }
export const consentLifetime = 180 * 24 * 60 * 60 * 1000;
export function parseConsent(raw: string | null, now = Date.now()): Consent | null {
  try {
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value?.version !== 1 || typeof value.analytics !== 'boolean' || typeof value.marketing !== 'boolean' || !Number.isFinite(value.updatedAt) || value.updatedAt > now || now - value.updatedAt > consentLifetime) return null;
    return { version: 1, analytics: value.analytics, marketing: value.marketing, updatedAt: value.updatedAt };
  } catch { return null; }
}
