# Panel RPV — etap frontendu

Bez odnośników z publicznego menu, stopki ani innych podstron. Wejście wyłącznie przez adres:

- GitHub Pages: https://devmatthes.github.io/RPV-website2.0/panel/
- Listy: `/panel/serwis/` i `/panel/kontakt/`.
- Szczegóły: `/panel/serwis/srv-2026-024/` i `/panel/kontakt/kon-2026-018/`.

Makiety: [RPV / Admin w Figmie](https://www.figma.com/design/6qWQ6TTUvsLaRevtP7vbjZ/RPV-website2.0?node-id=2232-5334).

## Zakres

Astro + TypeScript i lokalny CSS. Wspólne tokeny, fonty i Button z istniejącego projektu; logo oraz chevron pobrane z Figmy. Żadnych nowych zależności ani animacji. Osobny layout bez publicznego Header, Footer i banera cookies.

Desktop: sidebar, wskaźniki, filtry, tabela i paginacja po 6 pozycji. Mobile poniżej 900 px: menu dialogowe, wyszukiwanie, status i temat/instalacja, karty i paginacja po 3 pozycje. Filtr daty dostępny na desktopie. „Przetargi — Wkrótce” pozostają wyłącznie nieaktywną pozycją menu.

42 fikcyjne sprawy (24 serwisowe i 18 kontaktowych) umożliwiają sprawdzenie filtrów i paginacji. Każda ma własny statyczny adres szczegółów. Formularze zarządzania, notatki i historia działają demonstracyjnie w `sessionStorage` jednej karty przeglądarki. Obsłużono brak dostępu do pamięci, błędne dane i puste notatki; tekst notatek wstawiany przez `textContent`. Odpowiedź e-mailem otwiera klienta pocztowego z adresem przykładowym; załączniki to makiety, bez plików do pobrania. Publiczne formularze nie są połączone z panelem.

## Dostęp

Każda strona panelu zawiera `noindex, nofollow, noarchive`. Ukryty URL i dyrektywy dla wyszukiwarek nie są uwierzytelnianiem: ten publiczny podgląd jest dostępny każdemu, kto zna adres. Nie wolno wstawiać rzeczywistych zgłoszeń do statycznego buildu ani repozytorium.

Przed integracją prawdziwych danych: osobny host np. `panel.twojadomena.pl`, logowanie oraz autoryzacja po stronie serwera dla widoków, API i załączników. GitHub Pages służy obecnie jedynie do podglądu na danych przykładowych. Bez fikcyjnego zabezpieczenia hasłem w JavaScript.

## Kontrola

- Oficjalne astro-docs MCP: `getStaticPaths` dla statycznych tras oraz `BASE_URL` dla ścieżek GitHub Pages.
- Astro check: 66 plików, 0 błędów, ostrzeżeń i uwag (Node 24.19.0 z runtime Codex; lokalny Node 24.1.0 początkowo zatrzymał odczyty).
- Build dla GitHub Pages: 67 stron, poprawny.
- `npm test`: 9 testów; stan demo, filtrowanie, poprawność danych oraz istniejące testy formularzy i zgód.
- Playwright/Chrome: cztery widoki na 1440, 834, 390 i 320 px. Bez poziomego overflow, brakujących obrazów i błędów JS. Sprawdzone filtry, puste wyniki, paginacja, zapis statusu/notatki, odświeżenie, bezpieczne wyświetlenie tekstu, Escape i powrót fokusu w menu. Brak linków do `/panel/` w publicznych plikach HTML buildu.
- Skrypt panelu: około 10 kB, 4 kB gzip. Nie ładuje się na stronie publicznej.
- Lighthouse mobile lista serwisu: Performance 98, Accessibility 100; LCP 1,8 s, CLS 0, TBT 0 ms. Lighthouse desktop: Performance 100, Accessibility 100; LCP 0,4 s, CLS 0, TBT 0 ms. Pomiar laboratoryjny na lokalnym produkcyjnym buildzie, nie jest pomiarem INP ani gwarancją dla wszystkich urządzeń.
- Zrzuty i wyniki lokalne: `outputs/qa/admin-*` (artefakty QA są ignorowane przez Git).
