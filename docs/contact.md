# Etap 09: kontakt, serwis, stany formularzy, cookies i 404

Wdrożono responsywne widoki Astro:

- `/kontakt/`: formularz kontaktowy i bezpośredni telefon/e-mail.
- `/serwis/`: formularz z danymi instalacji, numerami urządzeń i wyborem załączników.
- `/kontakt/potwierdzenie/` oraz `/serwis/potwierdzenie/`: podglądy ekranów potwierdzenia, wyraźnie oznaczone jako makiety bez wysłania danych.
- `/kontakt/blad/`: ekran błędu i powrotu do formularza.
- `/404.html`: własny ekran błędnego adresu, linki do kontaktu, strony głównej i usług.
- Globalny dialog cookies: wybór kategorii, ustawienia, zapis i ponowne otwarcie ze stopki.

## Źródło

Aktualne prototypy Figma, file key `6qWQ6TTUvsLaRevtP7vbjZ`: kontakt `2108:984/988/992`, serwis `2108:986/990/994`, 404 `2166:3486/3488/3490`, potwierdzenie kontaktu `2166:3492/3494/3496`, potwierdzenie serwisu `2166:3498/3500/3502`, błąd `2166:3504/3506/3508`, wybór cookies `2166:3510/3512/3514`, ustawienia `2166:3516/3518/3520`. Odczytano kontekst i zrzuty wariantów desktop/tablet/mobile. Dodatkowe trzy makiety cookies na stronie O nas mają identyfikatory `2176:5366/5515/5660`; ich kontekst zawiera tło bez dialogu, więc geometrię panelu odtworzono ze standalone komponentów.

54 SVG pobrane do porównania hashy odpowiadają istniejącym zasobom. Wykorzystano lokalne oryginały, wspólne komponenty i trzy dotychczasowe rodziny fontów. Bez nowych obrazów, bibliotek frontendowych i animacji. Dodano tylko natywny dialog i niewielkie skrypty TypeScript.

## Zakres funkcjonalny

Zgodnie z ustaleniem jest to etap frontendu. GitHub Pages pozostaje hostingiem statycznym. Astro-docs MCP potwierdza, że obsługa POST przez Astro Actions lub endpoint runtime wymaga serwera/adaptera; wysyłkę trzeba później podłączyć do wybranego backendu albo zewnętrznej usługi.

Formularze walidują wymagane pola, adres e-mail i numer telefonu. Błąd jest przypisany do pola przez `aria-describedby` i `aria-invalid`; fokus przechodzi do pierwszego błędnego pola. Prawidłowa próba pokazuje komunikat o niedostępnej wysyłce, zachowuje dane i nie wykonuje żądania ani przekierowania do potwierdzenia. Informacja o podglądzie widnieje przed przyciskiem. Bez JavaScriptu przycisk jest nieaktywny; telefon i e-mail pozostają dostępne.

Załączniki są przechowywane tylko w pamięci bieżącej strony. Limit: 5 plików, 10 MB na plik, 20 MB łącznie. Dozwolone rozszerzenia i MIME: JPG/JPEG, PNG, WebP, HEIC/HEIF, PDF; puste MIME dopuszczone przy poprawnym rozszerzeniu. Odrzucone pliki nie trafiają na listę. Można usuwać zaakceptowane pliki. To walidacja UX; przyszły backend musi ponownie zweryfikować rzeczywistą zawartość plików i limity.

Cookies: niezbędne zawsze aktywne, analityczne i marketingowe domyślnie wyłączone. Wybór zapisany lokalnie, osobno dla bazy adresu witryny, z wersją schematu i ważnością 180 dni. Nieprawidłowy, przyszły lub wygasły zapis nie przyznaje zgody. Native `dialog` zapewnia fokus modalny; Escape zamyka, anulowanie nie zapisuje zmian, zamknięcie przywraca fokus do przycisku w stopce. Przy zablokowanym localStorage wybór działa na bieżącej stronie, a czytnik otrzymuje komunikat o braku zapisu. Nie dodano analityki ani skryptów marketingowych; wydarzenie `rpv:consent-change` jest punktem przyszłej integracji.

Przed etapem rzeczywistej wysyłki pozostają: wybór dostawcy/backendu, zabezpieczenie endpointu i plików, obsługa wysyłania/odpowiedzi, podłączenie potwierdzeń oraz docelowe treści i linki polityk prywatności/cookies. Istniejące placeholdery prawne nie udają gotowych dokumentów. Potwierdzenia nie są połączone z formularzem. Podgląd zachowuje `noindex, nofollow`.

## Weryfikacja

- `astro check`: 55 plików, 0 błędów, ostrzeżeń i wskazówek.
- `npm test`: 5 testów poprawnych i błędnych telefonów, typów i limitów plików oraz schematu i wygasania preferencji. Testy dodane również do workflow Pages.
- Build lokalny i build z `/RPV-website2.0/`: 22 strony, 845 lokalnych linków i odwołań do zasobów, 0 błędów.
- Sześć nowych widoków w przeglądarce przy 320, 390, 834, 1440 i 1920 px: po jednym H1, bez poziomego overflow i brakujących obrazów. Kontrola wizualna formularzy, ekranów i cookies względem Figmy; panel ustawień na 390 px ma 656 px wysokości zgodnie z makietą. Na 320×568 dialog przewija się i przyciski pozostają osiągalne.
- Kontakt: pusta próba → cztery błędy i fokus pierwszego pola; poprawne dane → komunikat o braku transportu, zero błędów i zachowane wartości.
- Serwis: dodanie lokalnego testowego PDF, poprawna lista, usunięcie; brak błędów konsoli. Mobilne menu prowadzi do serwisu.
- Cookies: niezależne przełączniki, zapis, odświeżenie bez ponownego okna, ponowne otwarcie z zachowanymi wyborami, anulowanie i Escape, fokus przywracany w stopce.
- Początkowy inline JavaScript: około 2,6 kB gzip kontakt/serwis i 1,5 kB strona główna, poniżej budżetu 50 kB.

Lighthouse 13.5, produkcyjny lokalny podgląd, headless Chrome, pusty cache i domyślne ograniczenia mobile; raporty surowe w ignorowanym `outputs/qa/`, wyniki w `contact-qa-results.json`.

| Strona | Tryb | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kontakt | mobile | 99 | 100 | 100 | 1.8 s | 0.007 | 0 ms |
| Serwis | mobile | 99 | 100 | 100 | 1.8 s | 0.000 | 0 ms |
| Kontakt | desktop | 100 | 100 | 100 | 0.4 s | 0.001 | 0 ms |
| 404 | mobile | 100 | 100 | 100 | 1.7 s | 0.001 | 0 ms |
| Strona główna | mobile | 97 | 100 | 100 | 2.4 s | 0.001 | 0 ms |

Pomiary obejmują pierwszą wizytę z otwartym panelem cookies. Wynik Accessibility odnosi się do tego stanu; formularze po zamknięciu panelu sprawdzono ręcznie, więc 100 nie stanowi deklaracji pełnej zgodności całej strony z WCAG. Wyniki laboratoryjne nie potwierdzają rzeczywistego INP. Pojedynczy pomiar 404 podczas przebudowy ścieżek odrzucono i powtórzono po przywróceniu lokalnego buildu.

## Rozwinięcie formularza serwisowego

Serwis otrzymał osobny formularz i backend (bez wysyłania maili): [service.md](service.md). Opis powyżej dotyczy pierwotnego podglądu. Zwykły formularz kontaktowy nadal pozostaje podglądem.
