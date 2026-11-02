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

Database commands are documented in the "Database" section once migrations land.
