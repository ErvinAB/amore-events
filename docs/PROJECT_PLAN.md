# Project Plan — Gift Store (working name, brand TBC)

Status: **V0.1 complete (2026-11-03), awaiting review. V0.2 not started.**
Last updated: 2026-11-03

---

## 0. Current state (Phase 0 findings)

- **Repository:** empty. `main` has no commits; only `.git` and `.remember/` exist.
- **Tooling on this machine:** Node 23.5, npm 10.9, Vercel CLI installed. Supabase CLI not installed (usable via `npx supabase`). Docker installed but the daemon is not running (needed only for a local Supabase stack and DB tests).
- **Current stable versions (checked 2026-11-02):** next 16.4.4, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0, tailwindcss 4.3.4, zod 4.6.7, vitest 5.1.0, @playwright/test 1.64.1.
- **Claude Code skills:** none of the five requested skills are installed. Install at project level (see §11).

### Platform facts that shape the code (from current official docs)

| Topic | Current practice | Old-tutorial pattern to avoid |
|---|---|---|
| Request interception | `proxy.ts` exporting `proxy()` (Node runtime) | `middleware.ts` (deprecated in Next 16) |
| Route params | `await params`, `await searchParams`, `await cookies()` | sync access (removed) |
| Caching | Opt-in: `cacheComponents: true`, `'use cache'`, `cacheTag()`; `updateTag()` in Server Actions for read-your-writes | implicit fetch caching; single-argument `revalidateTag(tag)` |
| Supabase SSR | `@supabase/ssr` `createServerClient` / `createBrowserClient` with `getAll`/`setAll` cookies | `@supabase/auth-helpers-nextjs`; per-cookie `get/set/remove` |
| Supabase keys | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`), server-only `SUPABASE_SECRET_KEY` (`sb_secret_…`) | `anon` / `service_role` JWT keys (legacy) |
| Server auth checks | `supabase.auth.getClaims()` (verifies the JWT) | `getSession()` on the server (spoofable) |
| Linting | ESLint CLI directly (`next lint` removed) | `next lint` |
| Images | `images.remotePatterns`; default quality is 75 only | `images.domains` |

### Reference-store research — principles extracted (not copied)

Notes: Not On The High Street and Mejuri were fetched directly. Monica Vinader returned 403 and Uncommon Goods returned no content, so notes on them (and on Tiffany) come from general knowledge of those sites. I'll recheck them in a real browser before the V0.4 visual pass.

- **Monica Vinader / Tiffany — personalisation as the gift.** Engraving gets its own clearly framed step with a calm heading, a short reason to do it, a character limit you can see, and a preview of the text. It reads as part of the gift, not as form admin. Lesson: one titled "Make it yours" block, a live text preview, and reassurance next to the fields.
- **Mejuri — editorial restraint.** Few navigation items, large portrait images, a lot of white space, small uppercase labels, short copy, and product cards that are mostly photo. Lesson: let photography carry the page. Cards show only image, name and price.
- **Not On The High Street — gift discovery by several routes.** The same products appear by department, recipient, occasion, price band and theme. Cards carry a "Personalised" cue. Lesson: products need **many-to-many** groupings from day one. Recipient and occasion are just more groupings. Badges should be used sparingly (they over-badge).
- **Uncommon Goods — "who is it for?"** Discovery starts from the recipient or occasion as well as the product type. Lesson: plan homepage "Shop by occasion/recipient" rows for V0.4, once real groupings exist.

---

## 1. Decisions needed from the business (blocking or near-blocking)

| # | Question | Answer / status |
|---|---|---|
| D1 | Storefront languages | **Decided:** English (**default, canonical**), Macedonian, Albanian. Product content is translated too. See §2a. |
| D2 | Currency | **Decided:** `MKD` default, configurable in `store_settings`. Display locale and currency are separate (the English store still shows MKD). |
| D3 | Options with their own price or stock? | **Not sure yet.** Start without a variants table. `order_items.variant_label` exists so variants can be added later. |
| D4 | Supabase setup | **Decided:** cloud project. Free tier for development. **Pro before real launch.** PITR is a paid add-on on top of Pro and is optional, not assumed. |
| D4b | Admin panel language | **Decided:** Macedonian only for V0.1. All admin strings live in `src/messages/admin/mk.ts`, not inline, so more languages can be added later. Independent of the storefront default. |
| D5 | **Do you phone customers to confirm COD orders?** | Open. Affects copy only. |
| D6 | New-order notification | **Decided:** email to owners in **V0.2**, sent only after the order commits (§8). Provider chosen when V0.2 starts. |
| D8 | Product photography | Temporary images until real photos exist. The storefront visual design is **not final** until real photography is in. Layouts must not be tuned to placeholder images. |
| D7 | Brand name, logo, colours, contact details, socials, delivery fee/areas, policies | All configurable placeholders until supplied. | Nothing |

---

## 2. Architecture

One Next.js 16 App Router application deployed on Vercel, with Supabase for Postgres, Auth and Storage. No separate API, no microservices, no Redux, no ORM.

```
Browser ──► Next.js (Vercel)
             ├─ Server Components: read catalogue (cached, cookie-less public client)
             ├─ Server Actions: checkout, admin mutations (validated with Zod)
             ├─ proxy.ts: refresh Supabase session; bounce anonymous users from /admin
             └─ server-only modules: secret-key client (only used for checkout → place_order)
                    │
                    ▼
           Supabase: Postgres (RLS on every table) · Auth (admins only) · Storage (product-images)
