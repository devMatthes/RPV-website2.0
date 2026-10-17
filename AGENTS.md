# Zasady pracy w repozytorium

## Bezwzględny zakaz publikowania konfiguracji środowiskowej i sekretów

- Nigdy nie dodawaj do commita, nie pushuj ani nie publikuj plików `.env`, `.env.*`, `.dev.vars` i `.dev.vars.*`. Zakaz obowiązuje także wtedy, gdy plik nie jest ignorowany przez Git albo pasuje do wyjątku w `.gitignore`.
- Nie używaj `git add -f` ani innych sposobów obchodzenia tego zakazu. Nie kopiuj zawartości tych plików do innych plików, dokumentacji, testów, logów, opisów PR, artefaktów CI ani zasobów strony.
- Nigdy nie umieszczaj kluczy API, tokenów, haseł ani innych sekretów w repozytorium lub historii Git, niezależnie od nazwy pliku. Sekrety produkcyjne konfiguruj w odpowiednim magazynie sekretów, np. Cloudflare Workers Secrets.
- Przed każdym commitem sprawdź `git diff --cached --name-only` i staged diff pod kątem plików środowiskowych oraz ujawnionych sekretów. Przed pushem sprawdź również pliki zmienione we wszystkich wysyłanych commitach. Nie wypisuj wartości sekretów podczas weryfikacji.
- Jeżeli plik środowiskowy lub sekret trafi do indeksu, usuń go z indeksu bez usuwania lokalnego pliku i zatrzymaj publikację do czasu poprawienia zmian. Jeśli sekret znalazł się już w commicie lub zdalnym repozytorium, przerwij dalszą publikację, poinformuj użytkownika bez ujawniania wartości i zaplanuj unieważnienie/rotację sekretu oraz oczyszczenie historii. Samo dopisanie do `.gitignore` nie usuwa wycieku z historii.
- Konfigurację dokumentuj nazwami zmiennych i opisami, bez rzeczywistych wartości sekretów. Nie odczytuj lokalnych plików z sekretami, jeżeli zadanie tego nie wymaga.
