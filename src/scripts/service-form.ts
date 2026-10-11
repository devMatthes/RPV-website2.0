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
  let attempted = false;
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
  input('phone').addEventListener('beforeinput', (event: InputEvent) => { if (event.data && /[^+\d\s()-]/.test(event.data)) event.preventDefault(); });
  form.addEventListener('input', () => { if (attempted) void validate(); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (attachments.isBusy()) return; attempted = true;
    const result = await validate();
    if (Object.keys(result.errors).length) { form.querySelector<HTMLElement>('[aria-invalid=true]')?.focus(); return; }
    feedback.textContent = 'Wysyłka nie jest jeszcze dostępna. Dane pozostają w formularzu. Zadzwoń: 515 114 676.'; feedback.hidden = false; feedback.focus();
  });
}
