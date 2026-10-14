# Retencja i odzyskiwanie danych

Stan: CF12. Publiczna strona pozostaje statyczna; sprzątanie działa w Cloudflare Worker.

| Dane | Termin i sposób usunięcia |
| --- | --- |
| Serwis i zwykły kontakt | 24 h od zamknięcia: blokada odczytu i zmian; fizyczne usuwanie w najbliższej partii crona co 15 min |
| Notatki, historia, metadane załączników | Kaskada tej samej transakcji co usunięcie sprawy |
| Pliki klienta w R2 | Trwała kolejka usuwania, po potwierdzeniu R2; ponowienia z rosnącym odstępem przy awarii |
| Niedokończone uploady | Istniejąca 1-godzinna dzierżawa i sprzątanie, bez usuwania plików przypisanych do spraw/CMS |
| Sesje panelu, sesje/predykcje adresowe i okna limitów | Po ich wygaśnięciu, partiami w cron |
| Historia bazy D1 | Automatyczny Time Travel: 7 dni na obecnym Workers Free, bez dodatkowych dumpów |
| Rejestr usuniętych spraw w prywatnym R2 | 8 dni od skutecznego zapisu, tylko UUID i terminy; cron + ograniczona reguła lifecycle |
| Punkt kontrolny przed odtworzeniem | Do 1 dnia; tylko statusy/terminy/UUID i liczniki, bez treści zgłoszeń ani sekretów |

Ponowne otwarcie przed terminem anuluje usuwanie. Notatka do zamkniętej sprawy nie przesuwa terminu. Po ponownym zamknięciu zaczyna się nowe 24 h. Reguły usuwania spraw nie dotyczą zdjęć realizacji i treści CMS.

24 h dotyczy aktywnej aplikacji. Historyczne dane mogą pozostać w zarządzanej kopii D1 do wygaśnięcia jej 7-dniowego okna. Nie powstają dodatkowe kopie załączników klientów. Time Travel nie odtwarza usuniętych obiektów R2 ani sekretów Workera. Dotyczy to również oryginałów CMS: obecne pliki są utrzymywane w prywatnym R2, a wygenerowane publiczne WebP na Pages nie zastępują archiwum oryginałów. Dodatkowa kopia plików wymaga osobnej polityki retencji i budżetu.

## Działanie sprzątania i koszty

Cron `*/15 * * * *` w staging i production przetwarza najwyżej 20 spraw i 50 plików na uruchomienie. Zaległa kolejka może wymagać kilku przebiegów. Niedostępność D1/R2, wyczerpanie limitu operacji lub miejsca mogą opóźnić fizyczne usunięcie; dostęp przez API nadal jest zablokowany po terminie. Nie zwiększamy limitów i nie przełączamy konta na plan płatny automatycznie.

Jedna mała operacja R2.put na partię zapisuje rejestr przed usunięciem D1. Wykorzystuje dotychczasowe liczniki Class A i miejsca; nowe uploady na rzeczywistych środowiskach zostawiają 1 MiB wewnątrz globalnego limitu na obsługę retencji. Rejestr ma konserwatywną rezerwację 4 KiB. Nieudany/niepewny zapis zachowuje intencję i rezerwację do ponowienia. Błąd zapisu rejestru wstrzymuje fizyczne usunięcie spraw, ale nie blokuje retry wcześniej zakolejkowanych plików.

Usuwanie R2 jest zbiorcze i bez operacji listowania całego bucketu. Miejsce zwalniamy dopiero po R2.delete oraz atomowym usunięciu właściciela z D1. Ponowienie nie odejmuje bajtów drugi raz. Blokada konserwacyjna chroni przed nakładającymi się cronami i recovery. Przeterminowane rejestry są usuwane także wtedy, gdy ich wpisów nie było w starszej kopii bazy. Lifecycle dotyczy wyłącznie prefiksów `retention/` (8 dni) i `recovery/` (1 dzień), zachowując dotychczasową regułę porzucania multipartów. Wygasanie lifecycle nie jest gwarancją usunięcia dokładnie w danej sekundzie.

W Workers Logs sprawdzaj strukturalne zdarzenia `maintenance` i `maintenance_failed`: `casesPurged`, `casesPending`, `filesPending`, `purgeFailed`. Logi nie zawierają treści, adresów, nazw plików ani identyfikatorów spraw. Utrzymujący się backlog lub błąd wymaga sprawdzenia limitów, stanu D1/R2 i kolejki. Nie dodano powiadomień e-mail ani osobnej usługi monitoringu.

## Odtwarzanie — procedura operatora

Odtworzenie D1 nadpisuje dane. Tej procedury nie uruchamia się na produkcji jako rutynowego testu. Próba automatyczna korzysta z dwóch lokalnych baz i danych syntetycznych. Wybieraj punkt w ostatnich 7 dniach i wykonuj procedurę w ciągu 24 h od przygotowania punktu kontrolnego. Nie używaj tego przepływu do przenoszenia bazy między środowiskami.

