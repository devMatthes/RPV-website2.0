import { uploadLimits } from './service-types.ts';
export function validateServiceFiles(files: { name: string; size: number; type: string }[]): string {
  if (files.length > uploadLimits.count) return 'Możesz dodać maksymalnie 5 plików.';
  if (files.reduce((sum, file) => sum + file.size, 0) > uploadLimits.totalBytes) return 'Załączniki mogą zajmować łącznie do 40 MB.';
  for (const file of files) {
    if (!/\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(file.name) || (file.type && !['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'].includes(file.type))) return 'Dodaj JPG, PNG, WebP, HEIC, HEIF lub PDF.';
    if (file.size <= 0 || file.size > uploadLimits.inputBytes) return 'Jeden plik może zajmować od 1 bajta do 20 MB.';
  }
  return '';
}
