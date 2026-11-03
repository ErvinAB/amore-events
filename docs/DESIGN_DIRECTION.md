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
ivory `#F7F3ED` (page) · surface `#FFFDF9` · blush `#E9D9D4` (image wells) · plum `#763F50` · taupe `#B79A7F` · charcoal `#252321` · muted `#6B625C`. Type: Spectral 400 (display 40/60px), Onest UI. Radii: image 4px, control 8px, buttons pill.

## Photography brief (for the owners)
- **Product:** 4:5, at least 1600×2000, neutral light background (ivory/blush/stone), soft daylight, product filling ~60% of the frame. Shots: front, detail (engraving/texture), scale/in-hand, packaging.
- **Lifestyle:** 4:5 and 4:3, natural light, hands and homes, no faces required.
- **Hero:** one scene shot both wide (≥2400×1500, 16:10) and tall (≥1500×1875, 4:5), with calm space on the left for the desktop crop.
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

## Status
- Stage C (homepage) implemented and awaiting review.
- Stage D (shop, product, bag, checkout, success) not started. The new product card and tokens already apply sitewide.
- Current imagery is generated placeholder art stamped "SAMPLE IMAGE".
