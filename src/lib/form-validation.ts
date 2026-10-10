export interface Attachment { name: string; size: number; type: string; }
export const attachmentLimits = { count: 5, perFile: 10 * 1024 * 1024, total: 20 * 1024 * 1024 };
const extensions = /\.(jpe?g|png|webp|heic|heif|pdf)$/i;
const mimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']);
export function validateAttachments(files: Attachment[]): string {
  if (files.length > attachmentLimits.count) return 'Dodaj maksymalnie 5 plików.';
  if (files.some(file => !extensions.test(file.name) || (file.type && !mimeTypes.has(file.type)))) return 'Wybierz zdjęcia JPG, PNG, WebP, HEIC lub dokumenty PDF.';
  if (files.some(file => file.size === 0)) return 'Nie można dodać pustego pliku.';
  if (files.some(file => file.size > attachmentLimits.perFile)) return 'Jeden plik może mieć maksymalnie 10 MB.';
  if (files.reduce((sum, file) => sum + file.size, 0) > attachmentLimits.total) return 'Łączny rozmiar załączników może wynosić maksymalnie 20 MB.';
  return '';
}
export function validPhone(value: string): boolean {
  return /^\+?[\d\s()-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ''));
}
