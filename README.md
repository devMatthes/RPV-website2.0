# RPV website

Frontend strony RPV: Astro, TypeScript i CSS. Frontend bez CMS i wysyłki formularzy. Repozytorium zawiera konfigurację GitHub Pages.

## Uruchomienie

Wymagany Node.js zgodny z zainstalowaną wersją Astro.

```sh
npm ci
npm run dev
```

```sh
npm run check
npm run build
npm run preview
```

Źródło projektu: [RPV website 2.0 w Figmie](https://www.figma.com/design/6qWQ6TTUvsLaRevtP7vbjZ/RPV-website2.0). Wdrażamy Responsive prototypes i aktualne komponenty; starsza sekcja Approved desktop jest odniesieniem historycznym.

Plan i kryteria odbioru: [docs/tasks.md](docs/tasks.md).

## GitHub Pages

Workflow `.github/workflows/pages.yml` sprawdza typy, buduje stronę i zapisuje artefakt przy każdym pushu na `main`. Publikacja wymaga włączenia Pages jako GitHub Actions oraz zmiennej repozytorium `PAGES_ENABLED=true`. Obecny plan GitHub odrzuca Pages dla tego prywatnego repo — kod pozostaje prywatny do decyzji właściciela.

Docelowy adres: https://devMatthes.github.io/RPV-website2.0/

Build dla Pages:

```sh
GITHUB_PAGES=true npm run build
```

Lokalne `npm run dev` i `npm run build` używają `/`; workflow używa `/RPV-website2.0/`. Obrazy, fonty, favicon i linki strony głównej respektują base. Podgląd nadal ma noindex/nofollow. Nie skonfigurowano domeny własnej.
