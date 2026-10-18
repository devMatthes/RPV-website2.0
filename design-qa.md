# QA — RPV service bento

Date: 2026-10-18. Scope: `src/components/home/Services.astro`, shared by the landing page and service index. Other landing sections, backend, configuration and Figma file are unchanged.

## Visual truth and implementation

- Approved source: `/Users/mateuszjaciubek/.codex/generated_images/01a10cc2-2dc2-75e3-a5db-75a93f1bad05/exec-f4c26c9f-51be-49a9-a220-c5a9e9748414.png` — 1536 × 1024, arrow-free, full angled heat pump.
- Production preview: `http://127.0.0.1:4322/#uslugi`.
- Browser: Codex in-app browser; desktop viewport 1536 × 1024 CSS pixels, tablet 834 × 1112, mobile 390 × 844.
- Desktop evidence: `outputs/bento/desktop-production.png` (1536 × 1024).
- Mobile evidence: `outputs/bento/mobile-production.png` (342-pixel-wide section crop from a 390-pixel CSS viewport).
- Tablet evidence: `outputs/bento/tablet-production.png` (834 × 1112).
- State: default, no open menus/cookie modal; keyboard state checked separately. Browser screenshots normalized to PNG, not stretched.

## Full-view and focused comparison

- Initial side-by-side: `outputs/bento/comparison-initial.png`.
- Final side-by-side: `outputs/bento/comparison-production.png`. Source grid crop (1480 × 835) and implementation grid crop (1280 × 760) are independently downsampled to the same 640-pixel width, preserving each aspect ratio. The different heights remain visible rather than being warped to manufacture a match.
- Focused heat-pump comparison: `outputs/bento/pump-comparison.png`; verifies three-quarter perspective, full bottom edge and visible feet.
- Mobile and tablet are responsive adaptations: the source only specified desktop, so they are checked for retained hierarchy, readable copy, image framing, usable navigation and no horizontal overflow rather than against an invented mobile reference.

## Required fidelity surfaces

- **Typography:** existing locally hosted Plus Jakarta Sans; 48px desktop section heading, 24–38px service titles, 15–16px descriptions, 14px offer labels. Titles remain HTML and CMS descriptions remain editable. All nine tested viewport widths retain complete title glyph bounds and descriptions above the actions.
- **Spacing/layout:** original site's 1280px content maximum retained. Three-column asymmetrical bento with tall central PV card, two left cards and three right cards. 24px desktop gutters, existing 16px card radius, 28px internal padding. Mobile is a content-led single column, not a set of desktop-height cards; tablet uses two columns.
- **Colors/tokens:** black page, quiet charcoal surfaces, blue PV highlight, white quote pill. CSS resolves the PV surface to `rgb(9, 142, 236)`; the mock's photographic lighting/gradient and screenshot color rendering are not reproduced as CSS effects. Existing site-wide color/font tokens remain unchanged.
- **Image quality:** five individual generated, unbranded product photographs, real alpha transparency, consistent restrained lighting, optimized WebP and responsive Astro derivatives. No screenshot used as the UI, no wireframe/CSS/SVG product substitute. Heat pump remains whole; PV, battery, AC and switchgear use intentional edge crops.
- **Copy/content:** service names and CMS descriptions preserved, section heading updated to the chosen concept. Repeated categories/numbers/checklist removed. Five “Zobacz ofertę” labels, one “Sprawdź dofinansowania”, one separate PV “Darmowa wycena”; no arrows in the service grid. Hardware is illustrative, not a representation of a verified specific model.

## Comparison history

1. **Initial: blocked — P2 asset scale.** Initial capture (`outputs/bento/desktop-initial.png`) showed undersized heat pump and AC because of transparent canvas padding; the switchgear crop emphasized the enclosure rather than the equipment. Fix: normalize transparent bounds while preserving product proportions, increase AC scale, reposition the electrical macro. Originals retained in `outputs/bento/source-art/`.
2. **Responsive correction: P2 internal PV crop.** `outputs/bento/mobile-initial.png` showed a hard horizontal image-slot cutoff above the quote button. Fix: let the image continue behind the actions and clip at the outer card only. Post-fix: `outputs/bento/mobile-production.png`.
3. **Final production comparison:** `outputs/bento/comparison-production.png`, `outputs/bento/pump-comparison.png`, final mobile/tablet captures. No actionable P0/P1/P2 findings remain.

## Interactions and responsive verification

- All six whole-card links clicked in the browser; verified the corresponding `/uslugi/{slug}/` routes.
- Separate PV quote link navigates to `/kontakt/`, not the service detail.
- Tab moves from the PV card to its quote action; Shift+Tab returns to the full-card link with visible outline; Enter opens PV details.
- Full-card links have names from their headings and descriptions from their body copy; product photos are decorative to avoid duplicate screen-reader content. No nested anchors or scripted click-only navigation.
- Tested widths: 320, 390, 699, 700, 834, 1099, 1100, 1280, 1536. No horizontal document overflow, clipped title glyphs, or description/action collisions.
- Evidence: `outputs/bento/browser-checks.json`.
- Production: all five images loaded; no browser console errors.
- `npm run check`: 0 errors, 0 warnings.
- `npm run build`: success, 72 pages.
- `npm test`: 32 passing tests, 0 failures (including two new bento regression checks).
- `git diff --check`: passed. No commit/push/deployment performed; no environment/secret files read or changed.

## Expected adaptations / P3 follow-up

- Product images are separately generated illustrations of the same equipment categories, not identical manufacturer models from the mock. The selected composition is preserved, but it is not a pixel-identical raster reproduction.
- The existing site's container width and CMS copy are retained, so some line breaks and proportions differ slightly from the wider image concept. The hardware and optional lighting nuance can be refined further without blocking this implementation.
- Forms/backend flows were not modified or resubmitted during this scoped UI task.

## Implementation checklist

- [x] Five optimized product assets placed in real HTML cards.
- [x] Full pump silhouette and arrow-free actions.
- [x] Desktop/tablet/mobile layout and keyboard navigation verified.
- [x] Source/implementation comparisons and production screenshots saved.
- [x] Build, type check and tests pass.

final result: passed
