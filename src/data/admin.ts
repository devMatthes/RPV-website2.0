export type AdminModule = 'serwis' | 'kontakt';
export const statuses = { new: 'Nowe', active: 'W obsłudze', waiting: 'Oczekuje', closed: 'Zamknięte' } as const;
export type CaseStatus = keyof typeof statuses;
export interface AdminCase {
  id: string; module: AdminModule; client: string; location: string; subject: string;
  summary: string; message: string; date: string; status: CaseStatus; owner: string;
  email: string; phone: string; installation?: { address: string; serial: string; battery: string };
  attachments: { name: string; size: string }[];
}
export const owners = ['Nieprzypisane', 'Piotr M.', 'Katarzyna S.'];
const clients = ['Anna Nowak', 'Michał Zieliński', 'Ewa Wiśniewska', 'Tomasz Wójcik', 'Agnieszka Kamińska', 'Paweł Lewandowski'];
const cities = ['Kraków', 'Katowice', 'Rzeszów', 'Tarnów', 'Opole', 'Kraków'];
const installations = ['Fotowoltaika', 'Pompa ciepła', 'Magazyn energii', 'Klimatyzacja', 'Fotowoltaika', 'Instalacja elektryczna'];
const problems = ['Falownik nie uruchamia się', 'Spadek ciśnienia na instalacji', 'Brak połączenia z aplikacją', 'Jednostka nie chłodzi', 'Przegląd po aktualizacji', 'Sprawdzenie rozdzielnicy'];
const serviceStatuses: CaseStatus[] = ['new', 'active', 'waiting', 'new', 'active', 'closed', ...Array<CaseStatus>(4).fill('new'), ...Array<CaseStatus>(7).fill('active'), ...Array<CaseStatus>(3).fill('waiting'), ...Array<CaseStatus>(4).fill('closed')];
const contactStatuses: CaseStatus[] = ['new', 'active', 'new', 'active', 'closed', 'active', ...Array<CaseStatus>(2).fill('new'), ...Array<CaseStatus>(4).fill('active'), ...Array<CaseStatus>(6).fill('closed')];
export const adminCases: AdminCase[] = (['serwis', 'kontakt'] as const).flatMap(module => {
  const count = module === 'serwis' ? 24 : 18;
  return Array.from({ length: count }, (_, i) => {
    const service = module === 'serwis';
    const number = count - i;
    const id = `${service ? 'SRV' : 'KON'}-2026-${String(number).padStart(3, '0')}`;
    const date = new Date(Date.UTC(2026, 9, 11 - Math.floor(i / 2), 9 + i % 7, i === 0 ? 42 : 8 + i * 5 % 50)).toISOString();
    return {
      id, module, client: service ? clients[i % clients.length] : ['Jan Kowalski', 'Monika Dąbrowska', 'Adam Malinowski', 'Karolina Mazur', 'Robert Kaczmarek', 'Joanna Król'][i % 6],
      location: service ? cities[i % cities.length] : ['Klient indywidualny', 'Klient indywidualny', 'Firma', 'Klient indywidualny', 'Firma', 'Klient indywidualny'][i % 6],
      subject: service ? installations[i % 6] : ['Wycena instalacji', 'Pompa ciepła', 'Fotowoltaika', 'Dofinansowanie', 'Współpraca', 'Klimatyzacja'][i % 6],
      summary: service ? problems[i % 6] : ['Fotowoltaika z magazynem energii', 'Dobór rozwiązania do domu', 'Instalacja dla hali magazynowej', 'Pytanie o dokumenty do wniosku', 'Zapytanie o współpracę projektową', 'Wycena dwóch jednostek'][i % 6],
      message: service && i === 0 ? 'Od wczoraj falownik nie uruchamia się po wschodzie słońca. Na wyświetlaczu pojawia się komunikat o błędzie połączenia. Sprawdziłam zabezpieczenia — są włączone.\n\nProszę o pomoc w ustaleniu przyczyny. W załączniku przesyłam zdjęcie falownika i komunikatu.' : !service && i === 0 ? 'Dzień dobry,\n\nproszę o wstępną wycenę instalacji fotowoltaicznej z magazynem energii dla domu jednorodzinnego. Roczne zużycie prądu wynosi około 6000 kWh. Dach jest skierowany na południe.\n\nChciałbym porozmawiać o doborze mocy i możliwościach dofinansowania. Proszę o kontakt.' : `Dzień dobry,\n\n${service ? problems[i % 6] : 'Proszę o informacje: ' + ['wycena instalacji', 'oferta dla firmy', 'magazyn energii', 'współpraca', 'pompa ciepła', 'kontakt'][i % 6]}. Proszę o kontakt w sprawie dalszych kroków.`,
      date, status: (service ? serviceStatuses : contactStatuses)[i],
      owner: (service ? [0, 3, 6] : [0, 2]).includes(i) ? owners[0] : owners[1 + i % 2],
      email: service && i === 0 ? 'anna.nowak@example.com' : !service && i === 0 ? 'jan.kowalski@example.com' : `klient.${module}.${number}@example.com`,
      phone: `+48 500 000 ${String(number).padStart(3, '0')}`,
      installation: service ? { address: `ul. Przykładowa 12, ${cities[i % 6]}`, serial: `DEMO-FAL-${String(number).padStart(5, '0')}`, battery: 'Nie podano' } : undefined,
      attachments: service && i === 0 ? [{ name: 'falownik.jpg', size: '1,8 MB' }, { name: 'komunikat-bledu.jpg', size: '0,8 MB' }] : [],
    };
  });
});
export function panelHref(path = '') { return `${import.meta.env.BASE_URL}panel/${path}`; }
export function caseHref(item: AdminCase) { return panelHref(`${item.module}/${item.id.toLowerCase()}/`); }
export function shortDate(date: string) { const d = new Date(date); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth()+1).padStart(2, '0')} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
