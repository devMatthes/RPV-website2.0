# Formularz serwisowy — wdrożenie

Mail jest osobnym, przyszłym etapem. GitHub Pages pozostaje hostingiem statycznej strony; API i prywatny panel będą działały na oddzielnym serwerze. Klucz Google zostanie dodany później.

## Taski

- [x] 1. Osobny formularz serwisowy, model adresu, natywne autofill, klawiatura telefonu, wspólna walidacja klienta i serwera. Testy walidacji i Astro check.
- [x] 2. Google Places New: debounce, sesje, ograniczenia i PRG/TERYT; ręczny adres bez Google.
- [ ] 3. Załączniki: kompresja, HEIC, miniatury, limity i przetwarzanie serwerowe.
- [ ] 4. Lokalne API: trwały zapis, prywatne pliki, logowanie, ograniczenia i ponawianie.
- [ ] 5. Panel: rzeczywiste zgłoszenia, adres, pliki, statusy, notatki; brak publicznych linków.
- [ ] 6. Testy całej ścieżki, urządzeń i instrukcja wdrożenia.
- [ ] Później: wysyłka maili (oddzielny task).

Przyjmujemy adresy instalacji w Polsce. Telefon może być zagraniczny z prefiksem. Zapisujemy zoptymalizowane zdjęcia; oryginały zdjęć nie są zachowywane. PDF pozostaje bez konwersji.
