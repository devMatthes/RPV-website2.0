# Cloudflare — przygotowanie i uzgodnienia

## DNS rpv.pl

2026-10-11 utworzono strefę `rpv.pl` na planie Free. Status po przygotowaniu: pending; delegacja nadal wskazuje `ns1.domena.pl`, `ns2.domena.pl`, `ns3.domena.pl`.

Nowe serwery nazw przypisane przez Cloudflare:

- `alla.ns.cloudflare.com`
- `randy.ns.cloudflare.com`

Przeniesiono wszystkie 14 rekordów z pełnego zrzutu przekazanego przez właściciela. Wartości potwierdzono zapytaniami do publicznego DNS. Odczyt API po zapisie potwierdził zgodność 14/14 rekordów, TTL 3600 i DNS only (bez proxy). Bezpośredni odczyt nowego serwera potwierdził rekordy strony, MX, SPF, weryfikację Google, DKIM, DMARC i SRV. Publiczne zapytanie o DS nie zwróciło rekordu; ustawienie DNSSEC należy potwierdzić w panelu rejestratora przed zmianą delegacji.

Obecne rekordy strony i poczty zachowano. Nie zmieniono serwerów nazw u rejestratora ani konfiguracji `rpv.net.pl`. Następny krok właściciela: zastąpić dotychczasowe serwery nazw w panelu domena.pl powyższą parą. Następnie sprawdzić aktywację, stronę oraz pocztę.

## Docelowy zakres

- Publiczna witryna docelowo na `rpv.pl`; na razie nowe Astro pozostaje na GitHub Pages. Przełączenie witryny jest późniejszym krokiem.
- Dashboard i API: `panel.rpv.pl`, po implementacji i wdrożeniu Workers.
- Workers: API; D1: dane; R2: prywatne załączniki i zasoby CMS.
- Jedno konto administratora.
- Własny prosty CMS: realizacje oraz teksty strony głównej, O nas, usług i dane kontaktowe. FAQ i poradnik później.
- Zamknięte sprawy serwisowe i kontaktowe usuwać po 24 godzinach wraz z plikami, notatkami i historią; ponowne otwarcie przed terminem anuluje usunięcie. Polityka wygasania kopii zapasowych pozostaje do dopracowania przed produkcją.
- Zdjęcia: kompresja i HEIC wyłącznie w przeglądarce, biblioteki ładowane przy wyborze pliku, obróbka pojedynczo. Backend niezależnie sprawdza pliki. Limit końcowy 5 MB na plik, 5 plików i 20 MB łącznie; PDF bez konwersji. Usunąć przetwarzanie serwerowe przy migracji.
- Zdjęcia publicznych realizacji optymalizować podczas budowania Astro. Szkice i załączniki zgłoszeń nie trafiają do publicznego buildu ani repozytorium.
- Mail jest osobnym przyszłym zadaniem. Przetargi pozostają placeholderem.

## Kolejność implementacji

1. Konfiguracja Workers/D1/R2 i środowisk; sama strefa DNS nie kończy tego zadania.
2. Migracja bazy do D1.
3. Migracja API i integracji adresowych do Workers.
4. Prywatne załączniki w R2.
5. Dostosowanie kompresji oraz limitów klienta.
6. Logowanie, sesje i działający panel.
7. Formularz kontaktowy oraz widok kontaktów.
8. Testy i wdrożenie formularzy.
9. CMS realizacji.
10. CMS tekstów.
11. Publikacja zatwierdzonej wersji przez GitHub Actions i Astro; wynik publikacji widoczny w panelu.
12. Automatyczne usuwanie po 24 h, kopie zapasowe z polityką wygasania, test odtwarzania i końcowe QA.

Każde zadanie implementacyjne sprawdzamy i kończymy osobnym commitem. Schemat D1 jest wdrożony; API i obsługa CMS pozostają kolejnymi taskami.

## Task 1 — środowiska Cloudflare

- [x] Aktualny Wrangler, konfiguracja lokalna/staging/production i generowane typy.
- [x] Dwie rzeczywiste bazy D1 w UE.
- [x] Lokalne D1/R2, endpoint health, smoke i dry runs, kontrole CI.
- [x] Aktywacja R2 przez właściciela i utworzenie prywatnych bucketów.
- [x] Wdrożenie i sprawdzenie zdalnych Workers po aktywacji R2.

Task 1 ukończony. Schemat aplikacji D1 wdrożono w tasku 2.

Konfiguracja: `cloudflare/wrangler.jsonc`. Domyślne środowisko jest lokalne (port 8788, bez połączeń do danych produkcyjnych). Środowiska `staging` i `production` mają osobne zasoby. Flaga `remote: false` dotyczy lokalnego developmentu; po wdrożeniu bindings wskazują rzeczywiste zasoby danego środowiska.

Utworzono dwie bazy D1 w jurysdykcji UE, bez replik odczytu:

| Środowisko | Baza D1 | Identyfikator |
| --- | --- | --- |
| staging | rpv-db-staging | 068eda7a-02a0-48cf-8df9-a5dfb41c19bc |
| production | rpv-db-production | b25888e0-07df-4f6d-babc-3c8c2579ae60 |

