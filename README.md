# Gift Store (working name)

Production e-commerce storefront and admin for a small personalised-gift business.
Cash on delivery only. Storefront in English (default), Macedonian and Albanian.

- Plan, decisions and progress: [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md)
- Rules for contributors and AI agents: [`CLAUDE.md`](CLAUDE.md)

## Requirements

- Node 22.20+ and **npm 11+**. npm 10.9 has a bug with vitest's peer dependencies; use `npx npm@11 install` if you're on an older npm.
- A Supabase project (Free for development, **Pro before launch**).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + keys
npm run dev                  # http://localhost:3000 → redirects to /en
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm test` | Unit tests (vitest) |

| `npm run test:integration` | Storage policy tests (local Supabase) |
| `npm run db:test` | Database RLS/constraint tests (pgTAP) |
| `npm run db:advisors` | Supabase security/performance advisors |

## Database

Schema, RLS, grants and Storage policies live in `supabase/migrations/` and nothing is changed by hand in the dashboard.

**Local development** (needs Docker):

```bash
npx supabase start            # applies migrations; prints local URL + keys
cp .env.example .env.local    # paste the local URL, publishable and secret keys
npm run db:types              # regenerate TypeScript types after schema changes
```

**Cloud project** (Free for development, Pro before launch):

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push          # applies migrations to the linked project
```

Then in the Supabase dashboard: **Authentication → Sign In / Providers → turn off "Allow new users to sign up"** (the local config already does this).

## Creating an admin

Public sign-up is disabled. Being signed in is not enough: admins are users listed in `admin_users`.

```bash
node --env-file=.env.local scripts/create-admin.mjs owner@example.com          # prompts for a password
node --env-file=.env.local scripts/create-admin.mjs helper@example.com staff
```

Then sign in at `/admin/login`.
