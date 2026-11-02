# CLAUDE.md

Production e-commerce store for a small personalised-gift business. Real customers, real non-technical owners. Plan and progress: `docs/PROJECT_PLAN.md`.

## Stack
Next.js 16 (App Router, TypeScript strict, Turbopack) · Tailwind v4 · Supabase (Postgres, Auth, Storage) · Zod · Vercel. One app: no separate API, no Redux, no ORM.

## Commands
Use **npm 11+** (`npx npm@11 install` on older npm).
- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
- `npm test` (vitest unit) · `npm run test:integration` (needs local Supabase) · `npm run db:test` (pgTAP) · `npm run db:advisors`
- `npx supabase start` (Docker) · `npx supabase migration new <name>` · `npm run db:types`
- Create an admin: `node --env-file=.env.local scripts/create-admin.mjs <email>`

## Hard rules
- **Payment is Cash on Delivery only.** No Stripe, no card fields, no payment abstractions. New orders are `cash_on_delivery` / `unpaid` / `new`. Paid is only ever set by an admin.
- **Never trust the browser** for prices, totals, delivery fee or stock. `place_order()` (Postgres, one transaction) computes everything.
- **Order items are immutable snapshots** (name, SKU, price, personalisation, image path). Never read the current product to render an old order.
- **Personalisation is data-driven** (`personalization_fields`). Never hard-code name/date/engraving inputs.
- **Money is integer minor units** (`*_minor`). Format only with `formatMoney()` (Intl). Never concatenate currency symbols.
- **Business info** (name, currency, fees, contacts, socials) comes from `store_settings` / `src/config/site.ts`. Never inline it in components. Never invent it.
- No fake reviews, ratings, testimonials or legal text presented as final.

- **Storefront is trilingual:** `en` (**default/canonical**), `mk`, `sq` via next-intl, with `/[locale]/…` routes. The default locale comes only from `src/i18n/routing.ts`; never assume it elsewhere. Translatable customer-facing DB text is `jsonb` `{en,mk,sq}` (`en` required, fall back to `en` via `localized()`). Never use JSON for SKU, price, stock, status, IDs or timestamps. UI strings: `src/messages/{en,mk,sq}.json`.
- **Admin UI is Macedonian** (V0.1). Strings live in `src/messages/admin/mk.ts`; no inline literals. Admin language is independent of the storefront default.
- **Currency** comes from `store_settings.currency_code` (default MKD), formatted with the display locale via `formatMoney()`. Never hard-code "ден.".

## Security
- RLS on every table, written in the same migration that creates the table. Admin = row in `admin_users` (check with `is_admin()`), not "any logged-in user".
- `requireAdmin()` at the top of every admin Server Action and in the admin layout. `proxy.ts` is only a convenience redirect.
- Server auth uses `getClaims()`, never `getSession()`.
- `SUPABASE_SECRET_KEY` lives only in `src/lib/supabase/admin.ts` (imports `server-only`). Never prefix secrets with `NEXT_PUBLIC_`.
- Every SQL function migration: `revoke execute … from public, anon, authenticated`, then grant only what's needed. `security definer` functions use `set search_path = ''` and fully qualified names. `place_order()` is EXECUTE for `service_role` only. The browser never calls it; the checkout Server Action does.
- No public read of orders. `/order-success` shows only the sanitized confirmation from a signed cookie. No lookup by order number.
- Owner notification email runs **after** the order commits and must never affect the order.
- Validate every Server Action input with Zod. TypeScript types are not validation.
- All schema/RLS/storage changes go through `supabase/migrations/`. No dashboard-only changes.

## Conventions
- Server Components by default; `'use client'` only for interactivity (gallery, cart, forms). Never pass functions from Server to Client Components.
- Catalogue reads: `src/lib/catalog/queries.ts` (cookie-less public client + `'use cache'` + `cacheTag(CATALOG_TAG)`). Admin mutations call `updateTag(CATALOG_TAG)`.
- Supabase clients must keep `global.fetch = noStoreFetch`. Next's fetch cache must never store Supabase responses.
- Admin pages: `requireAdmin()` + `export const instant = false`. Admin forms use `useActionForm` (no reset on error, focuses the first invalid field).
- Money display: `formatMoney(minor, { currency, locale })`, deterministic, never `Intl` (browsers lack mk/sq data).
- Product/category pages block (`instant = false`, no `loading.tsx`) so missing items get a real 404.
- Next 16: `await params`, `await cookies()`. Use `proxy.ts`, not `middleware.ts`.
- Design tokens are in `src/app/globals.css` `@theme`. No arbitrary hex/px values in components.
- Storefront copy is warm and customer-facing. Admin copy is plain and efficient.

## Workflow
research → plan → implement → run → test → screenshot (390px + 1440px) → fix → repeat. Small commits, one concern each. Update `docs/PROJECT_PLAN.md` when a phase step completes.