Bindings: `DB` (D1), `FILES` (R2), `ENVIRONMENT`. Identyfikatory zasobów nie są sekretami. Dane klientów i pliki nie trafiają do Git. Katalog `.wrangler/` i pliki `.dev.vars*` są ignorowane; wyjątkiem jest pusty szablon `.dev.vars.example`.

Właściciel aktywował R2. Utworzono prywatne buckety `rpv-files-staging` i `rpv-files-production` w klasie Standard, z lokalizacją WEUR (wskazówka lokalizacji, jurysdykcja default; nie jest to twarde ograniczenie do UE). Potwierdzono `enabled: false` dla publicznego r2.dev i brak domen publicznych. Nie włączać publicznego adresu r2.dev ani publicznej domeny dla załączników. Konfiguracja lokalna R2 działa niezależnie od aktywacji usługi.

W tasku 1 Worker oferował wyłącznie endpoint infrastrukturalny `/api/health`. Aktualne API opisano w tasku 3; CMS i logowanie pozostają do implementacji. Odpowiedź health nie potwierdza jeszcze gotowości aplikacji ani dostępności bazy/plików. Logi mają wyłączone automatyczne logowanie wywołań i śledzenie, a query string jest redagowany, aby przyszłe dane formularzy nie trafiały do logów.

### Lokalne polecenia

```sh
npm ci
npm run cf:types
npm run cf:check
npm run cf:smoke
npm run cf:dev
```

Health: `http://127.0.0.1:8788/api/health`. Ten port nie koliduje z poprzednim API Node na 8787. Smoke używa lokalnych bindings dla wszystkich trzech konfiguracji, `persist: false` i `remoteBindings: false`: sprawdza zapis/odczyt D1, zapis/odczyt/usunięcie R2 oraz odpowiedzi 200/HEAD/405/404. Nie wykonuje zapytań do prawdziwego Google ani operacji na zdalnych danych.

Typy `cloudflare/worker-configuration.d.ts` generuje Wrangler; runtime types pochodzą z aktualnego `@cloudflare/workers-types`. Po zmianie bindings ponownie uruchomić `cf:types`. Kontrola zgodności w CI: `npm run cf:types -- --check`.

### Wdrożenie

```sh
npm run cf:dry-run:staging
npm run cf:dry-run:production
```

Te polecenia tylko kompilują i sprawdzają konfigurację; nie wdrażają ani nie tworzą usług. Wdrożenie CLI wymaga osobnego `npx wrangler login` — autoryzacja pluginu w Codex nie loguje automatycznie terminalowego Wranglera. Nie wyciągać tokenów z pluginu ani nie wpisywać sekretów w argumentach poleceń.

Worker wdrożono przez autoryzowany plugin Cloudflare: dokładny moduł wygenerowany podczas dry run Wrangler, z metadanymi zgodnymi z konfiguracją. Kolejne wdrożenia można wykonać przez zalogowany Wrangler:

```sh
npm run cf:deploy:staging
npm run cf:deploy:production
```

Docelowe tymczasowe adresy: `https://rpv-api-staging.jaciubekmateusz.workers.dev` i `https://rpv-api-production.jaciubekmateusz.workers.dev`. `panel.rpv.pl` podłączymy po aktywacji DNS i przygotowaniu panelu. Nie ustawiamy jeszcze `SERVICE_API_URL` w GitHub: wysyłka publiczna pozostaje wyłączona do taska 8.

GitHub Actions sprawdza binding types, TypeScript, lokalne D1/R2 i oba dry runs. Dotychczasowe API Node pozostaje dostępne lokalnie do porównania podczas migracji.

### Wyniki sprawdzenia przygotowania

- `cf:types -- --check` oraz `cf:check`: poprawne.
- `cf:smoke`: trzy konfiguracje, lokalny zapis/odczyt D1 i zapis/odczyt/usunięcie R2; health GET/HEAD, odrzucenie POST i nieistniejącego API zgłoszeń.
- Dry run staging oraz production: poprawne; moduł 1,08 KiB (0,57 KiB gzip).
- Rzeczywisty lokalny runtime Wrangler: `/api/health` zwraca 200 i `phase: infrastructure`.
- Dotychczasowe 24 testy backendu: poprawne. `api:check` oraz Astro check: brak błędów.
- CI commita `f5ae48b`: wszystkie zadania poprawne, w tym smoke Cloudflare, oba dry runs, testy przeglądarkowe i build obrazu dotychczasowego API.
- Zdalne Workers staging i production: `/api/health` zwraca HTTPS 200 i właściwe środowisko. Odczyt settings potwierdza osobne DB/FILES oraz ustawienia logów zgodne z repo. Zdalne D1: `SELECT 1` poprawne w obu środowiskach. Ten odczyt wykonano przed taskiem 2. Obecnie D1 zawiera schemat aplikacji; brak danych klientów.
- Prywatność R2: r2.dev wyłączone, brak custom domains. Testy zapisu i odczytu plików wykonano lokalnie; zdalny przepływ załączników będzie testowany w tasku 4.

## Kontrola kosztów — stan po tasku 4

Cloudflare budget alerts są informacyjne: nie zatrzymują ani nie ograniczają użycia. Nie ustawiono alertu na koncie. Limity aplikacyjne są wdrożone w tasku 4, opisanym poniżej.

