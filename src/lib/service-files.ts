import { uploadLimits } from './service-types.ts';
type FileInfo = { name: string; size: number; type: string };
export function validateServiceFiles(files: FileInfo[], stage: 'input' | 'final' = 'input'): string {
  if (files.length > uploadLimits.count) return 'Możesz dodać maksymalnie 5 plików.';
  const total = stage === 'input' ? uploadLimits.inputTotalBytes : uploadLimits.totalBytes;
  if (files.reduce((sum, file) => sum + file.size, 0) > total) return stage === 'input' ? 'Wybierz oryginały o łącznym rozmiarze do 40 MB. Możesz dodawać zdjęcia mniejszymi partiami.' : 'Gotowe załączniki mogą zajmować łącznie do 20 MB.';
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const types: Record<string, string[]> = { jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'], pdf: ['application/pdf'] };
    if (stage === 'input') { types.heic = ['image/heic','image/heif','image/jpeg']; types.heif = ['image/heic','image/heif','image/jpeg']; }
    if (!extension || !types[extension] || (file.type && file.type !== 'application/octet-stream' && !types[extension].includes(file.type))) return stage === 'input' ? 'Dodaj JPG, PNG, WebP, HEIC, HEIF lub PDF zgodny z typem pliku.' : 'Gotowy plik musi być JPG, PNG, WebP lub PDF.';
    const max = stage === 'final' || extension === 'pdf' ? uploadLimits.finalBytes : uploadLimits.inputBytes;
    if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > max) return max === uploadLimits.finalBytes ? 'Jeden gotowy plik lub PDF może zajmować do 5 MB.' : 'Oryginalne zdjęcie może zajmować do 20 MB.';
  }
  return '';
}
