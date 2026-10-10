# Podstrony oferty — etap 06

Wdrożono 9 statycznych podstron na podstawie aktualnych prototypów Figma (desktop, tablet i mobile). Dane w `src/data/offers.ts`, wspólny layout i komponenty w `src/components/offer`. FAQ używa natywnych `details`/`summary`; nie ładuje dodatkowego JavaScriptu. Linki uwzględniają `BASE_URL` GitHub Pages.

| Podstrona | Ścieżka | Figma desktop / tablet / mobile |
| --- | --- | --- |
| Fotowoltaika | `/uslugi/fotowoltaika/` | 2120:1210 / 1212 / 1214 |
| Pompy ciepła | `/uslugi/pompy-ciepla/` | 2146:1857 / 1859 / 1861 |
| Magazyny energii | `/uslugi/magazyny-energii/` | 2146:1863 / 1865 / 1867 |
| Klimatyzacja | `/uslugi/klimatyzacje/` | 2146:1869 / 1871 / 1873 |
| Rozdzielnice i elektryka | `/uslugi/rozdzielnice-i-elektryka/` | 2146:1875 / 1877 / 1879 |
| Dofinansowania OZE | `/uslugi/dofinansowania-oze/` | 2146:1881 / 1883 / 1885 |
| Dla domu | `/dla-domu/` | 2146:1839 / 1841 / 1843 |
| Dla firm | `/dla-firm/` | 2146:1845 / 1847 / 1849 |
| Dla inwestycji | `/dla-inwestycji/` | 2146:1851 / 1853 / 1855 |

Projekt: https://www.figma.com/design/6qWQ6TTUvsLaRevtP7vbjZ/RPV-website2.0

## Zasoby i układ

Zdjęcia domu i montera oraz symbole nagłówka i stopki pobrane z kontekstu podstron porównano SHA-256 z lokalnymi zasobami Figmy. Są identyczne z używanymi na stronie głównej, więc współdzielą pliki i cache. Natywne SVG zachowują wymiary; rastry mają responsywne AVIF/WebP. Zdjęcie hero ładuje się priorytetowo, pozostałe leniwie. Trzy rodziny fontów pozostają lokalne, z dotychczasowymi polskimi subsetami.

Karty usług: jedna kolumna na mobile, dwie na tablecie, trzy na desktopie; obramowanie, padding i wysokość minimalna zgodnie z prototypami. Węższe rozmiary mogą zwiększyć wysokość kart zamiast obcinać treść. Układ fotowoltaiki zachowuje osobne sekcje sprzętu, procesu i przykładów. Pozostałe usługi mają panel tekstowy hero. Wszystkie podstrony posiadają okruszki, FAQ i CTA do sekcji kontaktu w stopce.

## Kontrola 2026-10-10

- `astro check`: 0 błędów, ostrzeżeń i hints. Statyczny build: 10 stron (homepage + 9 ofert).
- Przeglądarka: wszystkie 9 tras na szerokościach 320, 390, 834 i 1440 px — jeden h1, brak poziomego overflow i wykrytych niezaładowanych obrazów. Dodatkowa kontrola wizualna desktopu 1920 px oraz kart na tablecie.
- FAQ: otwieranie myszą i zamykanie Enter; natywny stan i fokus.
- Walidacja wygenerowanego HTML: 445 lokalnych odnośników i zasobów, bez brakujących plików, kotwic ani błędów prefiksu. Sprawdzono lokalny build oraz build `/RPV-website2.0/`.

Lighthouse 13.5, lokalny produkcyjny build, standardowe profile mobile/desktop, pusty cache:

| Widok | Performance | Accessibility | Best practices | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| Fotowoltaika mobile | 99 | 100 | 100 | 2,0 s | 0,01 | 0 ms |
| Fotowoltaika desktop | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |
| Pompy ciepła mobile | 100 | 100 | 100 | 1,7 s | 0 | 0 ms |

Surowe raporty w ignorowanym `outputs/qa/offer-*.json`. To pomiary laboratoryjne dwóch wariantów layoutu, nie pomiary wszystkich urządzeń ani potwierdzenie pełnej zgodności WCAG/INP. Wydajność hostingu i realnych wizyt wymaga oddzielnej obserwacji.

## Treści i dalszy zakres

Nagłówki, opisy i pytania FAQ pochodzą z Figmy. Makiety stron zawierały tylko zamknięte pytania, a otwarty komponent FAQ miał jedną ogólną odpowiedź. Dlatego 29 odpowiedzi jest roboczych i wymaga potwierdzenia merytorycznego przed publikacją docelową. Linki do oficjalnych programów dofinansowań są zgodne z projektem; strona nie deklaruje kwot ani uprawnień.

CTA prowadzą na razie do istniejącej sekcji kontaktowej. Formularze, serwis, osobne realizacje, poradnik oraz ustawienia cookies są w kolejnych zadaniach. Podgląd nadal ma `noindex, nofollow`.
