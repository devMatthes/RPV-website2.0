// Layout and page copy from current Figma prototypes. FAQ answers are editorial drafts.
export interface TextBlockData { index: string; title: string; description: string; slug?: string; }
export interface FaqItem { question: string; answer: string; }
export interface OfferSectionData {
  kind: 'blocks' | 'equipment' | 'process' | 'links' | 'examples' | 'evidence' | 'faq' | 'cta';
  id: string; title: string; description: string; eyebrow?: string; blocks: TextBlockData[];
  faq?: FaqItem[]; primaryLabel?: string;
  examples?: { title: string; description: string; image: 'house' | 'technician'; }[];
  sources?: { label: string; url: string; }[]; sourceNote?: string;
}
export interface OfferPageData {
  slug: string; name: string; kind: 'pv' | 'service' | 'audience'; figmaNode: string;
  hero: { eyebrow: string; title: string; description: string; primaryLabel: string; secondaryLabel: string;
    image?: 'house' | 'technician'; caption?: string; audiences?: string;
    focus?: { number: string; title: string; description: string; meta: string; }; };
  sections: OfferSectionData[];
}
export const offerPages = [
  {
    "slug": "fotowoltaika",
    "name": "Fotowoltaika",
    "kind": "pv",
    "figmaNode": "2120:1210",
    "hero": {
      "eyebrow": "FOTOWOLTAIKA",
      "title": "Fotowoltaika\nna Twoich warunkach.",
      "description": "Projektujemy i montujemy instalacje fotowoltaiczne dla domów, firm i inwestycji. Zaczynamy od Twoich potrzeb — dobieramy urządzenia, przygotowujemy projekt i zajmujemy się montażem.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Jak to działa ↓",
      "image": "house",
      "caption": "Energia ze słońca. Rozwiązanie dopasowane do budynku.",
      "audiences": "Dla domu · Dla firm · Dla inwestycji"
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Własna energia.\nWięcej możliwości.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Wykorzystaj własną energię",
            "description": "Produkuj energię na miejscu i wykorzystuj ją w domu lub firmie. Dobór instalacji opieramy na Twoim rzeczywistym zużyciu."
          },
          {
            "index": "02",
            "title": "Dopasuj instalację do budynku",
            "description": "Dach, grunt, obiekt firmowy — projekt uwzględnia miejsce montażu, warunki techniczne oraz sposób użytkowania budynku."
          },
          {
            "index": "03",
            "title": "Zostaw miejsce na rozwój",
            "description": "Planujesz pompę ciepła, samochód elektryczny lub magazyn energii? Uwzględnimy to przy doborze urządzeń."
          }
        ],
        "eyebrow": "01 / DLACZEGO FOTOWOLTAIKA"
      },
      {
        "kind": "equipment",
        "id": "oferta",
        "title": "Urządzenia, które pracują razem.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Panele fotowoltaiczne",
            "description": "Dobieramy moduły do dostępnej powierzchni i warunków montażu. Ważna jest nie tylko moc, ale cały projekt instalacji."
          },
          {
            "index": "02",
            "title": "Falownik i monitoring",
            "description": "Falownik łączy instalację z domem lub firmą. Monitoring pozwala obserwować jej pracę i produkcję energii."
          },
          {
            "index": "03 / OPCJONALNIE",
            "title": "Magazyn energii",
            "description": "Może uzupełnić instalację o możliwość przechowywania energii. Dobór pojemności i zgodności urządzeń omawiamy podczas projektu."
          }
        ],
        "eyebrow": "02 / TWOJA INSTALACJA"
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Jeden zespół. Cały proces.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Rozmowa i analiza",
            "description": "Poznajemy budynek, zużycie energii i Twoje plany. Ustalamy, jakie rozwiązanie warto rozważyć."
          },
          {
            "index": "02",
            "title": "Projekt i wycena",
            "description": "Dobieramy moc, urządzenia i sposób montażu. Otrzymujesz zakres prac oraz indywidualną wycenę."
          },
          {
            "index": "03",
            "title": "Montaż instalacji",
            "description": "Uzgadniamy termin i wykonujemy instalację zgodnie z projektem. Sprawdzamy połączenia i zabezpieczenia."
          },
          {
            "index": "04",
            "title": "Uruchomienie",
            "description": "Weryfikujemy działanie systemu i pokazujemy monitoring. W razie potrzeby pozostajemy dostępni przez serwis."
          }
        ],
        "eyebrow": "03 / OD ROZMOWY DO URUCHOMIENIA"
      },
      {
        "kind": "examples",
        "id": "sekcja-5",
        "title": "Fotowoltaika dopasowana\ndo miejsca.",
        "description": "",
        "blocks": [],
        "eyebrow": "04 / MIEJSCE NA TWOJĄ ENERGIĘ",
        "examples": [
          {
            "title": "Na dachu domu",
            "description": "Projekt uwzględniający powierzchnię dachu i potrzeby domowników.",
            "image": "house"
          },
          {
            "title": "Dla firm i inwestycji",
            "description": "Dobór instalacji do obiektu, zużycia energii i planów rozwoju.",
            "image": "technician"
          }
        ]
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed\npierwszym krokiem.",
        "description": "Nie znalazłeś odpowiedzi? Porozmawiajmy o Twojej instalacji.",
        "blocks": [],
        "eyebrow": "05 / WARTO WIEDZIEĆ",
        "faq": [
          {
            "question": "Jak dobrać moc instalacji fotowoltaicznej?",
            "answer": "Dobór zaczynamy od zużycia energii i warunków montażu."
          },
          {
            "question": "Od czego zależy koszt fotowoltaiki?",
            "answer": "Od dobranych urządzeń, miejsca montażu i zakresu prac. Po analizie budynku przygotowujemy indywidualną wycenę."
          },
          {
            "question": "Czy mogę dodać magazyn energii?",
            "answer": "Dobór pojemności i zgodności urządzeń omawiamy podczas projektu. Magazyn może uzupełnić instalację o możliwość przechowywania energii."
          },
          {
            "question": "Jak przebiega montaż i uruchomienie?",
            "answer": "Uzgadniamy termin i wykonujemy instalację zgodnie z projektem. Sprawdzamy połączenia, zabezpieczenia i działanie systemu oraz pokazujemy monitoring."
          },
          {
            "question": "Jak zgłosić problem z instalacją?",
            "answer": "Skontaktuj się z RPV telefonicznie lub mailowo. Opisz problem i podaj dane instalacji, abyśmy mogli uzgodnić dalsze kroki."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Zacznij od rozmowy.\nResztą zajmiemy się razem.",
        "description": "Opowiedz nam o budynku i swoich potrzebach. Przygotujemy propozycję instalacji fotowoltaicznej.",
        "blocks": [],
        "eyebrow": "Zacznij od rozmowy.",
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "pompy-ciepla",
    "name": "Pompy ciepła",
    "kind": "service",
    "figmaNode": "2146:1857",
    "hero": {
      "eyebrow": "OGRZEWANIE / 01",
      "title": "Pompy ciepła.\nDobór zaczyna się od domu.",
      "description": "Dobieramy i montujemy pompy ciepła z uwzględnieniem budynku oraz istniejącej instalacji grzewczej. Omawiamy ogrzewanie, ciepłą wodę i współpracę z pozostałymi urządzeniami.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Zakres usługi ↓",
      "focus": {
        "number": "01",
        "title": "Najpierw budynek.\nPotem urządzenie.",
        "description": "Zapotrzebowanie na ciepło, instalacja grzewcza i miejsce montażu tworzą punkt wyjścia do projektu.",
        "meta": "DOBÓR / MONTAŻ / URUCHOMIENIE"
      }
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Ogrzewanie dopasowane\ndo budynku i użytkowników.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Dobór do zapotrzebowania",
            "description": "Weryfikujemy potrzeby cieplne budynku zamiast dobierać urządzenie wyłącznie na podstawie powierzchni."
          },
          {
            "index": "02",
            "title": "Współpraca z instalacją",
            "description": "Sprawdzamy odbiorniki ciepła, przygotowanie ciepłej wody oraz możliwości modernizacji."
          },
          {
            "index": "03",
            "title": "Uzgodniony zakres prac",
            "description": "Montaż, uruchomienie i sposób obsługi ustalamy przed rozpoczęciem realizacji."
          }
        ]
      },
      {
        "kind": "blocks",
        "id": "oferta",
        "title": "Co obejmuje projekt\ninstalacji pompy ciepła?",
        "description": "Dokładny zakres ustalamy po poznaniu obiektu i Twoich potrzeb.",
        "blocks": [
          {
            "index": "01",
            "title": "Analiza budynku",
            "description": "Izolacja, sposób ogrzewania i dane o zapotrzebowaniu na ciepło."
          },
          {
            "index": "02",
            "title": "Dobór i montaż",
            "description": "Urządzenie, osprzęt hydrauliczny, sterowanie oraz uzgodnione prace instalacyjne."
          },
          {
            "index": "03",
            "title": "Uruchomienie i obsługa",
            "description": "Sprawdzenie pracy instalacji i przekazanie informacji o korzystaniu z systemu."
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od rozmowy do uruchomienia.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Rozmowa i analiza",
            "description": "Poznajemy obiekt, obecną instalację oraz Twoje oczekiwania."
          },
          {
            "index": "02",
            "title": "Dobór i wycena",
            "description": "Uzgadniamy urządzenia, rozwiązanie techniczne i zakres prac."
          },
          {
            "index": "03",
            "title": "Realizacja i przekazanie",
            "description": "Montujemy instalację, sprawdzamy jej pracę i przekazujemy obsługę."
          }
        ]
      },
      {
        "kind": "links",
        "id": "sekcja-5",
        "title": "Rozwiązania, które\nmogą uzupełnić projekt.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Dofinansowania OZE",
            "description": "Sprawdzenie aktualnych warunków wsparcia dla planowanej inwestycji.",
            "slug": "dofinansowania-oze"
          },
          {
            "index": "03",
            "title": "Rozdzielnice i elektryka",
            "description": "Nowe instalacje, modernizacja, pomiary i uzgodniona dokumentacja.",
            "slug": "rozdzielnice-i-elektryka"
          }
        ]
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Czy pompa ciepła nadaje się do modernizowanego domu?",
            "answer": "Sprawdzamy potrzeby cieplne budynku, odbiorniki ciepła i możliwości modernizacji. Dobór urządzenia wymaga analizy istniejącej instalacji."
          },
          {
            "question": "Od czego zależy koszt?",
            "answer": "Zakres prac i urządzenia dobieramy po poznaniu obiektu. Otrzymujesz propozycję rozwiązania technicznego oraz indywidualną wycenę."
          },
          {
            "question": "Czy pompa ciepła może współpracować z fotowoltaiką?",
            "answer": "W projekcie uwzględniamy współpracę ogrzewania z pozostałymi urządzeniami. Rozwiązanie dobieramy do budynku i sposobu korzystania z energii."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "magazyny-energii",
    "name": "Magazyny energii",
    "kind": "service",
    "figmaNode": "2146:1863",
    "hero": {
      "eyebrow": "MAGAZYNOWANIE / 04",
      "title": "Magazyny energii.\nEnergia na później.",
      "description": "Dobieramy magazyny energii do nowych i istniejących instalacji. Sprawdzamy profil zużycia, zgodność falownika oraz funkcje, których rzeczywiście potrzebujesz.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Zakres usługi ↓",
      "focus": {
        "number": "04",
        "title": "Nie tylko pojemność.\nLiczy się cały system.",
        "description": "Falownik, akumulator, sterowanie i odbiorniki muszą współpracować jako jedna instalacja.",
        "meta": "DOBÓR / MONTAŻ / URUCHOMIENIE"
      }
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Magazyn dopasowany\ndo sposobu korzystania z energii.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Profil zużycia",
            "description": "Analizujemy, kiedy produkujesz i wykorzystujesz energię oraz jakie odbiorniki pracują w budynku."
          },
          {
            "index": "02",
            "title": "Zgodność urządzeń",
            "description": "Weryfikujemy współpracę magazynu, falownika, sterowania i zabezpieczeń."
          },
          {
            "index": "03",
            "title": "Funkcje, których potrzebujesz",
            "description": "Omawiamy przechowywanie energii oraz ewentualny zakres zasilania rezerwowego."
          }
        ]
      },
      {
        "kind": "blocks",
        "id": "oferta",
        "title": "Jedna instalacja.\nSpójny dobór urządzeń.",
        "description": "Dokładny zakres ustalamy po poznaniu obiektu i Twoich potrzeb.",
        "blocks": [
          {
            "index": "01",
            "title": "Akumulator i pojemność",
            "description": "Dobór pojemności oraz mocy pracy do profilu zużycia i możliwości instalacji."
          },
          {
            "index": "02",
            "title": "Falownik i sterowanie",
            "description": "Weryfikacja kompatybilności, komunikacji i sposobu zarządzania energią."
          },
          {
            "index": "03",
            "title": "Zasilanie rezerwowe — opcjonalnie",
            "description": "Zakres zależy od zastosowanego systemu, projektu i wydzielonych obwodów. Nie każdy magazyn zapewnia tę funkcję."
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od rozmowy do uruchomienia.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Rozmowa i analiza",
            "description": "Poznajemy obiekt, obecną instalację oraz Twoje oczekiwania."
          },
          {
            "index": "02",
            "title": "Dobór i wycena",
            "description": "Uzgadniamy urządzenia, rozwiązanie techniczne i zakres prac."
          },
          {
            "index": "03",
            "title": "Realizacja i przekazanie",
            "description": "Montujemy instalację, sprawdzamy jej pracę i przekazujemy obsługę."
          }
        ]
      },
      {
        "kind": "links",
        "id": "sekcja-5",
        "title": "Rozwiązania, które\nmogą uzupełnić projekt.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Rozdzielnice i elektryka",
            "description": "Nowe instalacje, modernizacja, pomiary i uzgodniona dokumentacja.",
            "slug": "rozdzielnice-i-elektryka"
          },
          {
            "index": "03",
            "title": "Dofinansowania OZE",
            "description": "Sprawdzenie aktualnych warunków wsparcia dla planowanej inwestycji.",
            "slug": "dofinansowania-oze"
          }
        ]
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Czy magazyn można dodać do istniejącej instalacji?",
            "answer": "Weryfikujemy zgodność falownika, magazynu, sterowania i zabezpieczeń. Możliwości rozbudowy zależą od zastosowanych urządzeń i projektu."
          },
          {
            "question": "Czy magazyn zapewni prąd podczas awarii sieci?",
            "answer": "Nie każdy magazyn zapewnia zasilanie rezerwowe. Zakres tej funkcji zależy od systemu, projektu i wydzielonych obwodów."
          },
          {
            "question": "Jak dobrać pojemność magazynu?",
            "answer": "Analizujemy profil zużycia, produkcję energii i odbiorniki w budynku. Pojemność oraz moc pracy dobieramy do potrzeb i możliwości instalacji."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "klimatyzacje",
    "name": "Klimatyzacja",
    "kind": "service",
    "figmaNode": "2146:1869",
    "hero": {
      "eyebrow": "KOMFORT / 05",
      "title": "Klimatyzacja.\nKomfort w Twojej przestrzeni.",
      "description": "Dobieramy i montujemy systemy split i multisplit dla domów, biur i lokali. Uwzględniamy układ pomieszczeń, miejsce jednostek oraz sposób użytkowania przestrzeni.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Zakres usługi ↓",
      "focus": {
        "number": "05",
        "title": "Jedno pomieszczenie\nlub kilka stref.",
        "description": "Dobór układu i jednostek zaczyna się od przestrzeni — nie od samej liczby metrów.",
        "meta": "DOBÓR / MONTAŻ / URUCHOMIENIE"
      }
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Komfort zaczyna się\nod właściwego doboru.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Potrzeby pomieszczeń",
            "description": "Sprawdzamy nasłonecznienie, sposób użytkowania i warunki w poszczególnych strefach."
          },
          {
            "index": "02",
            "title": "Miejsce montażu",
            "description": "Omawiamy rozmieszczenie jednostek, trasy instalacji i odprowadzenie skroplin."
          },
          {
            "index": "03",
            "title": "Obsługa i serwis",
            "description": "Wyjaśniamy korzystanie z urządzeń oraz zalecenia dotyczące konserwacji."
          }
        ]
      },
      {
        "kind": "blocks",
        "id": "oferta",
        "title": "System dopasowany\ndo układu pomieszczeń.",
        "description": "Dokładny zakres ustalamy po poznaniu obiektu i Twoich potrzeb.",
        "blocks": [
          {
            "index": "01",
            "title": "Split",
            "description": "Jedna jednostka wewnętrzna współpracująca z jednostką zewnętrzną. Dobór do konkretnego pomieszczenia."
          },
          {
            "index": "02",
            "title": "Multisplit",
            "description": "Kilka jednostek wewnętrznych i wspólna jednostka zewnętrzna — układ dobierany do stref."
          },
          {
            "index": "03",
            "title": "Montaż i uruchomienie",
            "description": "Uzgodnione trasy, odprowadzenie skroplin, sprawdzenie instalacji i przekazanie obsługi."
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od rozmowy do uruchomienia.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Rozmowa i analiza",
            "description": "Poznajemy obiekt, obecną instalację oraz Twoje oczekiwania."
          },
          {
            "index": "02",
            "title": "Dobór i wycena",
            "description": "Uzgadniamy urządzenia, rozwiązanie techniczne i zakres prac."
          },
          {
            "index": "03",
            "title": "Realizacja i przekazanie",
            "description": "Montujemy instalację, sprawdzamy jej pracę i przekazujemy obsługę."
          }
        ]
      },
      {
        "kind": "links",
        "id": "sekcja-5",
        "title": "Rozwiązania, które\nmogą uzupełnić projekt.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Pompy ciepła",
            "description": "Dobór ogrzewania do budynku, instalacji grzewczej i potrzeb użytkowników.",
            "slug": "pompy-ciepla"
          },
          {
            "index": "02",
            "title": "Rozdzielnice i elektryka",
            "description": "Nowe instalacje, modernizacja, pomiary i uzgodniona dokumentacja.",
            "slug": "rozdzielnice-i-elektryka"
          },
          {
            "index": "03",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          }
        ]
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Split czy multisplit?",
            "answer": "Split łączy jedną jednostkę wewnętrzną z zewnętrzną. Multisplit obsługuje kilka jednostek wewnętrznych. Układ dobieramy do pomieszczeń i potrzeb użytkowników."
          },
          {
            "question": "Od czego zależy koszt montażu?",
            "answer": "Od dobranego układu, rozmieszczenia jednostek, tras instalacji i uzgodnionego zakresu prac. Wycenę przygotowujemy po poznaniu przestrzeni."
          },
          {
            "question": "Jak zamówić serwis klimatyzacji?",
            "answer": "Skontaktuj się z RPV telefonicznie lub mailowo. Podaj model urządzenia i opisz potrzebny zakres serwisu."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "rozdzielnice-i-elektryka",
    "name": "Rozdzielnice i elektryka",
    "kind": "service",
    "figmaNode": "2146:1875",
    "hero": {
      "eyebrow": "INSTALACJE / 06",
      "title": "Instalacje elektryczne.\nOd rozdzielnicy po odbiór.",
      "description": "Wykonujemy i modernizujemy instalacje elektryczne oraz rozdzielnice. Zakres prac dobieramy do obiektu, istniejących obwodów i planowanych urządzeń.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Zakres usługi ↓",
      "focus": {
        "number": "06",
        "title": "Dobra instalacja\nzaczyna się od projektu.",
        "description": "Obwody, zabezpieczenia i dokumentacja powinny tworzyć spójną całość dostosowaną do obiektu.",
        "meta": "DOBÓR / MONTAŻ / URUCHOMIENIE"
      }
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Zakres prac dopasowany\ndo Twojego obiektu.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Nowe instalacje",
            "description": "Uzgodnienie obwodów, punktów zasilania i potrzeb urządzeń na etapie projektu."
          },
          {
            "index": "02",
            "title": "Modernizacja rozdzielnic",
            "description": "Sprawdzenie istniejącego układu i dobór zakresu zmian przed rozbudową."
          },
          {
            "index": "03",
            "title": "Pomiary i dokumentacja",
            "description": "Ustalenie wymaganych sprawdzeń oraz dokumentów przekazywanych po pracach."
          }
        ]
      },
      {
        "kind": "blocks",
        "id": "oferta",
        "title": "Rozdzielnica, obwody\ni urządzenia. Jeden zakres.",
        "description": "Dokładny zakres ustalamy po poznaniu obiektu i Twoich potrzeb.",
        "blocks": [
          {
            "index": "01",
            "title": "Rozdzielnice",
            "description": "Dobór układu, wyposażenia i oznaczeń odpowiednio do projektu instalacji."
          },
          {
            "index": "02",
            "title": "Instalacje i rozbudowa",
            "description": "Nowe obwody oraz przygotowanie zasilania pod PV, magazyn, ogrzewanie lub klimatyzację."
          },
          {
            "index": "03",
            "title": "Sprawdzenia odbiorowe",
            "description": "Uzgodnione pomiary, próby i dokumentacja potwierdzająca wykonany zakres prac."
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od rozmowy do uruchomienia.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Rozmowa i analiza",
            "description": "Poznajemy obiekt, obecną instalację oraz Twoje oczekiwania."
          },
          {
            "index": "02",
            "title": "Dobór i wycena",
            "description": "Uzgadniamy urządzenia, rozwiązanie techniczne i zakres prac."
          },
          {
            "index": "03",
            "title": "Realizacja i przekazanie",
            "description": "Montujemy instalację, sprawdzamy jej pracę i przekazujemy obsługę."
          }
        ]
      },
      {
        "kind": "links",
        "id": "sekcja-5",
        "title": "Rozwiązania, które\nmogą uzupełnić projekt.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Magazyny energii",
            "description": "Przechowywanie energii oraz weryfikacja zgodności urządzeń.",
            "slug": "magazyny-energii"
          },
          {
            "index": "03",
            "title": "Pompy ciepła",
            "description": "Dobór ogrzewania do budynku, instalacji grzewczej i potrzeb użytkowników.",
            "slug": "pompy-ciepla"
          }
        ]
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Czy można zmodernizować samą rozdzielnicę?",
            "answer": "Sprawdzamy istniejący układ i ustalamy zakres zmian przed rozpoczęciem prac. Możliwości modernizacji zależą od instalacji w obiekcie."
          },
          {
            "question": "Czy przygotujecie instalację pod nowe urządzenia?",
            "answer": "Uzgadniamy nowe obwody i przygotowanie zasilania pod fotowoltaikę, magazyn energii, ogrzewanie lub klimatyzację."
          },
          {
            "question": "Jakie dokumenty otrzymam po zakończeniu?",
            "answer": "Wymagane sprawdzenia, pomiary i dokumentację przekazywaną po pracach ustalamy w uzgodnionym zakresie realizacji."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "dofinansowania-oze",
    "name": "Dofinansowania OZE",
    "kind": "service",
    "figmaNode": "2146:1881",
    "hero": {
      "eyebrow": "WSPARCIE / 03",
      "title": "Dofinansowania OZE.\nPoznaj możliwości.",
      "description": "Chcesz połączyć inwestycję w OZE z dostępnym wsparciem? Zaczynamy od rodzaju budynku, zakresu prac i aktualnych zasad właściwego programu.",
      "primaryLabel": "Zapytaj o wsparcie",
      "secondaryLabel": "Zakres usługi ↓",
      "focus": {
        "number": "03",
        "title": "Warunki, nie obietnice.\nWsparcie wymaga weryfikacji.",
        "description": "Kwota, dostępność naboru i wymagane dokumenty zależą od programu oraz sytuacji wnioskodawcy.",
        "meta": "PROGRAM / WARUNKI / DOKUMENTY"
      }
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Sprawdź warunki\nprzed podjęciem decyzji.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Dla kogo jest program",
            "description": "Weryfikacja rodzaju wnioskodawcy, budynku i inwestycji na podstawie aktualnego regulaminu."
          },
          {
            "index": "02",
            "title": "Co obejmuje wsparcie",
            "description": "Sprawdzenie kosztów kwalifikowanych, wymagań dla urządzeń i zakresu przedsięwzięcia."
          },
          {
            "index": "03",
            "title": "Terminy i dokumenty",
            "description": "Status naboru oraz wymagane załączniki sprawdzane u operatora programu."
          }
        ]
      },
      {
        "kind": "blocks",
        "id": "oferta",
        "title": "Od pomysłu\npo komplet informacji.",
        "description": "Dokładny zakres ustalamy po poznaniu obiektu i Twoich potrzeb.",
        "blocks": [
          {
            "index": "01",
            "title": "Opis inwestycji",
            "description": "Rodzaj budynku, planowane urządzenia i etap przygotowania przedsięwzięcia."
          },
          {
            "index": "02",
            "title": "Weryfikacja programu",
            "description": "Aktualny regulamin, kwalifikowalność, termin oraz sposób składania wniosku."
          },
          {
            "index": "03",
            "title": "Zakres wsparcia RPV",
            "description": "Zakres doradztwa lub pomocy w dokumentacji ustalamy przed rozpoczęciem współpracy."
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od planu do sprawdzenia warunków.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Opis inwestycji",
            "description": "Poznajemy budynek, planowany zakres oraz etap przygotowania."
          },
          {
            "index": "02",
            "title": "Sprawdzenie warunków",
            "description": "Weryfikujemy aktualny regulamin właściwego programu."
          },
          {
            "index": "03",
            "title": "Uzgodnienie dalszych kroków",
            "description": "Omawiamy wymagane dokumenty i zakres pomocy."
          }
        ]
      },
      {
        "kind": "links",
        "id": "sekcja-5",
        "title": "Rozwiązania, które\nmogą uzupełnić projekt.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Pompy ciepła",
            "description": "Dobór ogrzewania do budynku, instalacji grzewczej i potrzeb użytkowników.",
            "slug": "pompy-ciepla"
          },
          {
            "index": "03",
            "title": "Magazyny energii",
            "description": "Przechowywanie energii oraz weryfikacja zgodności urządzeń.",
            "slug": "magazyny-energii"
          }
        ]
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Czy dofinansowanie jest gwarantowane?",
            "answer": "Wsparcie wymaga weryfikacji warunków programu oraz sytuacji wnioskodawcy. Dostępność naboru sprawdzaj w aktualnych dokumentach operatora."
          },
          {
            "question": "Jaką kwotę mogę otrzymać?",
            "answer": "Kwota zależy od programu, kosztów kwalifikowanych i sytuacji wnioskodawcy. Aktualne zasady wymagają sprawdzenia u operatora programu."
          },
          {
            "question": "Gdzie sprawdzić aktualne zasady?",
            "answer": "W aktualnym regulaminie i komunikatach operatora programu. Poniżej znajdziesz odnośniki do oficjalnych informacji."
          }
        ],
        "sources": [
          {
            "label": "NFOŚiGW — programy i nabory ↗",
            "url": "https://www.gov.pl/web/nfosigw"
          },
          {
            "label": "Czyste Powietrze — informacje o programie ↗",
            "url": "https://www.gov.pl/web/gov/skorzystaj-z-programu-czyste-powietrze"
          }
        ],
        "sourceNote": "Dostępność i warunki wsparcia sprawdzaj w aktualnych dokumentach operatora."
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Sprawdźmy możliwości\nTwojej inwestycji.",
        "description": "Opisz planowane prace. Ustalimy, jakie warunki i dokumenty trzeba sprawdzić.",
        "blocks": [],
        "primaryLabel": "Zapytaj o wsparcie"
      }
    ]
  },
  {
    "slug": "dla-domu",
    "name": "Dla domu",
    "kind": "audience",
    "figmaNode": "2146:1839",
    "hero": {
      "eyebrow": "DLA DOMU",
      "title": "Energia dla domu.\nWięcej komfortu.",
      "description": "Fotowoltaika, magazyn energii i instalacje dopasowane do Twojego domu. Łączymy potrzeby domowników z możliwościami budynku — od pierwszej rozmowy po uruchomienie.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Poznaj ofertę ↓",
      "image": "house",
      "caption": "Zdjęcie poglądowe z materiałów RPV."
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Zacznij od tego,\nczego potrzebuje Twój dom.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Zużycie energii",
            "description": "Analizujemy rachunki, sposób użytkowania domu i plany rozbudowy instalacji."
          },
          {
            "index": "02",
            "title": "Komfort domowników",
            "description": "Dobieramy rozwiązania do ogrzewania, chłodzenia i codziennego korzystania z energii."
          },
          {
            "index": "03",
            "title": "Możliwość rozbudowy",
            "description": "Uwzględniamy współpracę urządzeń oraz przyszłe potrzeby budynku."
          }
        ]
      },
      {
        "kind": "links",
        "id": "oferta",
        "title": "Jeden dom.\nRozwiązania, które współpracują.",
        "description": "Wybierz usługę i poznaj jej zakres. Rozwiązania łączymy w spójny projekt.",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Magazyny energii",
            "description": "Przechowywanie energii oraz weryfikacja zgodności urządzeń.",
            "slug": "magazyny-energii"
          },
          {
            "index": "03",
            "title": "Pompy ciepła",
            "description": "Dobór ogrzewania do budynku, instalacji grzewczej i potrzeb użytkowników.",
            "slug": "pompy-ciepla"
          },
          {
            "index": "04",
            "title": "Klimatyzacja",
            "description": "Systemy split i multisplit dopasowane do układu pomieszczeń.",
            "slug": "klimatyzacje"
          },
          {
            "index": "05",
            "title": "Rozdzielnice i elektryka",
            "description": "Nowe instalacje, modernizacja, pomiary i uzgodniona dokumentacja.",
            "slug": "rozdzielnice-i-elektryka"
          },
          {
            "index": "06",
            "title": "Dofinansowania OZE",
            "description": "Sprawdzenie aktualnych warunków wsparcia dla planowanej inwestycji.",
            "slug": "dofinansowania-oze"
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od potrzeb do gotowej instalacji.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Poznajemy Twój dom",
            "description": "Porozmawiamy o budynku, obecnych urządzeniach i oczekiwaniach."
          },
          {
            "index": "02",
            "title": "Dobieramy rozwiązania",
            "description": "Przygotowujemy propozycję instalacji, zakres prac i wycenę."
          },
          {
            "index": "03",
            "title": "Montujemy i uruchamiamy",
            "description": "Uzgadniamy termin, wykonujemy prace i pokazujemy obsługę systemu."
          }
        ]
      },
      {
        "kind": "evidence",
        "id": "sekcja-5",
        "title": "Zobacz, jak wygląda\ninstalacja w praktyce.",
        "description": "Poznaj zastosowane rozwiązania, parametry instalacji i zakres prac. Szczegóły projektu pokazują, jak podchodzimy do realizacji.",
        "blocks": []
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Czy mogę połączyć kilka usług?",
            "answer": "Rozwiązania łączymy w spójny projekt. Zakres dobieramy do potrzeb budynku i współpracy urządzeń."
          },
          {
            "question": "Czy mogę rozbudować istniejącą instalację?",
            "answer": "Sprawdzamy obecne urządzenia, warunki techniczne i planowane potrzeby. Możliwości rozbudowy ustalamy po analizie instalacji."
          },
          {
            "question": "Co przygotować do rozmowy?",
            "answer": "Informacje o budynku, obecnych urządzeniach, zużyciu energii i planowanych zmianach. Pomocne są rachunki oraz dostępna dokumentacja."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "dla-firm",
    "name": "Dla firm",
    "kind": "audience",
    "figmaNode": "2146:1845",
    "hero": {
      "eyebrow": "DLA FIRM",
      "title": "Energia dla firm.\nDopasowana do biznesu.",
      "description": "Projektujemy instalacje dla hal, magazynów, biur i obiektów usługowych. Punktem wyjścia jest profil zużycia energii, infrastruktura obiektu oraz plany Twojej firmy.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Poznaj ofertę ↓",
      "image": "technician",
      "caption": "Zdjęcie poglądowe z materiałów RPV."
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Instalacja zaczyna się\nod potrzeb Twojego biznesu.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Profil pracy obiektu",
            "description": "Uwzględniamy godziny działalności, sezonowość oraz charakter odbiorników energii."
          },
          {
            "index": "02",
            "title": "Istniejąca infrastruktura",
            "description": "Sprawdzamy możliwości montażu, przyłącze i planowane zmiany w obiekcie."
          },
          {
            "index": "03",
            "title": "Organizacja prac",
            "description": "Harmonogram i zakres robót uzgadniamy z osobami odpowiedzialnymi za obiekt."
          }
        ]
      },
      {
        "kind": "links",
        "id": "oferta",
        "title": "Usługi dla obiektów\nkomercyjnych i przemysłowych.",
        "description": "Wybierz usługę i poznaj jej zakres. Rozwiązania łączymy w spójny projekt.",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Magazyny energii",
            "description": "Przechowywanie energii oraz weryfikacja zgodności urządzeń.",
            "slug": "magazyny-energii"
          },
          {
            "index": "03",
            "title": "Pompy ciepła",
            "description": "Dobór ogrzewania do budynku, instalacji grzewczej i potrzeb użytkowników.",
            "slug": "pompy-ciepla"
          },
          {
            "index": "04",
            "title": "Klimatyzacja",
            "description": "Systemy split i multisplit dopasowane do układu pomieszczeń.",
            "slug": "klimatyzacje"
          },
          {
            "index": "05",
            "title": "Rozdzielnice i elektryka",
            "description": "Nowe instalacje, modernizacja, pomiary i uzgodniona dokumentacja.",
            "slug": "rozdzielnice-i-elektryka"
          },
          {
            "index": "06",
            "title": "Dofinansowania OZE",
            "description": "Sprawdzenie aktualnych warunków wsparcia dla planowanej inwestycji.",
            "slug": "dofinansowania-oze"
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od potrzeb do gotowej instalacji.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Analiza obiektu",
            "description": "Poznajemy zużycie energii, dokumentację i sposób działania firmy."
          },
          {
            "index": "02",
            "title": "Projekt i harmonogram",
            "description": "Uzgadniamy rozwiązanie techniczne, zakres prac oraz organizację realizacji."
          },
          {
            "index": "03",
            "title": "Realizacja i przekazanie",
            "description": "Wykonujemy instalację, uruchomienie i uzgodnioną dokumentację odbiorową."
          }
        ]
      },
      {
        "kind": "evidence",
        "id": "sekcja-5",
        "title": "Projekt to więcej\nniż same urządzenia.",
        "description": "Poznaj zastosowane rozwiązania, parametry instalacji i zakres prac. Szczegóły projektu pokazują, jak podchodzimy do realizacji.",
        "blocks": []
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Jakie dane są potrzebne do wstępnej wyceny?",
            "answer": "Dane o zużyciu energii, dokumentacja obiektu, sposób działania firmy i planowany zakres instalacji."
          },
          {
            "question": "Czy prace można dopasować do działania firmy?",
            "answer": "Harmonogram i zakres robót uzgadniamy z osobami odpowiedzialnymi za obiekt, uwzględniając organizację pracy firmy."
          },
          {
            "question": "Czy mogę połączyć PV z magazynem energii?",
            "answer": "Dobieramy rozwiązania jako jeden system, sprawdzając profil zużycia, infrastrukturę i zgodność urządzeń."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  },
  {
    "slug": "dla-inwestycji",
    "name": "Dla inwestycji",
    "kind": "audience",
    "figmaNode": "2146:1851",
    "hero": {
      "eyebrow": "DLA INWESTYCJI",
      "title": "Instalacje dla inwestycji.\nOd projektu do odbioru.",
      "description": "Obsługujemy większe projekty OZE, farmy fotowoltaiczne i inwestycje realizowane w trybie przetargowym. Uzgadniamy zakres projektowy, wykonawczy i dokumentację dla danego zadania.",
      "primaryLabel": "Darmowa wycena",
      "secondaryLabel": "Poznaj ofertę ↓",
      "image": "technician",
      "caption": "Zdjęcie poglądowe z materiałów RPV."
    },
    "sections": [
      {
        "kind": "blocks",
        "id": "sekcja-2",
        "title": "Zakres i odpowiedzialność.\nUstalone od początku.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Założenia inwestycji",
            "description": "Analizujemy dokumentację, lokalizację, warunki przyłączenia i wymagania zamawiającego."
          },
          {
            "index": "02",
            "title": "Koordynacja zakresu",
            "description": "Uzgadniamy interfejsy między instalacjami, harmonogram oraz podział odpowiedzialności."
          },
          {
            "index": "03",
            "title": "Odbiory i dokumentacja",
            "description": "Określamy wymagane próby, pomiary i dokumenty przekazywane po zakończeniu prac."
          }
        ]
      },
      {
        "kind": "links",
        "id": "oferta",
        "title": "Rozwiązania dla większych\nprojektów energetycznych.",
        "description": "Wybierz usługę i poznaj jej zakres. Rozwiązania łączymy w spójny projekt.",
        "blocks": [
          {
            "index": "01",
            "title": "Fotowoltaika",
            "description": "Energia ze słońca dla domu, obiektu firmowego lub większej inwestycji.",
            "slug": "fotowoltaika"
          },
          {
            "index": "02",
            "title": "Magazyny energii",
            "description": "Przechowywanie energii oraz weryfikacja zgodności urządzeń.",
            "slug": "magazyny-energii"
          },
          {
            "index": "03",
            "title": "Rozdzielnice i elektryka",
            "description": "Nowe instalacje, modernizacja, pomiary i uzgodniona dokumentacja.",
            "slug": "rozdzielnice-i-elektryka"
          },
          {
            "index": "04",
            "title": "Dofinansowania OZE",
            "description": "Sprawdzenie aktualnych warunków wsparcia dla planowanej inwestycji.",
            "slug": "dofinansowania-oze"
          }
        ]
      },
      {
        "kind": "process",
        "id": "proces",
        "title": "Od potrzeb do gotowej instalacji.",
        "description": "",
        "blocks": [
          {
            "index": "01",
            "title": "Rozpoznanie zadania",
            "description": "Prześlij założenia, dokumentację lub opis przedmiotu zamówienia."
          },
          {
            "index": "02",
            "title": "Uzgodnienie zakresu",
            "description": "Omawiamy wymagania techniczne, organizację prac i warunki realizacji."
          },
          {
            "index": "03",
            "title": "Wykonanie i odbiór",
            "description": "Realizujemy uzgodnione prace oraz przygotowujemy dokumentację do odbioru."
          }
        ]
      },
      {
        "kind": "evidence",
        "id": "sekcja-5",
        "title": "Jakość, którą można\nsprawdzić w dokumentacji.",
        "description": "Poznaj zastosowane rozwiązania, parametry instalacji i zakres prac. Szczegóły projektu pokazują, jak podchodzimy do realizacji.",
        "blocks": []
      },
      {
        "kind": "faq",
        "id": "faq",
        "title": "Pytania przed pierwszym krokiem.",
        "description": "Najważniejsze informacje przed rozpoczęciem współpracy.",
        "blocks": [],
        "faq": [
          {
            "question": "Czy realizujecie projekty przetargowe?",
            "answer": "Obsługujemy inwestycje realizowane w trybie przetargowym. Zakres projektowy, wykonawczy i dokumentację uzgadniamy dla konkretnego zadania."
          },
          {
            "question": "Co przesłać przy zapytaniu inwestycyjnym?",
            "answer": "Założenia inwestycji, dostępną dokumentację, lokalizację, planowany zakres i wymagania dotyczące harmonogramu."
          },
          {
            "question": "Czy zakres obejmuje projekt i wykonanie?",
            "answer": "Zakres projektowy, wykonawczy oraz dokumentację odbiorową ustalamy dla danej inwestycji przed rozpoczęciem współpracy."
          }
        ]
      },
      {
        "kind": "cta",
        "id": "wycena",
        "title": "Porozmawiajmy\no Twojej instalacji.",
        "description": "Opowiedz nam o budynku i potrzebach. Uzgodnimy zakres prac i przygotujemy indywidualną wycenę.",
        "blocks": [],
        "primaryLabel": "Darmowa wycena"
      }
    ]
  }
] satisfies OfferPageData[];
