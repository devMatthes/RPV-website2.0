# Etap 08: O nas, poradnik, artykuł i FAQ

Wdrożono cztery statyczne podstrony Astro z aktualnych prototypów Figmy:

- `/o-nas/`: hero ze zdjęciem, zasady pracy, segmenty klientów, realizacje i serwis, panel kontaktowy.
- `/faq/`: trzy grupy po trzy pytania, natywne `details`/`summary`, linki do dofinansowań i kontaktu.
- `/poradnik/`: wyróżniony artykuł i trzy zapowiedzi tematów.
- `/poradnik/fotowoltaika-przed-rozmowa-z-instalatorem/`: artykuł, spis treści, trzy sekcje, podsumowanie i powiązane strony.

Makiety D/T/M: O nas `2166:3474/3476/3478`, FAQ `2166:3480/3482/3484`, poradnik `2184:5050/5052/5054`, artykuł `2184:5056/5058/5060`. Kontekst i zrzuty każdego z 12 ekranów odczytano przez Figma MCP. Zasoby pobrano do porównania hashy: wszystkie zdjęcia i SVG odpowiadają już istniejącym plikom; brak nowych lub odrysowanych grafik. Artykuł i poradnik używają dokładnego pliku `mobile-imgPhotoResidentialSolarInstallation.png` wskazanego w tych makietach.

Wspólny ContentLayout, breadcrumbs, panel CTA i ContentImage. Wykorzystano istniejące komponenty nagłówka, stopki, TextBlock, OfferImage i Faq. Nawigacja „O nas”, przycisk na stronie głównej oraz linki „Poradnik” i „FAQ” w stopce prowadzą do nowych stron. Stare kotwice strony głównej pozostają dostępne. Kontakt i serwis prowadzą obecnie do sekcji kontaktowej; ich docelowe podstrony są etapem 09.

Treści artykułu i About pochodzą z Figmy. Poradnik zawiera jeden przykładowy artykuł, oznaczony zgodnie z makietą jako treść robocza. Trzy zapowiedzi tematów nie udają gotowych artykułów. Makiety FAQ podają pytania bez właściwych odpowiedzi: dziewięć odpowiedzi stanowi redakcyjny szkic do potwierdzenia przez RPV, zapisany w `src/data/content.ts`. Podgląd zachowuje istniejące `noindex, nofollow`.

## Weryfikacja

- `astro check`: 0 błędów, ostrzeżeń i wskazówek; statyczny build lokalny i build z bazą GitHub Pages poprawne.
- 16 wygenerowanych stron; 675 lokalnych linków i odwołań do zasobów, bez błędów zarówno przy `/`, jak i `/RPV-website2.0/`.
- Cztery podstrony sprawdzone w przeglądarce przy 320, 390, 834, 1440 i 1920 px: jeden H1, bez poziomego overflow i uszkodzonych obrazów. Kontrola wizualna mobile, tabletu i desktopu względem makiet.
- FAQ: otwieranie kliknięciem i zamykanie Enterem na `summary`; natywne działanie bez JavaScriptu.
- Menu mobilne → O nas; stopka → poradnik; tytuł i CTA artykułu → artykuł; powrót → poradnik; spis treści → właściwe kotwice. Istniejące usługi i realizacje podłączone.
- Początkowy skrypt nagłówka około 263 B gzip na każdej nowej stronie. Brak skryptów FAQ, artykułu i listy poradnika; brak nowych zależności i animacji.

Lighthouse 13.5, produkcyjny podgląd, headless Chrome, domyślne ograniczenia mobile; raporty w ignorowanym `outputs/qa/`:

| Strona | Tryb | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| O nas | mobile | 99 | 100 | 100 | 1,9 s | 0 | 0 ms |
| FAQ | mobile | 100 | 100 | 100 | 1,7 s | 0,013 | 0 ms |
| Poradnik | mobile | 99 | 100 | 100 | 1,9 s | 0 | 0 ms |
| Artykuł | mobile | 99 | 100 | 100 | 1,9 s | 0,013 | 0 ms |
| Artykuł | desktop | 100 | 100 | 100 | 0,4 s | 0,001 | 0 ms |

Wyniki laboratoryjne nie potwierdzają rzeczywistego INP ani pełnej zgodności WCAG. Do pomiarów terenowych potrzebny jest ruch użytkowników.