1. W Cloudflare ustaw dla `rpv-api-production` zwykłą zmienną `RECOVERY_MODE=true` i wdroż ją. Zachowaj ten tryb przez całą operację, również podczas późniejszego wdrażania kodu. API formularzy, odczytu danych i publikacji zwraca wtedy 503. Statyczna publiczna strona nadal działa.
2. Zaloguj się przez Access i otwórz panel na `https://panel.rpv.pl/panel/`. Operacje wykonuj z jego origin, np. w konsoli przeglądarki. To endpoint operatora, bez przycisku w publicznej stronie ani automatycznego cofania bazy.

   ```js
   async function recovery(action) {
     const response = await fetch('/api/admin/maintenance/recovery', {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({action}),
     });
     const result = await response.json();
     if (!response.ok) throw new Error(result.message ?? 'Recovery failed');
     return result;
   }
   await recovery('prepare');
   ```

   `prepare` wymaga, by rozpoczęte uploady zakończyły się lub ich dzierżawy wygasły. Zapisuje niezależnie w R2 aktualne statusy/terminy oraz limity kosztów. Nie kontynuuj bez `prepared: true`. Jeśli bieżący D1 jest na tyle uszkodzony, że nie da się przygotować punktu kontrolnego, pozostaw kwarantannę i najpierw ustal ręczny plan odzyskania retencji/liczników; endpoint nie zgaduje brakującego stanu.
3. Zapisz bieżący bookmark do prywatnej notatki operatora. Cloudflare Dashboard D1 → Time Travel albo autoryzowany Wrangler:

   ```sh
   npx wrangler d1 time-travel info rpv-db-production --config cloudflare/wrangler.jsonc --env production
   ```

   Przywróć wybrany bookmark/timestamp przez Dashboard lub `wrangler d1 time-travel restore`. Zachowaj bookmark sprzed operacji do awaryjnego cofnięcia samego restore. Nie cofaj bucketu R2 ani nie usuwaj `retention/` i `recovery/`.
4. Zastosuj wszystkie migracje z bieżącego kodu:

   ```sh
   npm run cf:db:migrate:production
   ```

5. Nadal w trybie recovery uruchom `await recovery('start')`. Odczytuje punkt kontrolny, nie cofa bieżących limitów kosztów, zachowuje statusy/terminy z chwili awarii i unieważnia stare sesje bazodanowe. Access nadal wymaga dokładnego konta administratora. Jeżeli odtworzono aktywną blokadę konserwacyjną, zaczekaj do jej wygaśnięcia (do 5 min). **Nie wywołuj ponownie prepare po odtworzeniu** — nadpisałoby punkt kontrolny starymi danymi.
6. Wywołuj `await recovery('step')`, czekając na odpowiedź każdej operacji. Najpierw skanuje prywatny rejestr R2 małymi stronami i usuwa przywrócone sprawy, które były już skasowane; następnie usuwa sprawy po terminie i buduje pełny spis R2. Nie przywraca usuniętych zdjęć. Na końcu przelicza wszystkie rzeczywiste bajty R2, obejmując również obiekty nowsze od kopii D1, i kończy kolejkę usuwania. Nie zwalnia miejsca na podstawie starych liczników. Przekroczenie limitu zatrzymuje proces w kwarantannie.
7. Kontynuuj aż do `complete: true` i `filesPending: 0`. Sprawdź `missingFiles`: niezerowa wartość wymaga ręcznej oceny/reimportu dostępnych oryginałów; plików fizycznie skasowanych w R2 nie odzyska baza. Sprawdź nowe/otwarte sprawy, statusy, załączniki, CMS i liczby plików. Nie przywracaj zamkniętych zgłoszeń wyłącznie po to, aby odzyskać załącznik. W razie przerwy `step` kontynuuje zapisany kursor; `start` rozpoczyna przeliczenie od nowa i jest bezpieczne przy tym samym punkcie kontrolnym.
8. Dopiero po kontroli ustaw `RECOVERY_MODE=false` i wdróż tę zmianę. Normalny cron wznowi działanie i usunie wygasłe dane techniczne/punkt kontrolny. Nie zwiększaj limitów R2 w ramach samego restore.

Sekrety (`APP_SECRET`, administrator Access, Turnstile, opcjonalny token GitHub/Google) są poza D1. Muszą pozostać w konfiguracji Cloudflare; nie zapisuj ich w dumpie, repo ani poleceniach. Dodatkowe ręczne eksporty zawierają dane klientów — nie przechowuj ich w GitHub Actions/publicznym repo i usuń po zakończeniu prac, według zatwierdzonej polityki firmy.

## Potwierdzenie QA

`npm run cf:retention:test` odtwarza rzeczywisty lokalny eksport SQL przez Wrangler do odrębnego D1, zachowując niezależny R2. Testuje odmowę dostępu/CSRF, kwarantannę, granicę 24 h, reopen, awarie zapisu rejestru i delete, kaskady, limit partii 50 z 51 plików, wznowienia, wygasanie rejestru po restore, brak powrotu usuniętej sprawy, zachowanie aktualnych terminów/statusów oraz rekonstrukcję kosztów/miejsca. Nie odtwarza ani nie eksportuje klientów produkcyjnych.

Źródła: [D1 Time Travel i backupy](https://developers.cloudflare.com/d1/reference/time-travel/), [R2 lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).
