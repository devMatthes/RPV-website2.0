# Zadania wdrożenia

Każde ukończone zadanie kończy się osobnym commitem. Nie publikujemy witryny ani nie podłączamy backendu w tym etapie.

- [x] 01. Repozytorium, Astro, strict TypeScript, podstawowy build. `astro check`: 0 błędów; statyczny build poprawny.
- [x] 02. Lokalne zasoby Figma, trzy rodziny fontów, tokeny i layout. Oryginalne rastry i SVG pobrane; fonty latin/latin-ext; wspólne BaseLayout, Brand, Button.
- [x] 03. Responsywny nagłówek, menu, hero i partnerzy. Typy i build poprawne; responsywne AVIF/WebP, menu modalne z Escape i przywracaniem fokusu. Kontrola wizualna w zadaniu 05.
- [x] 04. Sekcje strony głównej: segmenty, bannery, usługi, opinie, mapa, statystyki, stopka.
- [x] 05. Kontrola wizualna, dostępność, pomiary i poprawki wydajności. Lighthouse mobile 98 / desktop 100; LCP 2,3 / 0,5 s; szczegóły i ograniczenia w `qa.md`.
- [ ] 06. Podstrony oferty: segmenty klientów i sześć usług.
- [ ] 07. Realizacje i galeria.
- [ ] 08. O nas, poradnik, artykuł, FAQ.
- [ ] 09. Kontakt, serwis, stany formularzy, cookies, 404.

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
