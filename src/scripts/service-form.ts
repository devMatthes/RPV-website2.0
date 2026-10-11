import { attachFiles } from './service-images';
import { attachAddress } from './service-address';
import type { ServiceSubmission } from '../lib/service-schema';
const form = document.querySelector<HTMLFormElement>('[data-service-form]');
if (form) {
  const button = form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const feedback = form.querySelector<HTMLElement>('.form-feedback')!;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const notice = form.querySelector<HTMLElement>('.api-notice')!;
  if (!form.dataset.api) { notice.textContent = 'Wysyłka zgłoszeń nie jest jeszcze uruchomiona. Zadzwoń: 515 114 676. Możesz przygotować dane w formularzu.'; notice.hidden = false; }
  button.disabled = false;
  const attachments = attachFiles(form);
  const address = attachAddress(form, (form.dataset.api ?? '').replace(/\/$/, ''));
  const data = (): ServiceSubmission => ({ name: input('name').value, email: input('email').value, phone: input('phone').value, address: { street: input('street').value, building: input('building').value, apartment: input('apartment').value, postcode: input('postcode').value, city: input('city').value, commune: input('commune').value, county: input('county').value, province: input('province').value, country: 'PL', source: 'manual', ...address.getSelection() }, installation: input('installation').value, inverter: input('inverter').value, battery: input('battery').value, message: input('message').value, privacy: input('privacy').checked, website: input('website').value });
  let attempted = false; let sending = false; let retryKey = crypto.randomUUID(); let previousPayload = '';
  const validate = async () => {
    const { validateService } = await import('../lib/service-schema');
    const result = validateService(data());
    for (const field of Array.from(form.elements)) {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) continue;
      const error = document.getElementById(`field-${field.name}-error`);
      if (!error) continue;
      error.textContent = result.errors[field.name] ?? ''; error.hidden = !error.textContent;
      if (error.textContent) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    }
    return result;
  };
  // A telephone keyboard includes '+'; pasted formatting is accepted and normalized on submission.
  input('postcode').addEventListener('input',()=>{const field=input('postcode');if(/^[\d-]*$/.test(field.value)){const digits=field.value.replace(/-/g,'');field.value=digits.length>2?`${digits.slice(0,2)}-${digits.slice(2)}`:digits;}});
  input('phone').addEventListener('beforeinput', (event: InputEvent) => { if (event.data && /[^+\d\s()-]/.test(event.data)) event.preventDefault(); });
  form.addEventListener('input', () => { if (attempted) void validate().catch(()=>{}); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (attachments.isBusy() || address.isBusy() || sending) return; sending = true; attempted = true;
    let result: Awaited<ReturnType<typeof validate>>;
    try { result = await validate(); } catch { sending=false; feedback.textContent='Nie udało się załadować walidacji. Sprawdź połączenie z internetem. Dane nie zostały wysłane i pozostają w formularzu.';feedback.hidden=false;feedback.focus();return; }
    if (Object.keys(result.errors).length) { sending = false; form.querySelector<HTMLElement>('[aria-invalid=true]')?.focus(); return; }
    if (!form.dataset.api) { sending = false; feedback.textContent = 'Wysyłka nie jest jeszcze dostępna. Dane pozostają w formularzu. Zadzwoń: 515 114 676.'; feedback.hidden = false; feedback.focus(); return; }
    const payload = { ...result.data, address: { ...result.data.address, ...address.getSelection() } };
    const signature = JSON.stringify([payload, attachments.getFiles().map(file=>[file.name,file.size,file.lastModified])]);
    if (previousPayload !== signature) { retryKey = crypto.randomUUID(); previousPayload = signature; }
    const body = new FormData(); body.append('payload', JSON.stringify(payload)); for (const file of attachments.getFiles()) body.append('attachments',file,file.name);
    button.disabled = true; button.textContent = 'Wysyłamy…'; attachments.lock(true);
    const controls = Array.from(form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type=file]),select,textarea')); controls.forEach(field=>field.disabled=true);
    feedback.textContent = 'Zapisujemy zgłoszenie i załączniki…'; feedback.hidden = false;
    const timeout = new AbortController(); const timer = setTimeout(()=>timeout.abort(),120_000);
    try {
      const response = await fetch(`${form.dataset.api.replace(/\/$/,'')}/api/service`,{method:'POST',headers:{'Idempotency-Key':retryKey},body,signal:timeout.signal});
      const receipt = await response.json();
      if (!response.ok) {
        if (receipt.errors) for (const [name,message] of Object.entries(receipt.errors)) { const field=input(name); const error=document.getElementById(`field-${name}-error`); if(error&&field){error.textContent=String(message);error.hidden=false;field.setAttribute('aria-invalid','true');} }
        throw new Error(receipt.message ?? 'Nie udało się zapisać zgłoszenia. Spróbuj ponownie.');
      }
      if (typeof receipt.reference !== 'string' || !/^SRV-\d{4}-\d{6,}$/.test(receipt.reference)) throw new Error('Nie otrzymaliśmy potwierdzenia zapisu. Spróbuj ponownie.');
      feedback.textContent = `Zgłoszenie ${receipt.reference} zostało zapisane. Zachowaj ten numer. RPV skontaktuje się z Tobą telefonicznie lub mailowo. Automatyczne powiadomienia e-mail nie są jeszcze włączone.`;
      form.reset(); attachments.reset(); address.reset(); attempted=false; previousPayload=''; retryKey=crypto.randomUUID();
    } catch(problem) { feedback.textContent = problem instanceof DOMException && problem.name==='AbortError' ? 'Serwer nie odpowiedział w czasie. Dane i pliki pozostają w formularzu. Kliknij ponownie Wyślij zgłoszenie — powtórzenie nie utworzy duplikatu.' : `${problem instanceof TypeError?'Nie udało się połączyć z serwerem.':problem instanceof Error?problem.message:'Błąd połączenia.'} Dane i pliki pozostają w formularzu. Możesz spróbować ponownie.`; }
    finally { clearTimeout(timer); sending=false; controls.forEach(field=>field.disabled=false);attachments.lock(false);button.disabled=false;button.textContent='Wyślij zgłoszenie';feedback.focus(); }

  });
}
