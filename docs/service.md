# Formularz serwisowy — wdrożenie

Mail jest osobnym, przyszłym etapem. GitHub Pages pozostaje hostingiem statycznej strony; API i prywatny panel będą działały na oddzielnym serwerze. Klucz Google zostanie dodany później.

## Taski

- [x] 1. Osobny formularz serwisowy, model adresu, natywne autofill, klawiatura telefonu, wspólna walidacja klienta i serwera. Testy walidacji i Astro check.
- [x] 2. Google Places New: debounce, sesje, ograniczenia i PRG/TERYT; ręczny adres bez Google.
- [x] 3. Załączniki: kompresja, HEIC, miniatury, limity i przetwarzanie serwerowe.
- [x] 4. Lokalne API: trwały zapis, prywatne pliki, logowanie, ograniczenia i ponawianie.
- [x] 5. Panel: rzeczywiste zgłoszenia, adres, pliki, statusy, notatki; brak publicznych linków.
- [x] 6. Testy całej ścieżki, urządzeń i instrukcja wdrożenia.
- [ ] Później: wysyłka maili (oddzielny task).

Przyjmujemy adresy instalacji w Polsce. Telefon może być zagraniczny z prefiksem. Zapisujemy zoptymalizowane zdjęcia; oryginały zdjęć nie są zachowywane. PDF pozostaje bez konwersji.

API używa Node 24, SQLite (WAL) oraz prywatnego katalogu plików. Dla obecnej skali nie jest potrzebna osobna usługa bazy danych. Działa na jednym serwerze z trwałym dyskiem; nie nadaje się bez zmian do wielu replik ani ulotnego filesystemu serverless. Testy obejmują zapis po restarcie, ponowienie bez duplikatu, logowanie, autoryzację plików, konflikt zmian i odrzucenie błędnych danych.

## Uruchomienie lokalne

Wymagany Node 24.14+ i `npm ci`. Skopiuj `.env.example` do `.env` oraz `server/backend.env.example` do `.env.backend`. W `.env` ustaw `PUBLIC_SERVICE_API_URL=http://127.0.0.1:8787` (ponownie uruchom dev lub build). Nie zapisuj tych plików w Git.

Utwórz hash hasła (co najmniej 12 znaków), wpisując hasło w ukrytym prompt:

```sh
python3 -c 'import getpass; print(getpass.getpass("Hasło administratora: "))' | node --experimental-strip-types server/hash-password.ts
```

Wynik wklej do `ADMIN_PASSWORD_HASH` w `.env.backend`. `npm run build`, następnie `npm run api:dev`. Formularz: `http://127.0.0.1:8787/serwis/`; prywatny panel: `http://127.0.0.1:8787/panel/`. W drugim terminalu można uruchomić `npm run dev` (API dopuszcza port 4321). Inny port wymaga zmiany `PUBLIC_ORIGINS`.

Zgłoszenia są w SQLite, pliki poza `dist/`. Idempotency-Key chroni przed duplikatem po zerwanym połączeniu. Serwer sprawdza ponownie adres, telefon, typ pliku, rozmiar, dekodowanie i rozdzielczość. Hasło scrypt; losowe sesje w HttpOnly cookie, 8 godzin, SameSite Strict, Secure na produkcji. Logout unieważnia sesję. Zmiana hasha hasła unieważnia wcześniejsze sesje. Rate limits: wysyłka 6/h/IP, logowanie 5/15 min/IP, sugestie 30/min/IP. Dane nie trafiają do logów żądań ani do statycznego HTML.

Panel rzeczywistych danych: `/panel/live/` w statycznym buildzie, `/panel/` na serwerze API. Publiczna strona nie ma linków do niego. Logowanie i pliki są na origin API, żeby uniknąć zawodnych third-party cookies z GitHub Pages. Dotychczasowe `/panel/serwis/` i `/panel/kontakt/` pozostają wyraźnie opisanym demo z fikcyjnymi danymi. W prywatnym panelu Kontakt jest pusty — jego formularz nie był częścią tego etapu; Przetargi pozostają placeholderem.

## Wdrożenie API (gdy będzie serwer)

1. Przygotuj domenę API (np. `api.twoja-domena.pl`) wskazującą na VPS z Docker Compose. Otwórz porty 80 i 443.
2. W `.env.backend` ustaw `API_ORIGIN=https://api.twoja-domena.pl`, `API_HOST=api.twoja-domena.pl`, `PUBLIC_ORIGINS=https://devmatthes.github.io`, własny `ADMIN_USER` i hash hasła. Przy własnej domenie strony dopisz jej origin. Limity Google są wspólne dla całego API i utrzymywane w bazie po restarcie; budżet Google Cloud sam nie zatrzymuje kosztów.
3. Z katalogu repo wykonaj:

```sh
docker compose --env-file .env.backend -f deploy/compose.yml up -d --build
```

Compose buduje statyczny panel, uruchamia API jako użytkownik bez uprawnień roota, zachowuje bazę i pliki w volume oraz wystawia HTTPS przez Caddy. Backend nie ma publicznego portu. Zaufany jest tylko stały adres proxy; pozwala to liczyć limity według IP klienta, bez zaufania dowolnym nagłówkom `X-Forwarded-For`.