Wdrożono limit miejsca łącznie 8 GB (0,5 GB staging + 7,5 GB production) oraz limity operacji dzienne/miesięczne. Przydział jest atomowy; do czasu potwierdzonego usunięcia wlicza także pliki tymczasowe i niepotwierdzone zapisy. Przyszłe zdjęcia CMS muszą korzystać z tego samego mechanizmu; kopie zapasowe i zasoby spoza aplikacji wymagają osobnego uwzględnienia. Alert kosztowy np. 5 USD w Billing > Billable Usage jest dodatkowym ostrzeżeniem, a nie gwarancją rachunku 0 USD.

Darmowy limit R2 Standard dotyczy całego konta: 10 GB-month, 1 mln operacji Class A i 10 mln Class B na okres rozliczeniowy. Nie jest oddzielny dla każdego bucketu. Inne projekty, działania z panelu/API i opóźnione metryki mogą ograniczyć skuteczność własnej kontroli kosztów. Przyszłe limity aplikacji nie gwarantują zerowych kosztów całego konta.

Źródła: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/).


## Task 2 — schemat i migracje D1

Wdrożono `0001_application.sql` w staging i production. Obie bazy przed migracją były puste; nie importowano lokalnych testowych zgłoszeń, sesji ani plików. W tabeli `d1_migrations` zapisano nazwę migracji, zgodnie z formatem Wranglera. Kolejne migracje dopisywać jako nowe pliki SQL; nie zmieniać plików zastosowanych zdalnie.

- `cases`: serwis i kontakt, dane nadawcy, adres/instalacja w JSON, zgoda, status, opiekun, revision, hash klucza idempotencji i fingerprint. API w CF3 musi niezależnie walidować cały adres (ulica, numery, kod, miejscowość, gmina, powiat, województwo, kraj, TERYT/source). Nie zapisywać tymczasowego podpisu adresowego ani pełnych odpowiedzi Google.
- `case_events`: historia i notatki z relacją do sprawy. Usunięcie sprawy usuwa historię, notatki i powiązania załączników.
- `file_assets`, `case_attachments`: metadane plików z kluczami R2 bez danych osobowych. Baza ogranicza rozmiar do 5 MiB/plik, 5 plików i 20 MiB/sprawę oraz oddziela pliki prywatne od CMS. Backend nadal musi sprawdzać rzeczywistą zawartość i rozmiar. Limit DB nie zastępuje limitów streamu/uploadu.
- `file_deletion_jobs`: trwała kolejka usuwania obiektów R2; skasowanie załącznika usuwa jego metadane i kolejkuje klucz. Nie usuwać wpisu kolejki ani zwalniać zajętego miejsca przed potwierdzonym usunięciem obiektu. Wykonanie/retry w CF4/CF12; sama baza nie usuwa R2.
- `administrators`, `admin_sessions`: baza dopuszcza jedno konto, sesje przechowują hash tokenu i wersję autoryzacji. Konto nie zostało utworzone; hasło pozostaje sekretem Worker. Wygasanie i unieważnianie sesji będzie wymuszało API w CF6.
- `cms_entries`, `cms_versions`, `cms_version_assets`: edytowalny szkic, niezmienne zatwierdzone wersje i przypisane zdjęcia. `publication_jobs` oraz `publication_versions` wiążą build z zatwierdzonymi wersjami. Edycja szkicu nie zmienia poprzedniej wersji. W CF9–CF11 API ograniczy edytowalne pola i utworzy bezpieczny publiczny snapshot; sama poprawność JSON nie gwarantuje braku danych prywatnych.
- `counters`: numery referencyjne. `usage_budgets`, `usage_reservations`: okresy, pułapy, zużycie i zarezerwowane zasoby. `rate_limit_windows` używa hasha zakresu zamiast surowego IP; hashowanie z sekretnym kluczem, okna i wygasanie implementuje API.

Wszystkie daty aplikacji: UTC Unix milliseconds. Zmiana statusu na `closed` ustawia `closed_at` oraz `delete_after = closed_at + 24h`; kolejna edycja zamkniętej sprawy nie przesuwa terminu. Ponowne otwarcie zeruje obie daty; ponowne zamknięcie rozpoczyna nowe 24h. Usuwanie odbywać się będzie w CF12, po zdefiniowaniu retencji kopii zapasowych. Pełnotekstowe wyszukiwanie, dodatkowe pola CMS i obsługa przetargów nie są częścią tego taska.

Indeksy obejmują listy według modułu/statusu, retencję, historię sprawy, sesje, kolejkę usuwania i wygasające rezerwacje. Zapis kilku związanych rekordów wykonywać w `DB.batch()` — transakcje D1 rollbackują całą partię po błędzie. Przy zmianach panelu stosować `WHERE id = ? AND revision = ?` oraz kontrolować `meta.changes`. Przy rezerwacji używać warunkowego atomowego UPDATE: `consumed + reserved + amount <= ceiling`; nie wykonywać osobnego odczytu i bezwarunkowego zapisu. Rezerwację i wpis jej identyfikatora zapisywać w jednej transakcji. Dopiero CF3/CF4 podłączy te mechanizmy do rzeczywistych żądań.

