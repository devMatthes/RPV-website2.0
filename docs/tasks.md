# Zadania wdrożenia

Każde ukończone zadanie kończy się osobnym commitem. Backend pozostaje poza tym etapem. Na dodatkowe zlecenie właściciela skonfigurowano publiczne repo i podgląd GitHub Pages, automatycznie wdrażany z `main`.

- [x] 01. Repozytorium, Astro, strict TypeScript, podstawowy build. `astro check`: 0 błędów; statyczny build poprawny.
- [x] 02. Lokalne zasoby Figma, trzy rodziny fontów, tokeny i layout. Oryginalne rastry i SVG pobrane; fonty latin/latin-ext; wspólne BaseLayout, Brand, Button.
- [x] 03. Responsywny nagłówek, menu, hero i partnerzy. Typy i build poprawne; responsywne AVIF/WebP, menu modalne z Escape i przywracaniem fokusu. Kontrola wizualna w zadaniu 05.
- [x] 04. Sekcje strony głównej: segmenty, bannery, usługi, opinie, mapa, statystyki, stopka.
- [x] 05. Kontrola wizualna, dostępność, pomiary i poprawki wydajności. Lighthouse mobile 98 / desktop 100; LCP 2,3 / 0,5 s; szczegóły i ograniczenia w `qa.md`.
- [x] 06. Podstrony oferty: trzy segmenty klientów i sześć usług. Osobne commity za podstrony, nawigację i QA; pomiary 99–100 Performance, szczegóły w `offers.md`.
- [x] 07. Realizacje i galeria. Lista z filtrami, szablon szczegółów i powiększanie zdjęcia; nawigacja podłączona. Performance 99 mobile / 100 desktop; szczegóły w `projects.md`. Dane realizacji pozostają do uzupełnienia zgodnie z Figmą.
- [x] 08. O nas, poradnik, artykuł, FAQ. Cztery podstrony, nawigacja i natywne interakcje; Performance 99–100 mobile / 100 desktop. Szczegóły i treści do potwierdzenia w `content.md`.
- [x] 09. Kontakt, serwis, stany formularzy, cookies, 404. Frontend, walidacja i wybór załączników; wysyłka pozostaje do podłączenia w etapie backendu. Pięć osobnych commitów; Performance 99–100 dla kontaktu/serwisu/404, szczegóły w `contact.md`.

## Pierwszy odbiór

Kompletna strona główna na desktopie i mobile. Tablet również podlega sprawdzeniu. Makiety: 1920, 834 i 390 px; dodatkowo sprawdzamy szerokości pomiędzy nimi. Priorytet wydajności; zmiany wyglądu lub uproszczenia efektów wymagają uzgodnienia.

## Budżety

- LCP ≤ 2,5 s, CLS ≤ 0,1 w ustalonych testach laboratoryjnych.
- Lighthouse Performance: cel ≥ 90 mobile i ≥ 95 desktop.
- Początkowy JavaScript ≤ 50 kB po kompresji.
- INP ≤ 200 ms docelowo w 75. percentylu rzeczywistych wizyt; standardowy Lighthouse nie potwierdza INP.
- Pomiary na produkcyjnym buildzie, z pustym cache i ograniczoną siecią/CPU; wynik laboratoryjny nie gwarantuje wyników wszystkich użytkowników.

## Uzgodnienia

Astro + TypeScript + CSS; lokalne Roboto, Inter i Plus Jakarta Sans; obrazy optymalizowane podczas budowania; skrypty tylko dla interakcji. Treści robocze z Figmy muszą zostać potwierdzone przed publikacją.

## Dokumentacja

Konfiguracja i optymalizacja konsultowane przez astro-docs MCP: strict TypeScript, statyczny output, astro:assets i Picture z responsywnymi wariantami.

## Panel administracyjny

- [x] 10a. Osobny layout i adres `/panel/`, listy serwisu/kontaktu, responsywne menu, filtry i paginacja. Bez linków ze strony publicznej; Przetargi tylko jako placeholder.
- [x] 10b. Szczegóły spraw, zarządzanie statusem/opiekunem, przykładowe załączniki, lokalne notatki i historia w trybie demo.
- [x] 10c. Kontrola wizualna i interakcji na 320–1440 px, testy logiki, build GitHub Pages i pomiar wydajności. Szczegóły oraz ograniczenia dostępu w `admin.md`.
- [x] 11a. Backend serwisu, logowanie, prywatne załączniki i rzeczywisty panel. Autofill, pełny adres, integracja Google/PRG, HEIC i ponawianie. Sześć osobnych tasków opisano w `service.md`.
- [ ] 11b. Uruchomienie API na serwerze i klucza Google — czeka na infrastrukturę.
- [ ] 11c. Podłączenie zwykłego formularza kontaktowego do backendu (poza etapem serwisu).
- [ ] 12. Powiadomienia e-mail — osobny, przyszły task.

## Migracja do Cloudflare i CMS

Aktualny plan, zasoby i polecenia: [cloudflare.md](cloudflare.md).

- [x] CF1. Workers/D1/R2 i środowiska. Lokalne bindings, CI, dwie bazy D1, dwa prywatne buckety Standard i zdalne Workers staging/production. Oba endpointy health odpowiadają 200; aplikacja zgłoszeń pozostaje do migracji.
- [x] CF2. Schemat D1 i migracje: zgłoszenia, kontakty, pliki, sesje, CMS i liczniki zużycia. Wdrożono w staging/production; testy retencji, relacji, transakcji i równoległych rezerwacji. Przepięcie API do D1 w CF3.
- [x] CF3. API serwisu na Workers: walidacja, zapis D1, idempotencja, CORS i trwałe limity; sesje Google/PRG i podpis TERYT. Wdrożono staging/production z wysyłką publiczną wyłączoną do CF8. Załączniki w CF4, zwykły kontakt w CF7.
- [x] CF4. Strumieniowany multipart, prywatne R2, odczyt po sprawdzeniu sesji, limity miejsca/operacji i trwałe sprzątanie. Wdrożono w obu środowiskach; publiczna wysyłka pozostaje wyłączona.
- [x] CF5. Zdjęcia/HEIC przygotowywane lokalnie, lazy loading, anulowanie, miniatury 128 px, końcowe limity 5 MiB/5 plików/20 MiB. Walidacja, Chrome i build poprawne; publiczny backend czeka na CF8.
- [x] CF6. Logowanie i rzeczywisty panel na Workers.
- [x] CF7. Formularz zwykłego kontaktu.
- [x] CF8. Testy i produkcyjne wdrożenie formularzy.
- [x] CF9. CMS realizacji.
- [x] CF10. CMS tekstów.
- [x] CF11. Publikacja wersji treści i zdjęć przez Astro/GitHub Actions.
- [x] CF12. Usuwanie zamkniętych spraw po 24 h, kolejka R2, D1 Time Travel, rejestr retencji, tryb awaryjnego odtwarzania i QA. Szczegóły: [retention.md](retention.md).
