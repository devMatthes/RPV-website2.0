# Realizacje i galeria — etap 07

Wdrożone trasy: `/realizacje/` oraz `/realizacje/fotowoltaika-na-dachu-domu/`. Statyczne strony Astro, wspólne komponenty w `src/components/projects`, dane szablonu w `src/data/projects.ts`.

## Źródło

Aktualne prototypy Figmy `6qWQ6TTUvsLaRevtP7vbjZ`:

| Widok | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Lista | 2133:1421 | 2133:1425 | 2133:1429 |
| Szczegóły | 2133:1423 | 2133:1427 | 2133:1431 |

Pobrano i porównano SHA-256 wszystkich 24 zasobów z sześciu kontekstów. Zdjęcie domu, symbol nagłówka i symbole stopki mają identyczne odpowiedniki w repo. Mobilny wordmark stopki różni się od poprzedniego o geometrię eksportu: dodano dokładny plik `projects-mobile-wordmark.svg`, w natywnym rozmiarze 81,7248 × 28,9923. Projekty współdzielą pozostałe zasoby; w kodzie nie ma tymczasowych URL-i Figmy.

## Zachowanie

- Filtry: Wszystkie, Fotowoltaika, Magazyny energii, Pompy ciepła, Instalacje. Natywne przyciski ze stanem `aria-pressed`, licznik z `role=status` i komunikat pustej kategorii. Wybrany filtr trafia do `?kategoria=...`; działa bezpośredni URL oraz Wstecz/Dalej. Bez JavaScriptu wszystkie dostępne projekty pozostają widoczne.
- Karta prowadzi do szczegółów; link ze zdjęcia/całej karty i tekstowy CTA mają obsługę klawiatury. Okruszki, powrót na listę i powiązana usługa są działającymi linkami.
- Galeria ma jedno zdjęcie, zgodnie z makietą. Powiększenie w natywnym modalnym `dialog`, Escape/przycisk Zamknij/tło, blokada przewijania i przywrócenie fokusu do wywołującego linku. Bez JavaScriptu link otwiera pełny obraz. Dodatkowy obraz modala ładuje się leniwie.
- Nagłówek, stopka, CTA homepage i podstron oferty prowadzą na nową listę. Stare kotwice homepage pozostają dla wcześniejszych odnośników.

## Kontrola 2026-10-10

`astro check`: 0 błędów, ostrzeżeń i hints. Build lokalny i GitHub Pages: 12 stron. Kontrola 518 lokalnych odnośników/zasobów w obu buildach nie wykryła brakujących plików, kotwic ani błędów prefiksu `/RPV-website2.0/`.

Obie trasy sprawdzono w przeglądarce na 320, 390, 834, 1440 i 1920 px: pojedynczy h1, brak poziomego overflow i wykrytych błędów obrazów. Zweryfikowano geometrie zdjęć: lista 342×240 / 754×400 / 760×440; szczegóły 342×270 / 754×420 / 1280×600 (mobile/tablet/desktop). Układy porównano z referencjami Figmy. Sprawdzono pustą kategorię, reset, filtr z URL, historię przeglądarki, menu mobile, powiększenie, Escape i przywrócenie fokusu.

Lighthouse 13.5, lokalny produkcyjny build, standardowe profile i pusty cache:

| Widok | Performance | Accessibility | Best practices | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| Lista mobile | 99 | 100 | 100 | 1,9 s | 0 | 0 ms |
| Szczegóły mobile | 99 | 100 | 100 | 1,9 s | 0,012 | 0 ms |
| Szczegóły desktop | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |

Początkowe skrypty inline po gzip: 782 B lista, 589 B szczegóły (sumy osobno kompresowanych bloków). Brak frameworka klienckiego. Raporty w ignorowanym `outputs/qa/project*.json`. Wyniki laboratoryjne nie potwierdzają realnego INP ani pełnej zgodności WCAG.

## Materiały do uzupełnienia

Figma zawiera jeden przykładowy projekt z jednym zdjęciem i oznaczeniami „szablon / do uzupełnienia”. Zachowano te oznaczenia. Lokalizacja, moc, urządzenia, dokumentacja i wyniki nie są wymyślone. Przed publikacją docelową trzeba dostarczyć zweryfikowane dane i fotografie prawdziwych realizacji. Pozostałe kategorie mają stan pusty. FAQ globalne, kontakt/serwis i cookies nadal należą do etapów 08–09; w stopce projektów są oznaczone jako nieaktywne. Podgląd nadal ma `noindex, nofollow`.
