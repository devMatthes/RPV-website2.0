import { abortable } from '../lib/abortable';
import { validateServiceFiles } from '../lib/service-files';
export interface SelectedFile { file: File; preview?: string; originalBytes: number; }
export function attachFiles(form: HTMLFormElement) {
  const picker = form.querySelector<HTMLInputElement>('#service-files')!;
  const list = form.querySelector<HTMLUListElement>('.file-list')!;
  const error = form.querySelector<HTMLElement>('#file-error')!;
  const status = form.querySelector<HTMLElement>('.file-progress')!;
  const submit = form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const selected: SelectedFile[] = []; let busy = false; let locked = false; let generation = 0; let controller: AbortController | undefined;
  const showError = (message: string) => { error.textContent = message; error.hidden = !message; };
  const render = () => {
    list.replaceChildren(); selected.forEach((item, index) => {
      const li = document.createElement('li'); if (item.preview) { const image = document.createElement('img'); image.src = item.preview; image.alt = ''; li.append(image); }
      const label = document.createElement('span'); label.textContent = `${item.file.name} · ${Math.ceil(item.file.size / 1024)} kB${item.file.size < item.originalBytes ? ` (z ${Math.ceil(item.originalBytes / 1024)} kB)` : ''}`;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Usuń'; remove.disabled = busy || locked; remove.setAttribute('aria-label', `Usuń ${item.file.name}`);
      remove.onclick = () => { if (busy || locked) return; if (item.preview) URL.revokeObjectURL(item.preview); selected.splice(index, 1); render(); showError(''); };
      li.append(label, remove); list.append(li);
    });
    if (busy) { const li = document.createElement('li'); const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Anuluj przygotowanie'; cancel.onclick = () => controller?.abort(); li.append(cancel); list.append(li); }
    picker.disabled = busy || locked; submit.disabled = busy || locked;
  };
  picker.addEventListener('change', async () => {
    if (busy || locked) return;
    const files = Array.from(picker.files ?? []); picker.value = ''; if (!files.length) return;
    const validation = validateServiceFiles([...selected.map(item => item.file), ...files], 'input');
    if (validation) { showError(validation); return; }
    busy = true; const current = ++generation; controller = new AbortController(); const signal = controller.signal;
    const staged: SelectedFile[] = []; status.hidden = false; showError(''); render();
    try {
      const { prepareFile, makePreview } = await abortable(import('./service-prepare'), signal).catch(() => { throw new Error('Nie udało się pobrać narzędzi do zdjęć. Sprawdź połączenie i spróbuj ponownie.'); });
      for (const [index, original] of files.entries()) {
        if (signal.aborted) throw new DOMException('Przerwano', 'AbortError');
        status.textContent = `Przygotowujemy ${index + 1} z ${files.length}: ${original.name}`;
        const file = await prepareFile(original, signal, value => { if (!signal.aborted) status.textContent = `Przygotowujemy ${index + 1} z ${files.length}: ${Math.round(value)}%`; });
        if (signal.aborted || current !== generation) throw new DOMException('Przerwano', 'AbortError');
        const next = validateServiceFiles([...selected.map(item => item.file), ...staged.map(item => item.file), file], 'final'); if (next) throw new Error(next);
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          try { const thumbnail = await makePreview(file, signal); if (!signal.aborted) preview = URL.createObjectURL(thumbnail); }
          catch { /* A failed thumbnail does not invalidate an already prepared file. */ }
        }
        if (signal.aborted) throw new DOMException('Przerwano', 'AbortError');
        staged.push({ file, preview, originalBytes: original.size });
      }
      selected.push(...staged); staged.length = 0; status.textContent = 'Załączniki gotowe. Możesz wysłać zgłoszenie.';
    } catch (problem) {
      status.textContent = signal.aborted ? 'Przygotowanie anulowane. Poprzednie załączniki pozostają na liście.' : '';
      if (!signal.aborted) showError(`${problem instanceof Error ? problem.message : 'Nie udało się przygotować zdjęć.'} Ta partia nie została dodana. Wybierz pliki ponownie.`);
    } finally {
      for (const item of staged) if (item.preview) URL.revokeObjectURL(item.preview);
      busy = false; controller = undefined; status.hidden = !status.textContent; render();
    }
  });
  const reset = () => { ++generation; controller?.abort(); for (const item of selected) if (item.preview) URL.revokeObjectURL(item.preview); selected.length = 0; status.hidden = true; showError(''); render(); };
  window.addEventListener('pagehide', reset);
  return { getFiles: () => selected.map(item => item.file), isBusy: () => busy,
    validate: () => { const message = validateServiceFiles(selected.map(item => item.file), 'final'); showError(message); return !message; },
    reset, lock: (value: boolean) => { locked = value; render(); } };
}