4. Sprawdź `/api/health`, logowanie `/panel/`, próbne zgłoszenie i załącznik. W ustawieniach repo GitHub → Actions → Variables dodaj `SERVICE_API_URL=https://api.twoja-domena.pl` i uruchom workflow Pages. Publiczny build dopiero wtedy połączy się z API. Hasło i klucz Google **nie trafiają** do zmiennych publicznego builda.
5. Google jest opcjonalne: włącz Places API (New), dodaj serwerowy klucz w `GOOGLE_PLACES_API_KEY`, ogranicz go do Places API i publicznego IP serwera, ustaw quotas/alerty rozliczeń. Po restarcie API podpowiedzi będą widoczne. Brak klucza, limit lub awaria nie blokują ręcznego adresu. Test integracji z prawdziwym Google czeka na klucz; testy kontraktu i przetwarzania odpowiedzi używają fixture.

Zalecany serwer ma przynajmniej 1 GB RAM (2 GB daje zapas przy HEIC) i trwały dysk. Jedna instancja API, maksymalnie dwie równoległe konwersje. Konwersja ma limit czasu 30 s, limit wejścia 20 MB i rozdzielczości 40 MP; bardzo duże lub uszkodzone obrazy są odrzucane. Cel klienta to ok. 1,5 MB i 2560 px, końcowy JPEG serwera ma jakość 85 — rozmiar zależy od zawartości. PDF zachowujemy bez zmian i pobieramy jako załącznik, bez osadzania niezaufanego PDF w panelu.

Backend można też uruchomić bez Dockera na Node 24.14+ za własnym reverse proxy HTTPS, z `NODE_ENV=production`, poprawnym `API_ORIGIN`, trwałym `DATA_DIR`, `STATIC_DIR=dist`, `STATIC_BASE=/` i `TRUST_PROXY` ograniczonym do IP tego proxy. Nie wystawiaj samego `DATA_DIR` jako katalogu WWW. Dopasuj limit body proxy do 42 MB.

### Backup i utrzymanie

Kopiuj cały volume: baza `rpv.sqlite` wraz z WAL/SHM oraz `uploads/`. Najprostszy spójny backup: zatrzymaj usługę `api`, wykonaj kopię volume, uruchom `api`. Kopie są prywatne, poza repo, szyfrowane i regularnie odtwarzane testowo. Nie używaj `docker compose down -v` — usuwa dane. Przed realnym uruchomieniem ustal okres przechowywania i uzupełnij informację o prywatności firmy; obecny checkbox to potwierdzenie informacji o obsłudze zgłoszenia, bez zgody marketingowej. API nie wysyła żadnych maili.

### Ograniczenia sprawdzenia

Kod i lokalne API są sprawdzone; Docker/HTTPS na docelowym serwerze oraz prawdziwe zapytania Google wymagają infrastruktury i klucza. Native autofill jest skonfigurowane zgodnie z HTML; działanie zapisanych danych konta trzeba sprawdzić na fizycznym iPhonie/Androidzie. Widoki przetestowano w Chrome przy szerokościach 320, 390, 834 i 1440 px. Dodatkowa walidacja serwerowa jest niezależna od obsługi autofill.

Źródła konfiguracji: [Astro scripts](https://docs.astro.build/en/guides/client-side-scripts/), [Places New](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [GUGiK ULDK](https://uldk.gugik.gov.pl/opis.html), [HEIC conversion](https://github.com/catdad-experiments/heic-convert), [Caddy body limits](https://caddyserver.com/docs/caddyfile/directives/request_body), [Docker Compose](https://docs.docker.com/reference/compose-file/services/).

## Testy i wydajność

`npm test`: 23 testy logiki, walidacji, API, prywatnych plików, konfliktów zmian i przetwarzania zdjęć. `npm run check` oraz `npm run api:check`: kontrola TypeScript. Powtarzalne testy całej ścieżki:

```sh
npx playwright install chromium
PUBLIC_SERVICE_API_URL=http://127.0.0.1:8790 npm run build
npm run test:e2e
```

Testy uruchamiają własne API i tymczasową bazę (port 8790 musi być wolny). Jeśli korzystasz z systemowego Chrome, ustaw `CHROMIUM_EXECUTABLE` na jego ścieżkę. Testują formularz i panel na 320/390/834/1440 px, duży obraz, bezpieczny odczyt, statusy/notatki, utratę odpowiedzi, ponowienie i awarię pobrania walidatora. Google jest mockowane — żadne płatne zapytania nie są wykonywane. Dodatkowo ręczny test w Chrome: rzeczywisty HEIC libheif `examples/example.heic` → JPEG i miniatura; konwersja również po stronie przeglądarki.

Lighthouse na lokalnym buildzie produkcyjnym: Performance 97 mobile / 100 desktop, Accessibility 100 / 100. Mobile LCP 2,26 s, CLS 0,00014, TBT 0 ms; desktop LCP 0,49 s. Główny początkowy skrypt serwisu zajmuje około 6 kB gzip; ciężkie biblioteki są ładowane przy użyciu. Wyniki laboratoryjne nie są pomiarem realnego INP. Raport skrócony: `service-qa-results.json`.

Workflow w GitHub sprawdza także API, uruchamia Playwright na własnej bazie i buduje obraz Docker. Build testów używający localhost nie jest publikowany do Pages.
