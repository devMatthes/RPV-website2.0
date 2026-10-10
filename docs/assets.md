# Zasoby i typografia

Grafiki w src/assets/figma pochodzą z aktualnych Landing / Desktop / 1920 i Landing / Mobile / 390. manifest.json zawiera rozmiary plików i natywne wymiary SVG, bez tymczasowych URL-i.

Rasteryzowane zdjęcia trafiają do astro:assets i otrzymują warianty WebP/AVIF w buildzie. SVG są używane jako lokalne pliki, z zachowanymi proporcjami i rozmiarami root. Render całej makiety nie jest zasobem strony.

Roboto, Inter i Plus Jakarta Sans: lokalne pliki variable WOFF2 z pakietów Fontsource, wyłącznie normal, latin i latin-ext. unicode-range ogranicza pobieranie podzbiorów; font-display: swap zachowuje widoczność tekstu. Preload wyłącznie Roboto użytego w głównym nagłówku. Licencje fontów znajdują się w odpowiednich pakietach npm.

Wersja podglądowa ma noindex do czasu uzupełnienia treści i przygotowania publikacji.