**Stan po tasku 2:** przygotowano strukturę i atomowe operacje. Aktualne limity API opisano w tasku 4; alert na koncie nie jest skonfigurowany. W CF4 budżet staging + production musi mieścić się w łącznej puli (np. podział limitów na środowiska), uwzględniać CMS, pliki tymczasowe i operacje sprzątania. Osobne lokalne liczniki w dwóch D1 nie są wspólnym licznikiem konta Cloudflare.

### Polecenia i testy

```sh
npm run cf:db:migrate:local
npm run cf:db:test
# Zalogowany Wrangler; jawnie wybierz środowisko:
npm run cf:db:migrate:staging
npm run cf:db:migrate:production
```

`cf:db:test` używa tymczasowego lokalnego D1 w workerd i rzeczywistych migracji Wrangler, bez dostępu do produkcji. Testuje ponowne zastosowanie bez utraty danych, rollback batcha, jedno konto, hash/termin sesji, wymagany adres, statusy, blokowanie starej revision, retencję 24h/reopen, kaskadowe usuwanie i kolejkę R2, limity załączników, oddzielenie CMS/private, niezmienność zatwierdzonej wersji oraz 20 równoległych prób rezerwacji przy limicie 10. Plany zapytań potwierdzają wykorzystanie indeksów. Test jest częścią CI.

Migrację zdalną wykonano przez autoryzowany plugin Cloudflare, ponieważ CLI nie ma osobnego logowania. Zastosowano dokładny SQL z repo wraz z wpisem ledger jako batch; w obu bazach sprawdzono ledger, schemat, `PRAGMA foreign_key_check` i brak danych klientów. Po tasku 2 Worker oferował wyłącznie health. Aktualny zakres i stan wdrożenia opisano poniżej.

Źródła: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [D1 batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).


## Task 3 — API serwisu i adresów na Workers

2026-10-12 wdrożono w obu środowiskach `0002_address_sessions.sql` i API Workers. Oba health zwracają `phase: service-api`; nie oznacza to uruchomienia publicznego przyjmowania zgłoszeń. `SUBMISSIONS_ENABLED=false` w staging/production, brak skonfigurowanych sekretów aplikacji/Google w tym tasku, brak przełączenia frontendu przez `SERVICE_API_URL` i brak podłączenia domeny `panel.rpv.pl`. Konto administratora/panel będzie uruchomione w CF6; DNS tej subdomeny podłączymy wraz z panelem. Mail nie jest częścią tej implementacji.

### Endpointy

| Endpoint | Działanie |
| --- | --- |
| GET/HEAD `/api/health` | Stan runtime i nazwa środowiska, bez sprawdzania dostępności integracji |
| GET `/api/config` | Czy wysyłka i Google są aktywne; tymczasowo `attachments=false`, `limits.count=0` |
| POST `/api/service` | Serwis: JSON albo multipart z jednym polem `payload`, bez plików w tym tasku |
| POST `/api/address/suggestions` | Autocomplete (New): min. 3 znaki, Polska, max. 5 podpowiedzi |
| POST `/api/address/details` | Jeden wybór z wcześniej zwróconych ID w tej samej sesji i dla tego samego właściciela |

Serwis używa wspólnej walidacji `src/lib/service-schema.ts`: pełny adres administracyjny, numer telefonu do E.164, e-mail, rodzaj instalacji i zgoda; blokuje honeypot. Wymaga `Idempotency-Key` będącego UUID v4. Zapis sprawy, numeru referencyjnego i historii jest jedną transakcją D1. Przy równoległej wysyłce tego samego formularza powstaje jedna sprawa; identyczne ponowienie zwraca ten sam numer, zmiana danych z tym samym kluczem zwraca 409. Hash treści nie zależy od tymczasowego podpisu adresowego ani wzbogacenia TERYT. Nie utrwala się honeypota ani podpisu, nie zwraca danych klientów w potwierdzeniu.

Czytanie JSON jest ograniczone do 32 KiB, multipart bez plików do 40 KiB, także przy braku/niepoprawnym Content-Length. Załączniki są odrzucane bez zapisu sprawy; obsługa strumieniowanego uploadu/R2 jest CF4. Nie podłączać jeszcze obecnego publicznego formularza do tego API, ponieważ dotychczasowy frontend pozwala wybierać pliki. Pełny przepływ i końcowe limity formularza zostaną połączone w CF4/CF5/CF8.

Wszystkie operacje POST wymagają jawnego Origin z `PUBLIC_ORIGINS`; preflight dopuszcza wyłącznie metodę danego endpointu i nagłówki Content-Type/Idempotency-Key. CORS nie zastępuje ochrony przed botami: dowolny klient HTTP może ustawić Origin. Domyślne trwałe limity D1: 120 żądań API/min/IP, 6 nowych prób serwisu/h/IP, 30 podpowiedzi/min/IP i 10 szczegółów/min/IP. Okna są stałe; ponowienie zapisanej sprawy nie zużywa limitu nowych wysyłek, ale nadal podlega ogólnemu limitowi. W bazie przechowuje się HMAC IP z APP_SECRET, nie surowy IP. Workers ufa ustawianemu przez Cloudflare CF-Connecting-IP; lokalny runtime nie służy do oceny odporności na sfałszowane nagłówki. Odpowiedzi mają no-store, nosniff i noindex, błędy nie ujawniają SQL, sekretów ani odpowiedzi dostawców.

