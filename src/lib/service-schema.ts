import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

import { installations, provinces, uploadLimits, type ServiceSubmission } from './service-types.ts';
export * from './service-types.ts';
export type FieldErrors = Record<string, string>;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.normalize('NFC').trim().slice(0, max) : '';
export function validateService(input: unknown): { data: ServiceSubmission; errors: FieldErrors } {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const addr = raw.address && typeof raw.address === 'object' ? raw.address as Record<string, unknown> : {};
  const errors: FieldErrors = {};
  const field = (key: string, value: unknown, max: number, required = true) => {
    const result = clean(value, max);
    if (required && !result) errors[key] = 'Uzupełnij to pole.';
    if (typeof value === 'string' && value.trim().length > max) errors[key] = `Maksymalnie ${max} znaków.`;
    if (typeof value === 'string' && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) errors[key] = 'Usuń niedozwolone znaki.';
    return result;
  };
  const phoneText = field('phone', raw.phone, 30);
  const phone = /^[+\d\s()-]+$/.test(phoneText) ? parsePhoneNumberFromString(phoneText, 'PL') : undefined;
  if (!phone?.isValid()) errors.phone = 'Podaj poprawny numer, np. 515 114 676 lub +48 515 114 676.';
  const data: ServiceSubmission = {
    name: field('name', raw.name, 120), email: field('email', raw.email, 254), phone: phone?.number ?? phoneText,
    address: { street: field('street', addr.street, 160, false), building: field('building', addr.building, 30), apartment: field('apartment', addr.apartment, 30, false), postcode: field('postcode', addr.postcode, 6), city: field('city', addr.city, 120), commune: field('commune', addr.commune, 120), county: field('county', addr.county, 120), province: field('province', addr.province, 40), country: 'PL', source: addr.source === 'google' ? 'google' : 'manual' },
    installation: field('installation', raw.installation, 60), inverter: field('inverter', raw.inverter, 100, false), battery: field('battery', raw.battery, 100, false), message: field('message', raw.message, 5000), privacy: raw.privacy === true, website: clean(raw.website, 200),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Podaj poprawny adres e-mail.';
  if (!/^\d{2}-\d{3}$/.test(data.address.postcode)) errors.postcode = 'Podaj kod w formacie 00-000.';
  if (!provinces.includes(data.address.province)) errors.province = 'Wybierz województwo.';
  if (!installations.includes(data.installation as typeof installations[number])) errors.installation = 'Wybierz rodzaj instalacji.';
  if (!data.privacy) errors.privacy = 'Potwierdź zapoznanie się z informacją o przetwarzaniu danych.';
  if (typeof addr.placeId === 'string' && /^[A-Za-z0-9_-]{1,255}$/.test(addr.placeId)) data.address.placeId = addr.placeId;
  // TERYT is populated by the backend from an authoritative dataset, never trusted from the browser.
  return { data, errors };
}
export { validateServiceFiles } from './service-files.ts';
