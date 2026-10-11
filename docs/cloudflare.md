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

Każde zadanie implementacyjne sprawdzamy i kończymy osobnym commitem. CMS i migracja zgłoszeń nie zostały jeszcze wdrożone.

## Task 1 — środowiska Cloudflare

- [x] Aktualny Wrangler, konfiguracja lokalna/staging/production i generowane typy.
- [x] Dwie rzeczywiste bazy D1 w UE.
- [x] Lokalne D1/R2, endpoint health, smoke i dry runs, kontrole CI.
- [x] Aktywacja R2 przez właściciela i utworzenie prywatnych bucketów.
- [x] Wdrożenie i sprawdzenie zdalnych Workers po aktywacji R2.

Task 1 ukończony. Migracja danych zgłoszeń pozostaje taskiem 2.

Konfiguracja: `cloudflare/wrangler.jsonc`. Domyślne środowisko jest lokalne (port 8788, bez połączeń do danych produkcyjnych). Środowiska `staging` i `production` mają osobne zasoby. Flaga `remote: false` dotyczy lokalnego developmentu; po wdrożeniu bindings wskazują rzeczywiste zasoby danego środowiska.

Utworzono dwie bazy D1 w jurysdykcji UE, bez replik odczytu:

| Środowisko | Baza D1 | Identyfikator |
| --- | --- | --- |
| staging | rpv-db-staging | 068eda7a-02a0-48cf-8df9-a5dfb41c19bc |
| production | rpv-db-production | b25888e0-07df-4f6d-babc-3c8c2579ae60 |

Bindings: `DB` (D1), `FILES` (R2), `ENVIRONMENT`. Identyfikatory zasobów nie są sekretami. Dane klientów i pliki nie trafiają do Git. Katalog `.wrangler/` i pliki `.dev.vars*` są ignorowane; wyjątkiem jest pusty szablon `.dev.vars.example`.

Właściciel aktywował R2. Utworzono prywatne buckety `rpv-files-staging` i `rpv-files-production` w klasie Standard, z lokalizacją WEUR (wskazówka lokalizacji, jurysdykcja default; nie jest to twarde ograniczenie do UE). Potwierdzono `enabled: false` dla publicznego r2.dev i brak domen publicznych. Nie włączać publicznego adresu r2.dev ani publicznej domeny dla załączników. Konfiguracja lokalna R2 działa niezależnie od aktywacji usługi.

Worker ma wyłącznie endpoint infrastrukturalny `/api/health`; brak API formularzy, CMS i panelu w tej fazie. Odpowiedź health nie potwierdza jeszcze gotowości aplikacji ani dostępności bazy/plików. Logi mają wyłączone automatyczne logowanie wywołań i śledzenie, a query string jest redagowany, aby przyszłe dane formularzy nie trafiały do logów.

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

Docelowe tymczasowe adresy: `https://rpv-api-staging.jaciubekmateusz.workers.dev` i `https://rpv-api-production.jaciubekmateusz.workers.dev`. `panel.rpv.pl` podłączymy po aktywacji DNS i przygotowaniu panelu. Nie ustawiamy jeszcze `SERVICE_API_URL` w GitHub: infrastrukturalny Worker nie przyjmuje zgłoszeń.

GitHub Actions sprawdza binding types, TypeScript, lokalne D1/R2 i oba dry runs. Dotychczasowe API Node pozostaje dostępne lokalnie do porównania podczas migracji.

### Wyniki sprawdzenia przygotowania

- `cf:types -- --check` oraz `cf:check`: poprawne.
- `cf:smoke`: trzy konfiguracje, lokalny zapis/odczyt D1 i zapis/odczyt/usunięcie R2; health GET/HEAD, odrzucenie POST i nieistniejącego API zgłoszeń.
- Dry run staging oraz production: poprawne; moduł 1,08 KiB (0,57 KiB gzip).
- Rzeczywisty lokalny runtime Wrangler: `/api/health` zwraca 200 i `phase: infrastructure`.
- Dotychczasowe 24 testy backendu: poprawne. `api:check` oraz Astro check: brak błędów.
- CI commita `f5ae48b`: wszystkie zadania poprawne, w tym smoke Cloudflare, oba dry runs, testy przeglądarkowe i build obrazu dotychczasowego API.
- Zdalne Workers staging i production: `/api/health` zwraca HTTPS 200 i właściwe środowisko. Odczyt settings potwierdza osobne DB/FILES oraz ustawienia logów zgodne z repo. Zdalne D1: `SELECT 1` poprawne w obu środowiskach. D1 nie zawiera jeszcze tabel aplikacji ani danych klientów.
- Prywatność R2: r2.dev wyłączone, brak custom domains. Testy zapisu i odczytu plików wykonano lokalnie; zdalny przepływ załączników będzie testowany w tasku 4.

## Kontrola kosztów — propozycja do taska 4

Cloudflare budget alerts są informacyjne: nie zatrzymują ani nie ograniczają użycia. Nie ustawiono alertu na koncie ani limitów aplikacyjnych w tasku 1.

Propozycja: limit miejsca na dane RPV łącznie 8 GB (staging i production), limity operacji/okres rozliczeniowy oraz dotychczasowe limity na plik i zgłoszenie. Wymaga liczników, rezerwacji miejsca odpornej na równoległe uploady, odrzucania nowych operacji po wyczerpaniu budżetu i zachowania możliwości usuwania danych. Wliczać zdjęcia CMS, pliki tymczasowe i uwzględnić kopie zapasowe. Alert kosztowy np. 1 USD w Billing > Billable Usage jest dodatkowym ostrzeżeniem, a nie gwarancją rachunku 0 USD.

Darmowy limit R2 Standard dotyczy całego konta: 10 GB-month, 1 mln operacji Class A i 10 mln Class B na okres rozliczeniowy. Nie jest oddzielny dla każdego bucketu. Inne projekty, działania z panelu/API i opóźnione metryki mogą ograniczyć skuteczność własnej kontroli kosztów. Przyszłe limity aplikacji nie gwarantują zerowych kosztów całego konta.

Źródła: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/).
