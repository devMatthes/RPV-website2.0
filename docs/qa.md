# Kontrola pierwszego etapu — 10.10.2026

Statyczny build Astro, lokalny podgląd http://127.0.0.1:4322. Pomiary Lighthouse na nowej sesji Chrome bez cache. Mobile: symulacja sieci 1638,4 kbps, RTT 150 ms, CPU ×4; desktop: 10 240 kbps, RTT 40 ms, CPU ×1. Pojedynczy końcowy pomiar dla każdego profilu. Wyniki laboratoryjne, nie dane rzeczywistych użytkowników.

| Wskaźnik | Mobile | Desktop |
| --- | --- | --- |
| Performance | 98 | 100 |
| Accessibility (automatyczne) | 100 | 100 |
| Best Practices | 100 | 100 |
| LCP | 2,3 s | 0,5 s |
| CLS | 0,001 | 0,001 |
| TBT | 0 ms | 0 ms |
| Transfer zasobów podczas audytu | 347 KiB | 662 KiB |

Wbudowany JavaScript: 900 B przed kompresją, 549 B gzip; brak frameworka klienta i zewnętrznych skryptów. Wynik dostępności nie zastępuje pełnego audytu WCAG. INP wymaga pomiaru rzeczywistych wizyt po wdrożeniu.

## Weryfikacja

- `npm run check`: 14 plików, 0 błędów, ostrzeżeń i wskazówek.
- `npm run build`: poprawny statyczny build.
- Kontrola przeglądarkowa na 320, 390, 834, 1100, 1440, 1920 px. Brak poziomego przepełnienia na 320, 390, 834, 1100 i 1920 px. Wizualna kontrola hero, kart i mapy; zrzuty w ignorowanym `outputs/qa`.
- Menu mobile: otwarcie, modalny fokus, Escape zamyka i przywraca fokus do przycisku Menu.
- Opinie: zatrzymanie usuwa animację, umożliwia przewijanie poziome; wznawianie działa. CSS respektuje prefers-reduced-motion; animacja pauzuje poza ekranem.
- Wszystkie aktywne kotwice wskazują istniejące elementy; brak aktywnych odnośników do niewdrożonych podstron.
- Obrazy sprawdzone w przeglądarce: brak niezaładowanych zasobów po przewinięciu.
- Skrypt fontów sprawdza komplet polskich znaków i obecność osi zmiennej wagi.

## Optymalizacje

Responsywne AVIF/WebP generowane w buildzie, eager/high-priority dla zdjęcia LCP i lazy dla dalszych zasobów. Fonty lokalne: pełny latin i małe polskie rozszerzenia z zachowaniem trzech rodzin. CSS w HTML usuwa dodatkowe żądanie blokujące renderowanie. Przy rozbudowie do wielu podstron należy ponownie ocenić współdzielenie i cache CSS.

## Zakres i dalsza praca

To lokalny etap wizualny strony głównej. Nie ma backendu ani obsługi formularzy. CTA wyceny i serwisu przewijają do danych kontaktowych; oferta ma nieaktywne odnośniki do czasu dodania podstron. Mapa jest wizualną ilustracją, nie interaktywną bazą realizacji. Poradnik i dokumenty prawne są obecnie tekstem w stopce.

Przed publikacją trzeba wymienić przykładowe opinie o AI, potwierdzić przykładowe lokalizacje Warszawa / 3,320 kW, statystyki 500+ / 20+, deklarację lidera, dane kontaktowe i treści prawne. Podgląd ma noindex/nofollow. Dalsze podstrony w `tasks.md`; testy Safari/Firefox i na fizycznych urządzeniach pozostają przed publikacją.
