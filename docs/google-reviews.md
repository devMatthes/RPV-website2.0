# Opinie Google Places

Strona główna pobiera prawdziwe opinie przez `GET /api/reviews` na backendzie Cloudflare. Klucz `GOOGLE_PLACES_API_KEY` pozostaje w Workers Secrets; frontend nie korzysta z Google Maps JavaScript SDK ani z zewnętrznego widgetu.

## Widoczność i wydajność

Sekcja początkowo ma `hidden` i `display:none`. Oddzielny niewidoczny znacznik uruchamia jedno pobranie, gdy użytkownik zbliży się na 1000 px do jej miejsca. Sekcja pojawia się dopiero po otrzymaniu co najmniej jednej poprawnej opinii. Brak konfiguracji, timeout, błąd Google, brak opinii i limit pozostawiają całą sekcję ukrytą, bez komunikatu i pustego kontenera. Brak automatycznego ponawiania i odpytywania w tle.

Wyświetlane jest maksymalnie pięć opinii, w kolejności trafności zwróconej przez Google. Nie filtrujemy ocen. Zachowujemy treść, autora, dostępną datę względną, avatar i źródło. Treść trafia do DOM przez `textContent`, a odnośniki są ograniczone do HTTPS w domenach Google. Zdjęcia autorów ładują się leniwie; przy ich braku widoczne są inicjały. Karty przewija się poziomo, także klawiaturą, bez automatycznej animacji.

## Limity

- Opinie: `GOOGLE_REVIEWS_DAILY_LIMIT=30`, `GOOGLE_REVIEWS_MONTHLY_LIMIT=500`.
- Wspólna pula adresy + opinie: `GOOGLE_DAILY_LIMIT=100`, `GOOGLE_MONTHLY_LIMIT=1000`.
- Jeden adres IP: 2 żądania sekcji/minutę i 20/dzień. IP jest haszowane HMAC przed zapisem licznika.
- Każde wywołanie dostawcy, także błąd, timeout i początkowe wyszukanie Place ID, zużywa limity przed wysłaniem żądania. Granice dni i miesięcy liczone są w UTC. D1 atomowo egzekwuje każdy dzienny/miesięczny budżet, także przy równoczesnych żądaniach. Rezerwacja osobnej puli opinii może zostać zużyta także przy zablokowaniu wspólnej puli — rozwiązanie celowo zachowawcze.
- Kod nie pozwala podnieść pułapów opinii powyżej 30/500 ani wspólnej puli w tej integracji powyżej 100/1000 samą zmianą zmiennej środowiskowej.

To pułapy aplikacji na dane środowisko, nie gwarancja zerowego rachunku całego konta Google. Inne projekty, inne użycia klucza i staging mają osobne liczniki. Ogranicz klucz do Places API (New) i skonfiguruj limity dostawcy w Google Cloud. Opinie są domyślnie aktywne tylko w production.

## Wizytówka i dane

Wyszukujemy stałą frazę RPV/Sobawiny, wyłącznie z maską `places.id`. Następnie weryfikujemy nazwę i adres lub firmową domenę. Do D1 (`0008_google_reviews.sql`) zapisujemy jedynie potwierdzony Place ID. Możliwe jest podanie go przez `GOOGLE_REVIEWS_PLACE_ID`; przeglądarka nie może wybrać innej firmy.

Nie zapisujemy opinii, zdjęć, nazw autorów ani zbiorczych ocen w D1, Git, buildzie czy cache. Odpowiedź ma `Cache-Control: private, no-store` i `CDN-Cache-Control: no-store`; frontend używa `cache:no-store`. Timeout Google wynosi 6 s, limit odpowiedzi 160 KiB; frontend czeka maksymalnie 10 s. Brak pobrania nie uruchamia zastępczych przykładowych opinii.

Maska szczegółów: `displayName,formattedAddress,websiteUri,rating,userRatingCount,googleMapsUri,reviews`. Pole `reviews` uruchamia SKU Place Details Enterprise + Atmosphere; dane adresowe formularza nadal używają Essentials. Nie należy dodawać cache na dwa tygodnie/miesiąc: Places API nie przyznaje takiego ogólnego wyjątku dla opinii.

## Weryfikacja i wdrożenie

- `npm run cf:reviews:test`: lokalna baza D1, symulowane Google, weryfikacja firmy, atrybucja, brak zapisu treści, błędy, ograniczenie rozmiaru, równoczesne limity, wspólna pula adresów i zmiana miesiąca.
- `npm run cf:api:test`: regresja formularza i integracji adresów.
- `npm run test:e2e -- tests/browser/reviews.spec.mjs`: odpowiedzi API są symulowane; testy widoczności, prawdziwych ocen i bezpiecznego DOM oraz 320/390/834/1440 px. Przed testami zbuduj stronę z `PUBLIC_SERVICE_API_URL=http://127.0.0.1:8790`.
- Zastosuj migrację 0008 przed wdrożeniem Workera. Zachowaj istniejące sekrety, bindings D1/R2 i assets panelu. Frontend wymaga dotychczasowej zmiennej builda `PUBLIC_SERVICE_API_URL` (GitHub repository variable `SERVICE_API_URL`). Nie dodawaj `.env` do repozytorium.

Źródła: [zasady Places](https://developers.google.com/maps/documentation/places/web-service/policies), [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details), [cennik](https://developers.google.com/maps/billing-and-pricing/pricing).
