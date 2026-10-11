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

Każde zadanie implementacyjne sprawdzamy i kończymy osobnym commitem. Workers, D1, R2 oraz CMS nie zostały jeszcze wdrożone.