```

- **Catalogue reads** use a cookie-less Supabase client with the publishable key, wrapped in `'use cache'` + `cacheTag('catalog')`. Pages become static/prerendered and fast for social-media traffic. Admin mutations call `updateTag('catalog')`. If Cache Components causes friction, the fallback is plain dynamic rendering plus `revalidatePath`.
- **Admin pages** are dynamic and use the cookie-based server client, so RLS sees the admin's JWT.
- **Checkout** (V0.2) is a Server Action, the only boundary the browser talks to. It runs: Zod validation → honeypot and form-timing check → IP and phone rate limits plus duplicate detection → `place_order()` via the **server-only secret-key client** (one transaction) → after commit, owner email (best effort) → sanitized confirmation. The browser never calls the database function directly; anon/authenticated have no EXECUTE on it.
- **Libraries (V0.1):** next, react, tailwindcss, @supabase/ssr, @supabase/supabase-js, zod, server-only. Dev: typescript, eslint, vitest, @playwright/test, supabase (CLI). Nothing else until needed.

### 2a. Internationalisation (decided 2026-11-03)

- **Locales:** `en` (**default and canonical**), `mk`, `sq`. **Implementation (changed in V0.1):** Next's built-in pattern (`app/[locale]` root segment, `next/root-params`, JSON dictionaries), not next-intl. It needs no dependency and is built for Cache Components, which are on by default in Next 16.4. One `src/i18n/routing.ts` defines `locales` and `defaultLocale = 'en'`. Navigation, metadata, redirects, fallback, sitemap, Open Graph and canonical URLs all read from it, and nothing else may assume a default.
- **Routing:** every storefront URL is prefixed: `/en/…`, `/mk/…`, `/sq/…`. Bare `/` and unprefixed paths redirect: saved locale cookie → `Accept-Language` → `en`. `/admin` is **not** localised.
- **SEO:** each page's canonical is its own locale URL. `alternates.languages` lists en/mk/sq plus `x-default` → `/en/…`. The sitemap emits every locale URL with alternates. `og:locale` is per page (`en_US`, `mk_MK`, `sq_AL`).
- **One stable Latin slug per product/category**, shared across all locale routes.
- **Translated content** is `jsonb` `{"en": "...", "mk": "...", "sq": "..."}`, only for customer-facing text (names, descriptions, alt text, personalisation labels/help/placeholder/option labels). A check constraint requires non-empty `en`. Missing `mk`/`sq` fall back to **English**, via a single helper `t(map, locale)`. SKU, price, stock, status, IDs, timestamps and other business data are plain columns, never JSON.
- **Select options:** `[{ "value": "gold", "label": {"en": "Gold", "mk": "Злато", "sq": "Ari"} }]`. Carts and orders store the value. Snapshots store value and label.
- **Orders** store `locale`. `order_items.product_name` is a `jsonb` snapshot of all translations.
- **Fonts** must cover Cyrillic and Latin Extended (Albanian ë, ç): *Literata* (display) + *Onest* (UI), both via `next/font`.
- **Strings:** storefront in `src/messages/{en,mk,sq}.json` (next-intl), with `en` the complete source and others falling back to `en`. Admin strings are a separate module (D4b).
- **Money:** `formatMoney(minor, { currency, locale })` takes the *display* locale and the *store* currency. **It does not use `Intl.NumberFormat`.** Chrome ships without Macedonian/Albanian number data and silently falls back to English, so server and browser printed different prices. The formatter is deterministic and follows CLDR conventions (`MKD 1,290.50` / `1.290,50 ден.` / `1290,50 den`). Never hard-code a symbol in components.

---

## 3. Data model (initial)

Fields marked `(i18n)` are `jsonb` locale maps (see §2a): category name/description, product name/short_description/description, image alt_text, personalisation label/placeholder/help_text/option labels.

Money is stored as **integer minor units** (`*_minor`, e.g. 2000 = €20.00) and displayed with `Intl.NumberFormat(store.locale, { style: 'currency', currency })`.

```sql
-- enums
product_status   : draft | active | archived
field_type       : text | textarea | select | date
order_status     : new | confirmed | in_production | ready | shipped | delivered | cancelled
payment_status   : unpaid | paid | cancelled
payment_method   : cash_on_delivery

