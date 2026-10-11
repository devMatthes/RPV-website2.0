import type { ServiceAddress } from './service-schema.ts';
export interface GoogleComponent { longText: string; shortText?: string; types: string[]; }
export function googleAddress(components: GoogleComponent[], placeId: string): Partial<ServiceAddress> {
  const get = (type: string) => components.find(item => item.types.includes(type));
  if (get('country')?.shortText !== 'PL') throw new Error('Wybierz adres w Polsce.');
  return { street: get('route')?.longText ?? '', building: get('street_number')?.longText ?? '', city: get('locality')?.longText ?? get('postal_town')?.longText ?? '', postcode: get('postal_code')?.longText ?? '', province: (get('administrative_area_level_1')?.longText ?? '').replace(/^województwo\s+/i, '').toLowerCase(), county: get('administrative_area_level_2')?.longText ?? '', source: 'google', placeId };
}
export function parsePrg(text: string): Pick<ServiceAddress, 'commune'|'county'|'province'|'teryt'> | undefined {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0] !== '0' || lines.length !== 2) return;
  const [teryt, commune, county, province] = lines[1].split('|');
  if (!/^\d{6}_\d$/.test(teryt) || !commune || !county || !province) return;
  return { teryt: teryt.replace('_',''), commune, county: county.replace(/^powiat\s+/i,''), province: province.toLowerCase() };
}
