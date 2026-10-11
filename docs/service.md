# Formularz serwisowy — wdrożenie

Mail jest osobnym, przyszłym etapem. GitHub Pages pozostaje hostingiem statycznej strony; API i prywatny panel będą działały na oddzielnym serwerze. Klucz Google zostanie dodany później.

## Taski

- [x] 1. Osobny formularz serwisowy, model adresu, natywne autofill, klawiatura telefonu, wspólna walidacja klienta i serwera. Testy walidacji i Astro check.
- [x] 2. Google Places New: debounce, sesje, ograniczenia i PRG/TERYT; ręczny adres bez Google.
- [x] 3. Załączniki: kompresja, HEIC, miniatury, limity i przetwarzanie serwerowe.
- [x] 4. Lokalne API: trwały zapis, prywatne pliki, logowanie, ograniczenia i ponawianie.
- [ ] 5. Panel: rzeczywiste zgłoszenia, adres, pliki, statusy, notatki; brak publicznych linków.
- [ ] 6. Testy całej ścieżki, urządzeń i instrukcja wdrożenia.
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