store_settings (single row: id boolean pk default true check (id))
  store_name, currency_code char(3), locale, delivery_fee_minor int ≥0,
  free_delivery_threshold_minor int null, delivery_estimate_text,
  support_phone, support_email, business_address,
  instagram_url, facebook_url, tiktok_url, whatsapp_number, updated_at

admin_users
  user_id uuid pk → auth.users, role text check in ('owner','staff'), created_at

categories
  id, name, slug unique, description, image_path, sort_order, is_active, created_at, updated_at

products
  id, slug unique, name, short_description, description,
  price_minor int ≥0, sale_price_minor int null (check < price_minor),
  sku text unique null, stock int ≥0, status product_status default 'draft',
  is_featured bool, is_new bool, created_at, updated_at
  -- "personalisable" is derived (has ≥1 field), so it can never contradict the fields

product_categories (product_id, category_id) pk both   -- many-to-many
product_images
  id, product_id → products on delete cascade, storage_path, alt_text,
  width, height, sort_order        -- main image = lowest sort_order (one source of truth)

personalization_fields
  id, product_id → products on delete cascade, label, type field_type,
  required bool, placeholder, help_text, max_length int null,
  options jsonb null (array of strings, required when type='select'),
  sort_order, created_at

orders
  id uuid pk, order_number text unique,           -- ORD-2026-000142
  status order_status default 'new', payment_method default 'cash_on_delivery',
  payment_status default 'unpaid',
  first_name, last_name, phone, email null, street_address, city, postal_code null,
  delivery_notes, order_notes,
  currency_code, subtotal_minor, delivery_fee_minor, total_minor,  -- snapshots
  stock_restored_at timestamptz null,             -- idempotent restock guard
  created_at, updated_at

order_items  (immutable snapshot)
  id, order_id → orders on delete cascade, product_id → products on delete restrict (nullable),
  product_name, sku, variant_label null, image_path,
  unit_price_minor, quantity int >0, line_total_minor,
  personalization jsonb   -- [{field_id, label, type, value}] as shown at purchase
