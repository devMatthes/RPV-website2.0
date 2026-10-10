// Example project from Figma. Replace draft values only with verified project data.
export const projectCategories = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'fotowoltaika', label: 'Fotowoltaika' },
  { id: 'magazyny-energii', label: 'Magazyny energii' },
  { id: 'pompy-ciepla', label: 'Pompy ciepła' },
  { id: 'instalacje', label: 'Instalacje' },
] as const;
export const projects = [{
  slug: 'fotowoltaika-na-dachu-domu',
  category: 'fotowoltaika',
  title: 'Fotowoltaika na dachu domu',
  heading: 'Fotowoltaika\nna dachu domu.',
  tag: 'FOTOWOLTAIKA / DLA DOMU',
  description: 'Od projektu do gotowej instalacji. Zobacz układ modułów, zakres prac i dokumentację.',
  introduction: 'Przykład układu strony realizacji: zdjęcia, założenia projektu i szczegóły techniczne w jednym miejscu.',
  parameters: [
    { label: 'Lokalizacja', value: 'Do uzupełnienia' },
    { label: 'Moc instalacji', value: 'Do uzupełnienia' },
    { label: 'Typ budynku', value: 'Dom jednorodzinny*' },
    { label: 'Data realizacji', value: 'Do uzupełnienia' },
  ],
  story: [
    { index: '01 / ZAŁOŻENIA', title: 'Od czego zaczęliśmy', description: 'Do uzupełnienia: potrzeby klienta, zużycie energii i warunki budynku przed montażem.' },
    { index: '02 / ZAKRES', title: 'Co zostało wykonane', description: 'Do uzupełnienia: dobór urządzeń, sposób montażu, zabezpieczenia i uruchomienie instalacji.' },
    { index: '03 / REZULTAT', title: 'Co zmieniła instalacja', description: 'Do uzupełnienia: potwierdzone wyniki pracy instalacji oraz okres i źródło pomiaru.' },
  ],
  specification: [
    ['Moduły / producent i model', 'Liczba modułów / moc jednostkowa', 'Falownik / producent i model'],
    ['Magazyn energii / pojemność', 'Konstrukcja / sposób montażu', 'Zakres prac i zabezpieczenia'],
  ],
}];
export type Project = (typeof projects)[number];
export const projectEvidence = [
  { index: '01 / ZDJĘCIA', title: 'Zobacz wykonanie', description: 'Galeria z gotowej instalacji oraz detale montażu. Materiał przypisany do konkretnej realizacji.' },
  { index: '02 / PARAMETRY', title: 'Poznaj rozwiązanie', description: 'Moc, urządzenia, zakres prac i kontekst budynku — z danych konkretnego projektu.' },
  { index: '03 / EFEKTY', title: 'Sprawdź rezultat', description: 'Wyniki i opinia klienta tylko wtedy, gdy są potwierdzone i dostępne do publikacji.' },
];
