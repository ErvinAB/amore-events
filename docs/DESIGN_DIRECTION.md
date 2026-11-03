# Design Direction — V0.25 (provisional)

**Selected: B. Modern Gift Atelier.** Explorations live at `/design-lab/a|b|c` (dev only; 404 in production unless `DESIGN_LAB=1`). Screenshots are in `docs/design/{before,concepts,after}/`.

Why B: its asymmetric category hierarchy suits a mixed catalogue, plum is reserved for actions, and the gift tag has a job. A (Editorial Minimalism) was refined but cold, with category thumbnails too small to sell the range. C (Contemporary Artisan) was warm but its italics leaned craft/wedding, and "studio" copy would imply a handmade claim we can't make.

References: Not On The High Street was readable. Tiffany and Monica Vinader returned 403, and Uncommon Goods returned no content, so those weren't inspected this round.

## Principles
- Products are the hero; the type is quiet, with sentence case and no all-caps eyebrows.
- **Plum (`ribbon`) only for primary actions and small emphasis.** Taupe is for lines and dots, never text.
- **Gift tag = "this can be personalised"**, nothing else.
- No text over images. No gradients, glass or stacked shadows.
- Show only configured facts (COD, free-delivery threshold, delivery text, phone).

## Tokens (`src/app/globals.css`)
ivory `#F7F3ED` (page) · surface `#FFFDF9` · blush `#E9D9D4` (image wells, trust band) · plum `#763F50` · taupe `#B79A7F` · charcoal `#252321` (also the one dark band) · muted `#6B625C` · on-ink `#F7F3ED` / on-ink-muted `#C8BDB4`. Type: Spectral 400 (display 44/72px), Onest UI. Radii: image 4px, control 8px, buttons pill.

## Photography brief (for the owners)
- **Product:** 4:5, at least 1600×2000, neutral light background (ivory/blush/stone), soft daylight, product filling ~60% of the frame. Shots: front, detail (engraving/texture), scale/in-hand, packaging.
- **Lifestyle:** 4:5 and 4:3, natural light, hands and homes, no faces required.
- **Hero:** portrait 4:5, at least 1500×1875, subject in the middle third (the same crop is used on phones and desktop).
- **Category:** 4:5 per category, one clear object, consistent background family.

## Before → after (homepage)
| | Before (V0.2) | After (V0.25 Stage C) |
|---|---|---|
| Hero | Text on a blush band, no image | Split hero, art-directed image (tall on mobile, wide on desktop), plum CTA + secondary link |
| Categories | Five text pills | Mosaic: owners' first category leads, four image tiles, names under images |
| Products | One card, generic | Refined card: 4:5 blush well, gift tag on personalisable items, sale and sold-out states |
| Story | None | Three-step personalisation sequence |
| Trust | Footer line only | COD strip in header + trust row using configured facts only |
| Footer | Links | Adds language switcher; lighter surface |

## Revision 2: stock photos + stronger layout (2026-11-03)
The owners said the first pass looked flat. With real photos in place, the causes were clear: every section was the same pale tone, the hero image was a small box, the lead category tile was half the page, and three featured products left an empty fourth column.

- **Photos:** 10 CC0 (public domain) photos from the WordPress Photo Directory replace the generated art, with one gentle shared colour grade. Sources and photographers are in `public/dev-imagery/CREDITS.md`. To regenerate, run `scripts/dev-imagery/fetch-stock.py`, then `seed-dev.mjs --refresh-images`. Owners replace them by uploading their own (product images in admin; hero/story in `src/config/home.ts` for now).
- **Tonal rhythm:** light hero, categories and products, then the one dark charcoal band (personalisation story), a blush trust band, and the lighter footer.
- **Hero:** the photo fills the right column edge to edge at 84% of the viewport height. The display type is 72px on desktop and set to two lines.
- **Categories:** three columns on desktop (a tall lead tile beside a 2×2), instead of a lead tile taking half the page.
- **Featured:** columns follow the product count (no empty slot), with an "All gifts" link. Phones get a swipeable row.
- **Trust:** line icons, larger titles, a blush band.
- **Product page:** the delivery fee and free-delivery threshold are shown next to the buy button (from settings).

### Benchmarks we design against
| Metric / guideline | Target | Source | Where it applies |
|---|---|---|---|
| Unexpected extra costs are the top cart-abandonment reason (~40–48% of abandoners) | Show the full delivery cost before the bag | Baymard abandonment survey | Product page delivery line, header strip, trust band |
| 67% of sites don't show the lowest full order cost near "Add to bag" | Fee + threshold beside the buy button | Baymard product-page benchmark | Product page ✅ |
| Feature ≥ 40% of product types on the homepage | All categories shown with photos | Baymard homepage | Category mosaic ✅ |
| Unclear hit areas (43% of sites) | Whole tile is one link, hover state | Baymard homepage | Cards and tiles ✅ |
| Avoid carousels / aggressive promos | No auto-rotating hero, no pop-ups | Baymard homepage | Hero ✅ |
| Bespoke imagery beats stock | Owners' own photos before launch | Baymard homepage | **Owner action** |
| Return policy linked on product page + footer (60% look for it) | Real policy text | Baymard product page | **Owner input needed**: no policy exists yet; we won't invent one |
| Gifting options on the product page | Personalisation lives there | Baymard product page | Product page ✅ |
| Obvious search | Visible search field | Baymard homepage | Not built: small catalogue; revisit at ~30+ products |
| LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 | Core Web Vitals "good" | web.dev | Hero image is `priority`, sized, no layout shift |
| Text contrast ≥ 4.5:1 | WCAG 2.2 AA | W3C | Muted 5.5:1 on ivory; on-ink-muted 8.9:1 on charcoal |
| Touch targets ≥ 24px (we use 48px) | WCAG 2.5.8 | W3C | Buttons and links `min-h-touch` |
| Line length 45–75 characters | Readability | Bringhurst | Body copy capped at 40–44ch |

## Status
- Stage C (homepage) revised after owner feedback (revision 2).
- Stage D (shop, product, bag, checkout, success) not started. The new product card and tokens already apply sitewide.
- Current imagery is CC0 stock photography (stand-ins); see `public/dev-imagery/CREDITS.md`.
