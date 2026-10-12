import { abortable } from '../lib/abortable';
import { imageDimensions } from '../lib/image-dimensions';
import { uploadLimits } from '../lib/service-types';
import { validateServiceFiles } from '../lib/service-files';
function aborted(signal: AbortSignal) { if (signal.aborted) throw new DOMException('Przerwano', 'AbortError'); }
// Isolate the HEIC library's canvas/worker lifetime. Removing the frame releases
// the worker and its blob URLs on completion, cancellation and timeout.
async function convertHEIC(file: File, signal: AbortSignal): Promise<File> {
  const { default: libraryURL } = await abortable(import('heic2any/dist/heic2any.js?url'), signal);
  aborted(signal);
  const frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'Przygotowanie zdjęcia'; frame.setAttribute('aria-hidden', 'true');
  document.body.append(frame);
  const realm = frame.contentWindow as (Window & { Blob: typeof Blob; heic2any?: (options: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>; __heic2any__worker?: Worker }) | null;
  const doc = frame.contentDocument;
  if (!realm || !doc) { frame.remove(); throw new Error('Nie udało się przygotować zdjęcia HEIC. Wybierz JPG.'); }
  let timer: ReturnType<typeof setTimeout> | undefined; let cancel: (() => void) | undefined;
  try {
    return await new Promise<File>((resolve, reject) => {
      cancel = () => reject(new DOMException('Przerwano', 'AbortError'));
      signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => reject(new Error('Przygotowanie HEIC trwało zbyt długo. Zapisz zdjęcie jako JPG i dodaj ponownie.')), 30000);
      const script = doc.createElement('script'); script.src = new URL(libraryURL, location.href).href;
      script.onerror = () => reject(new Error('Nie udało się pobrać konwertera HEIC. Sprawdź połączenie lub dodaj JPG.'));
      script.onload = () => {
        if (signal.aborted) { cancel?.(); return; }
        if (!realm.heic2any) { reject(new Error('Konwerter HEIC jest niedostępny. Dodaj JPG.')); return; }
        void realm.heic2any({ blob: new realm.Blob([file], { type: file.type }), toType: 'image/jpeg', quality: .9 })
          .then(output => {
            if (Array.isArray(output)) { reject(new Error('Plik zawiera kilka zdjęć. Wyeksportuj wybrane zdjęcie jako JPG.')); return; }
            resolve(new File([output], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' }));
          }).catch(() => reject(new Error('Nie udało się przekonwertować tego HEIC. Zapisz go jako JPG i dodaj ponownie.')));
      };
      doc.head.append(script);
    });
  } finally {
    if (timer) clearTimeout(timer); if (cancel) signal.removeEventListener('abort', cancel);
    realm.__heic2any__worker?.terminate(); frame.remove();
  }
}
export async function prepareFile(original: File, signal: AbortSignal, progress: (value: number) => void): Promise<File> {
  aborted(signal);
  if (/\.pdf$/i.test(original.name)) {
    const head = await original.slice(0, 8).text(); const tail = await original.slice(-1024).text();
    if (!/^%PDF-[12]\.\d/.test(head) || !/%%EOF\s*$/.test(tail)) throw new Error('Niepoprawny lub niekompletny PDF.');
    const error = validateServiceFiles([original], 'final'); if (error) throw new Error(error);
    aborted(signal); progress(100); return original;
  }
  const header = new Uint8Array(await original.slice(0, 1024 * 1024).arrayBuffer());
  const dimensions = imageDimensions(header);
  if (!dimensions || !dimensions.width || !dimensions.height) throw new Error('Nie udało się odczytać zdjęcia. Dodaj poprawny JPG, PNG, WebP lub HEIC.');
  if (dimensions.width * dimensions.height > uploadLimits.pixels) throw new Error('Zdjęcie przekracza 40 megapikseli. Wybierz mniejszy plik.');
  let file = original;
  aborted(signal);
  const jpeg = header[0] === 255 && header[1] === 216;
  if (/\.hei[cf]$/i.test(file.name) && !jpeg) file = await convertHEIC(file, signal);
  else if (!file.type || file.type === 'application/octet-stream' || /\.hei[cf]$/i.test(file.name)) {
    const type = jpeg ? 'image/jpeg' : header[0] === 137 ? 'image/png' : 'image/webp';
    file = new File([file], file.name, { type });
  }
  aborted(signal);
  try {
  const [{ default: compress }, { default: workerURL }] = await abortable(Promise.all([
    import('browser-image-compression'), import('browser-image-compression/dist/browser-image-compression.js?url'),
  ]), signal);
  aborted(signal);
  const compressed = await compress(file, { fileType: 'image/jpeg', maxSizeMB: 1.5, maxWidthOrHeight: uploadLimits.imageEdge, initialQuality: .9,
    preserveExif: false, useWebWorker: true, libURL: new URL(workerURL, location.href).href, signal, maxIteration: 8, onProgress: progress });
  aborted(signal);
  const result = new File([compressed], original.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  const finalError = validateServiceFiles([result], 'final'); if (finalError) throw new Error(finalError);
  const actual = imageDimensions(new Uint8Array(await result.slice(0, 1024 * 1024).arrayBuffer()));
  if (!actual || actual.width > uploadLimits.imageEdge || actual.height > uploadLimits.imageEdge) throw new Error('Nie udało się zmniejszyć zdjęcia. Wybierz mniejsze zdjęcie.');
  return result;
  } catch (problem) {
    if (signal.aborted) throw new DOMException('Przerwano', 'AbortError');
    throw new Error('Nie udało się przygotować zdjęcia. Sprawdź połączenie lub wybierz mniejszy, poprawny plik JPG.');
  }
}

export async function makePreview(file: File, signal: AbortSignal): Promise<Blob> {
  const [{ default: compress }, { default: workerURL }] = await abortable(Promise.all([
    import('browser-image-compression'), import('browser-image-compression/dist/browser-image-compression.js?url'),
  ]), signal);
  return compress(file, { fileType: 'image/jpeg', maxSizeMB: .025, maxWidthOrHeight: 128, initialQuality: .75,
    preserveExif: false, useWebWorker: true, libURL: new URL(workerURL, location.href).href, signal, maxIteration: 3 });
}