### Google i GUGiK

Sesje oraz ID podpowiedzi są w D1 (`address_sessions`, `address_predictions`), a nie w pamięci instancji. Sesja trwa 10 min, maksymalnie 20 prób autocomplete, jedno pobranie details; liczba aktywnych sesji maksymalnie 1000. Limit i przejęcie details są atomowe. Wygasłe sesje są sprzątane małymi partiami przy kolejnych wyszukiwaniach; cykliczne sprzątanie pozostałych okien to CF12. Nie przechowuje się tekstu podpowiedzi, pełnych odpowiedzi Google ani współrzędnych. Poprawnie dobrana para autocomplete/details używa tego samego tokenu; nie zakładamy, że wszystkie zapytania w sesji są bezpłatne.

Minimalne maski: `suggestions.placePrediction.placeId,suggestions.placePrediction.text.text` oraz `addressComponents,location`. Parametry Google: languageCode=pl, includedRegionCodes=[pl]. Timeout Google 6 s, ograniczony rozmiar odpowiedzi 64 KiB; timeout GUGiK 4 s/4 KiB. Po wyborze adresu ULDK `GetCommuneByXY` uzupełnia gminę, powiat, województwo i TERYT na podstawie PRG. Gdy ULDK nie odpowie, użytkownik nadal może uzupełnić brakujące dane ręcznie.

Limit Google: 100 prób dziennie i 1000 miesięcznie **na środowisko**, liczone w UTC kalendarzowym i transakcyjnie w D1, zanim nastąpi wywołanie dostawcy. Wliczamy autocomplete, details oraz próby zakończone błędem/timeoutem; nie zwracamy zużycia przy awarii. Dzienny i miesięczny licznik zapisują się razem albo rollbackują razem. Obniżenie pułapu blokuje kolejne wywołania, gdy dotychczasowe zużycie przekracza nową wartość. Wyczerpanie budżetu nie blokuje ręcznego adresu. To ograniczenie prób aplikacji, nie limit rachunku Cloudflare ani limit całego konta Google; przed aktywacją klucza ustawić również quota/budget w Google Cloud.

TERYT z przeglądarki jest ignorowany. API details zwraca podpis HMAC wiążący TERYT z adresem i terminem ważności 1 h. Zmiana adresu lub wygasły/fałszywy podpis usuwa możliwość zapisu jako zweryfikowanego TERYT, lecz nie blokuje poprawnego adresu ręcznego. Weryfikacja używa Web Crypto verify zamiast porównywania podpisów zwykłym operatorem.

### Sekrety i uruchomienie lokalne

Utworzyć ignorowany `cloudflare/.dev.vars` na podstawie `.dev.vars.example`. APP_SECRET musi być losowy, co najmniej 32 znaki; wygenerować bez zapisywania w repo ani argumentach poleceń. Jest używany do HMAC i podpisów adresowych, nie jest hasłem administratora. GOOGLE_PLACES_API_KEY pozostaje opcjonalny. Samo ustawienie klucza Google nie aktywuje zdalnego przyjmowania zgłoszeń.

```sh
npm run cf:db:migrate:local
npm run cf:dev
npm run cf:api:test
```

Port lokalny 8788. Przy braku APP_SECRET `/api/config` bezpiecznie zwraca `submissions=false`, POST zwraca 503. Przy poprawnym lokalnym sekrecie można testować serwis bez Google (adres ręczny). Sekrety zdalne później ustawiać przez panel Cloudflare lub interaktywny Wrangler (`secret put` z jawnym `--env`), osobno dla staging/production; plugin nie loguje CLI. Nie wpisywać klucza do zmiennych PUBLIC_* ani do konfiguracji statycznego Astro.

### Walidacja i wdrożenie

- `cf:api:test`: walidacja, multipart, limity rzeczywistego strumienia, idempotencja po restarcie i przy równoległych żądaniach, konflikt treści, numer referencyjny, CORS, limity IP i brak dostępu do niezaimplementowanego admin API.
- Integracje z atrapami Google/ULDK: maski, token, właściciel, jedno details, PRG, podpis/zmiana adresu/wygasanie, brak klucza, awaria Google, awaria PRG i atomowe limity dzienne/miesięczne. Testy nie wykonują płatnych zapytań.
- Ten sam test kompiluje Worker i wykonuje prawdziwy handler HTTP w workerd/Miniflare z lokalnym D1 oraz syntetycznym APP_SECRET. Sprawdza zapis i idempotentne ponowienie. Miniflare jest przypięty do tej samej wersji, której używa obecny Wrangler; konfigurację adaptuje `convertV4MiniflareOptions`.
- `cf:db:test`, `cf:smoke`, `cf:types -- --check`, `cf:check`: poprawne; dotychczasowe 24 testy backendu poprawne.
- Dry run obu środowisk poprawny; moduł 280,84 KiB / 65,63 KiB gzip. To kod API na serwerze, nie dodatkowy JavaScript pobierany przez publiczną stronę.
- Publiczny punkt Warszawa w rzeczywistym ULDK: poprawny format PRG. Google nie sprawdzono z rzeczywistym kluczem, ponieważ klucz dodamy później.
- Zdalna migracja/ledger i FK check poprawne w obu D1, zero zgłoszeń. Moduły z obu dry runs mają identyczny SHA256; wdrożono dokładny moduł przez plugin z bindings zgodnymi z repo. Health HTTPS 200, config zwraca false dla publicznej wysyłki/Google/załączników. Staging POST potwierdza 503 bez tworzenia danych.