```

Indexes: `products(status)`, `products(is_featured) where status='active'`, `product_categories(category_id)`, `product_images(product_id, sort_order)`, `personalization_fields(product_id, sort_order)`, `orders(created_at desc)`, `orders(status)`, `order_items(order_id)`, plus an index on every foreign key.

**Gift discovery later:** recipient/occasion/edit pages get a `kind` column on `categories` (`product | recipient | occasion | edit`) in a one-line migration. Many-to-many already supports it. "Under €X", "New" and "Best sellers" are queries, not tables.

**Deliberately not created:** customers, discounts, reviews, collections, payments, variants (pending D3), order event history (reconsider in V0.3).

---

## 4. Security model (RLS)

RLS is enabled on **every** table in the migration that creates it. Admin checks go through one function:

```sql
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
```

| Table | anon / public | admin | notes |
|---|---|---|---|
| store_settings | select | update | contains only public business info |
| categories | select where `is_active` | all | |
| products | select where `status='active'` | all | no hard delete in UI; archive instead |
| product_categories, product_images, personalization_fields | select where parent product is active | all | |
| orders, order_items | **none** | select, update (status/payment fields only, via functions) | inserts only through `place_order()` |
| admin_users | select own row | none via API | managed by SQL/seed script |

- **Function privileges (explicit, every function):** Postgres grants EXECUTE to `PUBLIC` by default, so every migration that creates a function does `revoke execute … from public, anon, authenticated` and then grants only what's needed.
  - `place_order()`: `security definer`, `set search_path = ''`, fully qualified relations, **EXECUTE granted to `service_role` only**. Called only from the checkout Server Action through the server-only secret-key client.
  - `cancel_order()` / status functions: `security invoker` where RLS suffices. If definer is needed, they check `is_admin()` first. EXECUTE to `authenticated` only.
  - `is_admin()`: `security definer`, empty `search_path`, EXECUTE to `authenticated` (and `anon`, returning false, because it is used inside public-table policies).
  - Trigger functions: never granted to API roles.
- **Storage:** `product-images` bucket, public read. Upload/update/delete only when `is_admin()`. The bucket allows `image/jpeg, image/png, image/webp, image/avif` up to 5 MB. Paths look like `products/{product_id}/{uuid}.{ext}` and are never built from user input.
- **Secrets:** `SUPABASE_SECRET_KEY` is server-only (never `NEXT_PUBLIC_`). The module that reads it imports `server-only`, so a client import fails the build.
- **Anti-abuse for COD (V0.2, practical, no fingerprinting, no SMS):**
  - server-side Zod validation, including phone format
  - hidden honeypot field
  - form-timing check: reject submissions faster than ~3 s after the checkout form rendered (signed timestamp issued server-side)
  - conservative rate limits in a `checkout_attempts` table (service-role only, no API policies) keyed by **HMAC-hashed** IP and normalised phone. Example: ≤ 10 attempts per IP per hour, ≤ 3 orders per phone per 24 h. Rows older than 7 days are purged.
  - duplicate detection: the same phone + same cart contents within 10 minutes returns the existing confirmation instead of creating a second order
  - If abuse happens in production, add phone verification later.
- Before launch: `get_advisors` security and performance checks, then a manual policy review.

---

## 5. Admin authentication

1. Supabase Auth with **email + password**. Public sign-ups are **disabled** in project settings. Owners are invited, and a seed SQL script adds their `user_id` to `admin_users`. Documented in README.
2. `proxy.ts` refreshes the session on `/admin/*`. With no valid claims it redirects to `/admin/login`. This is a convenience only, not the security boundary.
3. `requireAdmin()` (server-only helper) runs `getClaims()` plus an `admin_users` lookup. It is called in the admin layout **and at the top of every admin Server Action**, because Server Actions are separately reachable endpoints.
4. RLS (`is_admin()`) is the final gate. A signed-in non-admin can read and write nothing extra.

---

## 6. Cart persistence

- **localStorage**, versioned (`cart:v1`). Each line stores only `{ lineId, productId, quantity, personalization: { [fieldId]: value } }`. No prices.
- `lineId` = stable hash of `productId + sorted personalization values`. Same product with different engraving gives separate lines. Identical configuration merges quantities.
- Cart page and drawer call a server function `quoteCart(lines)`. It returns authoritative names, images, prices, stock and per-line problems ("no longer available", "only 2 left", "personalisation changed").
- Client state is a small `useSyncExternalStore` store (no context explosion, no Redux) with a hydration-safe badge count.
- Why not cookies or a DB cart: cookies are too small for personalisation text, and DB carts need anonymous identity plus cleanup. Accepted trade-off: the cart doesn't follow the customer across devices.

---

## 7. Personalisation model

- Configuration is stored entirely as `personalization_fields` rows per product. The admin edits them in a simple repeating list (label, type, required, max length, options, help text) with up/down ordering.
- The product page renders the fields from data via one `<PersonalizationFields>` component that switches on `type`. Nothing is hard-coded.
- **One validator, two places:** `buildPersonalizationSchema(fields)` creates a Zod schema used client-side (inline errors) and server-side (checkout). `place_order()` re-checks integrity in SQL: the field belongs to the product, required fields are present, length ≤ max, and select values are in the options list. So the database can never store invalid personalisation, even if the app has a bug.
- Values are trimmed, control characters are stripped, length is capped (hard ceiling 500 for textarea), and everything is rendered as text, never HTML.
- UX: a "Make it yours" block with a short line of context, character counters, a plain-text live preview of the engraving (no fake product render), and help text from the admin.

---

## 8. Order creation and inventory

`place_order(payload jsonb)` runs as **one transaction**. Any failure rolls everything back, so half-created orders can't exist.

1. The Server Action validates the customer and cart shape with Zod (friendly errors).
2. In SQL: lock referenced products `FOR UPDATE` **in id order** (avoids deadlocks).
3. Reject if any product is missing or not `active`.
4. Validate personalisation against current field config.
5. Price per line = `coalesce(sale_price_minor, price_minor)` from the DB. Browser prices are ignored completely.
6. Subtotal, delivery fee (from `store_settings`, free above threshold if set) and total are computed in SQL.
7. Stock: `update products set stock = stock - qty where id = … and stock >= qty`. If no row is updated → raise `OUT_OF_STOCK` (the transaction aborts).
8. Insert the order with `order_number = 'ORD-' || year || '-' || lpad(nextval('order_number_seq'), 6, '0')`. A sequence is concurrency-safe. Gaps are acceptable and documented.
9. Insert `order_items` snapshots (name, SKU, price, image path, personalisation labels and values).
10. Return a **sanitized confirmation** only: `{ order_number, total_minor, currency_code }`. The Server Action puts it in a short-lived, httpOnly, signed cookie and redirects to `/[locale]/order-success`, which reads only that cookie. There is no order-lookup endpoint, nothing keyed by sequential order number, and the public has no read access to orders. If detailed lookup is needed later: an unguessable token plus a tightly scoped server-side query.
11. **After commit:** send the owner notification email (V0.2). It is best effort: a failure is logged and never rolls back, duplicates or invalidates the order. The admin dashboard is the source of truth.

**Inventory policy (V1):** stock decreases when an order is created. `cancel_order()` sets `status='cancelled'`, `payment_status='cancelled'` and restores stock **only** in the same statement that sets `stock_restored_at` from NULL. A second cancel therefore restores nothing. Cancelled orders can't be reopened in V1, because reopening would need stock re-checked. Admins can edit stock directly for returns.

**Status workflow:** `new → confirmed → in_production → ready → shipped → delivered`. `cancelled` is allowed from any state before `delivered`. Payment is separate: admins mark `paid` explicitly, and delivery never auto-marks paid.

---

## 9. Design direction (provisional — final brand TBC)

**Idea: "a handwritten note in a well-made box."** Warm paper tones, one deep accent, an editorial serif for emotion, a quiet sans for clarity, square-ish edges, and photography given room. No gradients, glass, blobs, stat cards or shadow stacks.

- **Type:** display serif *Literata* + UI sans *Onest*, both via `next/font`, Cyrillic + Latin Extended subsets. Scale (mobile → desktop): display 36→56, h1 30→44, h2 24→32, h3 20→24, body 16, small 14, label 12 uppercase with +0.08em tracking.
- **Colour tokens (provisional):** `paper #F8F4EF`, `surface #FFFFFF`, `ink #2B2522`, `ink-muted #6B615B`, `line #E6DDD4`, `accent #7B2D3B` (claret, used sparingly for CTAs/links), `accent-ink #FFFFFF`, `success #3F6B4E`, `error #A3312A`, `focus` = 2px accent outline + 2px offset.
- **Shape and space:** radius 2px (inputs, buttons) and 0 for images. 1px `line` borders instead of shadows. A 4px spacing base. Content widths: prose 640, product 1200, wide 1440. Gutters 16 on mobile, 32 on desktop.
- **Components:** primary button (solid ink or accent, 48px tall, sentence case), secondary (outline), text link. Inputs 48px with visible labels above. Product card = 4:5 image, name, price (sale shown as price + struck original), at most one small "Personalisable" label.
- **Mobile-first product page:** gallery (swipe, dots) → name, price, short pitch → "Make it yours" → quantity + full-width Add to bag → delivery and COD reassurance → description. On mobile a sticky bottom bar with price and Add to bag appears once the main button scrolls out of view.
- Tokens live in Tailwind v4 `@theme` in `globals.css`. Brand and business info live in `store_settings` plus `src/config/site.ts` for build-time defaults.

---

## 10. Folder structure

```
src/
  app/
    (store)/                      layout with header/footer
      page.tsx                    home
      shop/ category/[slug]/ product/[slug]/ cart/ checkout/ order-success/
      about/ contact/ (legal)/privacy|terms|delivery|returns
    admin/
      login/
      (protected)/                layout calls requireAdmin()
        page.tsx                  dashboard
        products/ products/new/ products/[id]/ categories/ orders/ orders/[id]/ settings/
    sitemap.ts robots.ts
  components/
    ui/                           Button, Input, Field, Select, Price … (small, token-based)
    store/                        ProductCard, Gallery, PersonalizationFields, CartDrawer …
    admin/                        ImageManager, FieldEditor, StatusControl …
  lib/
    supabase/ server.ts browser.ts public.ts admin.ts(server-only, secret key)
    auth/require-admin.ts
    catalog/ queries.ts           cached reads
    cart/ store.ts line-id.ts
    orders/ actions.ts
    validation/ checkout.ts product.ts personalization.ts
    money.ts
  config/site.ts
  proxy.ts
supabase/
  migrations/                     timestamped SQL: schema, RLS, functions, storage
  seed.sql                        dev data (clearly fake), store_settings placeholders
  tests/                          pgTAP: RLS + place_order + cancel_order
tests/
  unit/                           vitest
  e2e/                            playwright
docs/PROJECT_PLAN.md
```

---

## 11. Skills to install (project level)

```bash
npx skills add anthropics/skills --skill frontend-design -a claude-code
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a claude-code
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code
npx skills add supabase/agent-skills --skill supabase -a claude-code
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices -a claude-code
```

---

## 12. Testing strategy

- **Vitest (unit):** money formatting, line-id hashing and merging, personalisation schema builder, checkout schema, delivery fee rule.
- **pgTAP via `supabase test db` (needs Docker):** anon can't read orders, items or draft products; a signed-in non-admin can't mutate; `place_order` ignores browser prices, rejects inactive/unknown products and out-of-stock items, rejects bad personalisation, snapshots survive product rename/price change, stock decrements; `cancel_order` restores exactly once.
- **Playwright (E2E, mobile 390px + desktop):** customer journey home → product → personalise → bag → checkout → success; admin journey login → create product with images and fields → publish → visible on store → order appears → status update.
- **Visual pass:** Chrome DevTools MCP screenshots at 390px and 1440px after each UI increment.

---

## 13. Phases

| Phase | Scope | Done when |
|---|---|---|
| **V0.1 Product system** | scaffold, tokens, Supabase clients, migrations + RLS + storage, admin auth, admin shell, categories CRUD, products CRUD + images + personalisation fields, shop/category/product pages, add to bag | an owner creates a product with photos and fields; a customer sees it, personalises it, and adds it to the bag |
| **V0.2 Checkout** | cart page/drawer, `quoteCart`, checkout form + anti-abuse, `place_order`, success page, owner email after commit | full COD purchase works, totals come from the server, stock decrements |
| **V0.3 Operations** | orders list/detail, status and payment controls, `cancel_order`, dashboard counts | owners run fulfilment without opening Supabase |
| **V0.4 Storefront polish** | homepage, nav, discovery rows, search (simple `ilike` is enough at this size), empty/error states, accessibility pass | screenshots reviewed at 390 and 1440 |
| **V1 Hardening** | advisors, policy review, SEO (metadata, OG, JSON-LD Product, sitemap), legal placeholders, env validation, prod setup and backup docs, monitoring | launch checklist complete |

V0.1 increments (one commit each): ① scaffold + tokens + CLAUDE.md ② migrations + RLS + seed ③ Supabase clients + proxy + admin login + `requireAdmin` ④ categories admin ⑤ products admin (core fields) ⑥ image manager ⑦ personalisation field editor ⑧ storefront shop/category/product ⑨ add-to-bag store ⑩ tests + visual pass.

---

## 13a. V0.1 progress log

| Step | Status | Notes |
|---|---|---|
| ① Scaffold | ✅ | Next 16.4.4, React 19.3, Tailwind 4, Cache Components on. Install needs **npm 11** (npm 10.9 has a peer-dependency bug with vitest 5). |
| ② Design tokens + type | ✅ | Revised from Phase 0 to avoid the cream/claret/serif default look: "tissue and ribbon" (white, blush `#F5EEEC`, plum `#4B2142`), Spectral + Onest (Cyrillic + Latin Ext). **Provisional.** |
| ③ Locale routing | ✅ | `/en` default; proxy redirects unprefixed paths (cookie → Accept-Language → en). Per-key fallback to English. |
| ④ Supabase clients | ✅ | Browser, cookie-server, cookie-less public, server-only secret. **All use `no-store` fetch** (see findings). |
| ⑤ Migrations | ✅ | 3 migrations; applied cleanly to local Postgres 17. |
| ⑥ RLS/auth | ✅ | 24 pgTAP tests + 6 Storage integration tests. Supabase advisors: no issues. |
| ⑦ Admin shell | ✅ | Macedonian, strings in `src/messages/admin/mk.ts`. |
| ⑧ Categories | ✅ | Create/edit/delete, translations, slug autofill. |
| ⑨ Products | ✅ | Price in MKD with comma decimals, sale price, SKU, stock, status, featured, new, categories. |
| ⑩ Images | ✅ | Direct-to-Storage upload, browser downscale to ≤2000px WebP, reorder, main, alt text, delete. |
| ⑪ Personalisation | ✅ | Text/textarea/select/date; one shared validator; admin editor. |
| ⑫ Storefront | ✅ | Home (simple, pending photos), shop, category, product, 404s, hreflang/canonical. |
| ⑬ Add to cart | ✅ | localStorage `cart:v1`, distinct lines per engraving, minimal bag page. |

**Findings during V0.1 that changed the implementation**
1. **Supabase Data API no longer auto-exposes tables** (enforced 2026-10-30), so migrations grant table privileges explicitly per role.
2. **Next fetch cache persisted Supabase responses across builds.** A fresh build prerendered stale prices. Fix: every Supabase client uses `cache: 'no-store'`; caching happens only via tagged `'use cache'`. Verified with a production build after a direct DB change.
3. **Chrome lacks mk/sq Intl data**, so the money formatter is now deterministic (see §2a).
4. **404 status with streaming:** a `loading.tsx` on product/category pages forces a 200 "soft 404". Those routes block (`instant = false`) so missing, draft or archived items return a real 404.

**Known issues to revisit (not blocking)**
- The *first* request for a never-seen bad product URL returns 200 + `noindex` + the not-found page. Later requests return a cached 404. → V1 SEO pass.
- After an admin edit, a prerendered product page can serve the previous version **once** while it regenerates. Later requests are fresh. There is no money risk because checkout (V0.2) recalculates server-side. → V0.4 caching review.
- Macedonian/Albanian UI strings are **drafts** and need native review.
- The admin dashboard has no order metrics until V0.3.

## 14. Risks and things deliberately NOT built

**Risks**
- **No real photography yet.** The design is photography-led. Temporary images are used for development only, and the final visual pass waits for real photos (D8).
- **Fake COD orders** tie up stock and the owners' time. Mitigated by throttle, phone check, the `confirmed` step and quick cancellation.
- **Three languages triple the content work for owners.** Mitigated by only `en` being required and fallbacks being shown clearly in admin.
- **Supabase Free** pauses inactive projects and has no daily backups. It's fine for development. Production moves to **Pro** before launch. PITR is an optional paid add-on, so document a `pg_dump` routine either way.
- **Owner email can fail.** It runs after commit, and the dashboard is authoritative.
- **Cache Components is a newer model.** The fallback is documented in §2.

**Over-engineering avoided / deferred**
- Variants table (unless D3 says yes), customers table and `/admin/customers` (orders already hold the data; a "customers" view grouped by phone can come later), discounts, reviews, search engine, filter facets, order event log, image uploads by customers, multi-currency, payment abstraction of any kind.
