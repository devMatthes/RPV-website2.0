# RPV service-card product artwork

Five illustrative, unbranded product photographs generated with the built-in Image Gen tool for the approved bento direction. These are visual examples of equipment categories, not a claim that a particular manufacturer/model is supplied.

Approved visual target: the final arrow-free concept with the complete, angled heat pump (`exec-f4c26c9f-51be-49a9-a220-c5a9e9748414.png`, 1536 × 1024).

## Asset prompts / art direction

All five generation briefs use that image as the actual visual reference, photoreal materials, cool-neutral restrained studio lighting, transparent backgrounds, no UI, no lettering/brands, no added room, podium, plants or glowing effects.

- `solar-panel.webp`: large black monocrystalline photovoltaic module, fine cell texture and silver anodized frame, leaning three-quarter perspective matching the central blue card. Portrait silhouette for intentional side/bottom cropping.
- `heat-pump.webp`: silver outdoor air-to-water heat pump, round black fan grille, right side visible in three-quarter view; complete lower edge, base and feet must remain visible. Landscape composition to fit below the description and above the CTA.
- `battery-storage.webp`: slim white/silver home battery cabinet with rounded edges, subtle panel seam and narrow black status strip; quiet green indicators, slight right-side perspective. Portrait equipment silhouette.
- `air-conditioner.webp`: white indoor split AC, slim body, visible lower vents, photographed slightly from below at an angle matching the reference. Wide landscape silhouette for a right-edge crop.
- `electrical-panel.webp`: photoreal white DIN circuit breakers, neat blue wiring and gray metal enclosure, slight perspective, portrait close-up for a narrow right-edge detail crop.

`scripts/prepare-service-art.mjs` removes unused transparent padding and optimizes alpha WebP without altering device proportions. Full generated PNGs are preserved locally under the ignored `outputs/bento/source-art/` folder. Astro generates responsive WebP derivatives for the browser.

Rendered by `src/components/home/Services.astro`; visible headings, descriptions and links remain HTML, not part of an image.