Źródła: [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Google session tokens](https://developers.google.com/maps/documentation/places/web-service/using-session-tokens), [Places billing/field masks](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), [Dokumentacja ULDK](https://uldk.gugik.gov.pl/opis.html).


## Task 4 — prywatne pliki R2 i ochrona kosztów

Wdrożono `0003_r2_accounting.sql` i obsługę załączników w staging/production. `SUBMISSIONS_ENABLED=false` nadal blokuje publiczne przyjmowanie zgłoszeń. API config ma końcowe limity plików i `attachments=true` dopiero dla aktywnego środowiska; frontend podłączymy po CF5/CF6 w CF8. Nie uruchomiono maila ani konta administratora.

### Przepływ plików

Multipart musi zaczynać się od jednego pola `payload`, potem najwyżej 5 plików `attachments`. Parser `@mjackson/multipart-parser` czyta strumień i udostępnia kolejne części; aplikacja przygotowuje i zapisuje jeden plik naraz. Każda część pliku jest buforowana do 5 MiB w celu sprawdzenia typu, wymiarów i hasha; cały multipart nie jest czytany przez `request.formData()`. Limit załączników 20 MiB łącznie; limit całego strumienia 20 MiB + 64 KiB na dane i nagłówki, pole payload 32 KiB, nagłówek części 4 KiB. Na błąd parsera/anulowanie zamykany jest pozostały strumień. Dwie równoległe wysyłki multipart na środowisko; nadmiar i ponowienie trwającej wysyłki dostają 425, umożliwiający ponowienie tego samego formularza. Przetwarzanie kolejnej części po 120 s od rozpoczęcia jest odrzucane.

Akceptowane: JPEG, PNG, WebP i PDF. Rozmiar, rozszerzenie, deklarowany MIME i rozpoznana sygnatura muszą się zgadzać. Zdjęcia wymagają poprawnych wymiarów i maks. 40 mln pikseli; sprawdzane są zakończenie JPEG/PNG i rozmiar kontenera WebP. PDF wymaga nagłówka i zakończenia EOF. HEIC/HEIF nie trafia do R2 w oryginalnym formacie: konwersja będzie kończona po stronie przeglądarki w CF5. Jest to kontrola kontenera i nagłówków, bez pełnego dekodowania obrazu, rekonstrukcji PDF lub skanera antywirusowego. Serwer nie kompresuje zdjęć ani nie usuwa EXIF; kompresja/usuwanie metadanych i miniatury/prezentacja są po stronie klienta/panelu.

Każdy obiekt dostaje nowy nieprzewidywalny klucz `private/UUID`; imię, adres i oryginalna nazwa pliku nie trafiają do klucza ani metadanych R2. Typ MIME jest jedyną metadaną HTTP. Nazwa oryginalna jest w chronionej tabeli D1. Bucket Standard pozostaje bez publicznego r2.dev/domeny. Pierwszy zapis atomowo przydziela miejsce, rejestruje obiekt i konsumuje Class A zanim nastąpi `FILES.put`. Brak limitu lub przekroczenie pułapu blokuje wywołanie R2.

Po zapisaniu wszystkich plików transakcja D1 tworzy sprawę, podpina pliki i ustawia `ready`. Fingerprint obejmuje nazwy i SHA256 plików; identyczne ponowienie nie wykonuje kolejnych zapisów R2. Lease identyfikatora wysyłki zapobiega równoległym uploadom tej samej sprawy. Poprzednie potwierdzenia bez plików zachowują format fingerprinta z CF3.

### Odczyt po autoryzacji

GET `/api/admin/cases/:caseId/files/:assetId` sprawdza hash cookie `rpv_session`, termin sesji i wersję autoryzacji administratora, następnie przypisanie gotowego prywatnego pliku do konkretnej sprawy. Dopiero wtedy konsumuje Class B i pobiera R2. Brak/wygaśnięcie/unieważnienie sesji: 401; niepowiązany plik: 404; limit: 503 przed R2. Nie ma publicznych ani presigned URL-i.

Odpowiedź domyślnie jest pobraniem, ma private/no-store, nosniff i CSP sandbox. `?preview=1` pozwala wyświetlić obraz inline; PDF pozostaje pobieraniem. Nie ma serwerowych miniaturek ani cache publicznego. Rozmiar zwracanego obiektu musi być zgodny z ewidencją D1. Utworzenie prawdziwego konta, logowanie i użycie tych linków w UI to CF6.

### Limity aplikacyjne

Wszystkie liczby miejsca są w bajtach dziesiętnych; limity na plik używają MiB.

| Limit | staging | production |
| --- | --- | --- |
| Miejsce wraz z rezerwacjami | 500 000 000 B | 7 500 000 000 B |
| Class A / dzień UTC | 100 | 1000 |
| Class A / miesiąc UTC | 1000 | 10 000 |
| Class B / dzień UTC | 500 | 5000 |
| Class B / miesiąc UTC | 10 000 | 100 000 |
| Nowe próby serwisu / dzień, wszystkie IP | 10 | 50 |

Dodatkowo pozostają limity z CF3 na IP. Stałe okna UTC mogą obejmować inną granicę niż okres rozliczeniowy Cloudflare; pułapy dzienne oraz duży zapas operacji względem free tier ograniczają zużycie także przy takiej różnicy. Liczniki obu środowisk są niezależne, ale **pule sumują się do 8 GB**, a operacje są ustawione znacznie poniżej wspólnego free tier konta. Przy zmianie pułapów utrzymać sumę obu środowisk; zmniejszenie limitu nie resetuje zużycia. Podniesienie już utworzonego pułapu wymaga osobnego kontrolowanego działania, a nie bezwarunkowego wyzerowania liczników.

`r2_objects` utrzymuje zajęte bajty także po usunięciu danych klienta. Zapis odrzucony przez R2 wlicza się do prób Class A; również odczyt nieistniejącego pliku lub przerwany download wlicza się do Class B. Nie zwracać limitów operacji po błędzie. Rezerwacja miejsca zwalnia się dopiero po potwierdzonym `R2.delete` i transakcji ewidencji. Usuwanie działa mimo wyczerpania limitów A/B; R2 DeleteObject jest operacją darmową w Standard. Nie stosować ListObjects do publicznych requestów.

Ochrona obejmuje API tej aplikacji; zmiany z panelu Cloudflare/S3, inne projekty, kopie zapasowe lub pominięcie helperów kosztowych mogą ją ominąć. **Nie jest to limit rachunku całego konta Cloudflare.** Budget alert 5 USD pozostaje dodatkową propozycją; nie został ustawiony. Produkcja nie przyjmuje jeszcze publicznych zgłoszeń. Przed otwarciem formularzy w CF8 pozostaje ochrona przed automatycznym spamem (np. Turnstile) oraz końcowe sprawdzenie free planu/metryk.

### Sprzątanie

Pliki nieudanej wysyłki są usuwane przez trwałą kolejkę D1. `r2_objects.uploaded_at` rozróżnia potwierdzony put od niepewnego wyniku; przy niepewnym put miejsce pozostaje zablokowane i cleanup czeka co najmniej 1 h od przydziału. Przy awarii D1/R2 pozostają wpisy pozwalające ponowić, bez danych klienta w kolejce. Sprzątanie jest idempotentne i ponowne wykonanie nie zmniejsza licznika drugi raz. Nieudane delete stosuje rosnące opóźnienie retry.

Oba Workers mają cron `17 * * * *` (minuta 17 każdej godziny UTC): usuwa wygasłe pending assets/leases oraz przetwarza małe partie do 5 zadań usuwania. Przeterminowane pending pliki są identyfikowane po D1, bez kosztownego listowania całego R2. Harmonogram nie usuwa jeszcze zamkniętych spraw po 24 h — to CF12 wraz z częstotliwością obsługi zaległej kolejki i retencją kopii. Dłuższa kolejka może wymagać kilku uruchomień.

### QA i wdrożenie

- `cf:files:test`: JPEG/PNG/WebP/PDF, odrzucenie niezgodnego rozszerzenia/MIME, fałszywej sygnatury/HEIC, niekompletnego PDF i zbyt dużych wymiarów; prywatne odczyty z sesją i jej unieważnieniem, podgląd, brak przypisania do sprawy; zatrzymanie A/B przed R2.
- Ponowienie bez dodatkowego put; równoległe ponowienia z jedną wysyłką; niepełne/niepoprawne formularze, anulowanie dalszego strumienia; usuwanie pierwszego pliku po błędzie kolejnego; odmowa delete, niepewny put, retry; atomowy limit miejsca i zwalnianie go tylko raz; limit dwóch aktywnych uploadów.
- `cf:api:test`: dotychczasowe przepływy i rzeczywisty skompilowany upload multipart do prywatnego R2 w workerd/Miniflare. Google nadal korzysta z atrap; płatnych zapytań brak.
- `cf:db:test`, `cf:check` i generowane typy poprawne. Oba dry runs: 357,52 KiB / 82,12 KiB gzip, identyczny SHA256. To kod serwera i nie zwiększa skryptów ładowanych na publicznej stronie.
- Wdrożenie exact modułu przez plugin z vars/bindings zgodnymi z repo; migracja i ledger w obu D1, FK check bez błędów, zero zgłoszeń/obiektów w ewidencji. Schedules zapisane w obu Workers, publiczny r2.dev nadal wyłączony.
- Zdalne API obu środowisk: `/api/config` pokazuje wysyłkę/Google/załączniki wyłączone, limity 5 MiB/5 plików/20 MiB; anonimowe GET pliku zwraca 401. Pełny upload z prawdziwym kontem i danymi staging będzie sprawdzony po CF6 w CF8; obecne testy zapisu/odczytu/usuwania R2 były lokalne.

```sh
npm run cf:files:test
npm run cf:api:test
npm run cf:db:test
```

Źródła: [R2 pricing i darmowe operacje delete](https://developers.cloudflare.com/r2/pricing/), [Workers R2 binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [multipart parser](https://github.com/mjackson/multipart-parser).


## Task 5 — przygotowanie zdjęć w przeglądarce

Formularz serwisu rozróżnia oryginały i gotowe pliki. Oryginalne zdjęcie może zajmować do 20 MiB, PDF do 5 MiB; wybór partii oryginałów ograniczono do 40 MiB. Po przygotowaniu: maksymalnie 5 plików, 5 MiB każdy i 20 MiB łącznie. Zwalidowane wcześniej załączniki pozostają przy błędzie nowej partii. Komunikaty formularza i walidacja przed wysyłką opisują limity końcowe zgodne z R2.

Zdjęcia są przetwarzane pojedynczo: odczyt do 1 MiB nagłówka/wymiarów, odrzucenie nieczytelnego kontenera lub >40 mln pikseli, konwersja HEIC w razie potrzeby, JPEG do 2560 px i cel 1,5 MiB. Końcowy rozmiar/wymiary są sprawdzane niezależnie od deklarowanego wyniku biblioteki. Kompresja usuwa EXIF (`preserveExif=false`), zachowuje obsługę orientacji biblioteki. Nie ma fallbacku wysyłającego oryginalne HEIC lub za duży plik do serwera. PDF nie jest przetwarzany: kontrola nagłówka/EOF i rozmiaru, bez zmiany zawartości.

Odczyt nagłówka nie buforuje całego 20 MiB pliku na głównym wątku. Konwersja HEIC i kompresja działają po stronie urządzenia; kompresor używa Web Worker, a biblioteka może korzystać z natywnego fallbacku, gdy worker nie jest obsługiwany. Do listy powstają osobne miniatury maks. 128 px, aby pięć podglądów nie wymagało wyświetlania obrazów 2560 px. Błąd miniatury nie unieważnia przygotowanego zdjęcia. Blob URLs są zwalniane przy usunięciu pliku, resecie, błędzie/anulowaniu partii i opuszczeniu strony.

`service-prepare` i kompresor są ładowane po wyborze zdjęcia; HEIC tylko po wyborze HEIC/HEIF. Surowy konwerter heic2any i skrypt workera kompresji są zasobami tej samej witryny, bez CDN i wysyłania zdjęć do zewnętrznego konwertera. HEIC działa w krótkotrwałym ukrytym iframe o tym samym origin: izoluje globalny worker/canvas biblioteki. Worker jest kończony i iframe usuwany po wyniku, błędzie, anulowaniu lub timeout 30 s. Kolejne zdjęcie tworzy świeży konwerter. JPEG z zachowaną nazwą HEIC (np. po natywnej konwersji przez urządzenie) nie uruchamia konwertera ponownie. Nie gwarantujemy obsługi każdego wariantu/kodeka HEIC; nieobsługiwany plik ma komunikat o eksporcie JPG.

Anulowanie odblokowuje formularz także podczas oczekiwania na dynamiczny import. Sam import może dokończyć pobieranie do cache, ale nie rozpocznie po anulowaniu obróbki ani nie doda pliku. Partia jest atomowa: dopiero po powodzeniu całości jej pliki trafiają na listę; przy błędzie/anulowaniu wcześniejsza lista pozostaje. Podczas obróbki i wysyłki nie można modyfikować listy załączników. POST zawiera wyłącznie gotowe pliki. Zmiana tymczasowego podpisu adresu nie zmienia klucza idempotencji przy ponowieniu identycznej treści.

### QA

- Astro check bez błędów/warning/hint; backend i Workers TypeScript poprawne.
- 25 testów jednostkowych/backendu poprawnych, w tym rozdzielenie limitu oryginału, PDF i pliku końcowego oraz zgodność rozszerzenia/MIME.
- Pięć scenariuszy przeglądarkowych poprawnych w zainstalowanym Chrome: rozmiary 320/390/834/1440, wysyłka i prywatny panel dotychczasowego backendu, retry po utraconym potwierdzeniu, awaria walidatora, lazy loading, HEIC, atomowa partia, za duży PDF, anulowanie kompresora i konwertera.
- Rzeczywista konwersja syntetycznego HEIC 64×64, utworzonego narzędziem sips w macOS; fixture w `tests/fixtures/sample.heic`, bez danych/osób. Test obejmuje też JPEG nazwany HEIC.
- Sieć przy wejściu na stronę nie pobiera heic2any ani browser-image-compression. Miniatura dużego zdjęcia ≤128 px. Kontrola overflow obejmuje mobilne i desktopowe szerokości. Nie jest to test na fizycznym iPhonie/Androidzie; sprawdzenie urządzeń pozostaje częścią odbioru CF8.
- Build statyczny oraz GitHub Pages poprawny, bez aktywowania publicznego API. CI uruchamia nowe scenariusze w Playwright Chromium. Te testy nadal używają lokalnego backendu Node do sprawdzenia UI; pełny przepływ z logowaniem Workers/R2 będzie po CF6 w CF8.

Źródła: [Astro script processing](https://docs.astro.build/en/guides/client-side-scripts/#script-processing), [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression), [heic2any](https://github.com/alexcorvi/heic2any).
