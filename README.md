# SHINING PRIMARY ENGLISH

Learning-management platform for SHINING English Center: Cambridge Starters/Movers/Flyers and Global
Success (grades 1–5) content, online tests with server-side grading, teacher feedback, student progress and
parent reports shareable on Zalo.

**Status:** Milestone 1 (foundation) — login, role dashboards, CI. See `PROJECT_STATUS.md`.

## Stack
Next.js 16 (App Router, Cache Components) · TypeScript strict · Tailwind CSS v4 · shadcn/ui-style components ·
Supabase (Postgres + RLS, Auth, Storage) · Vitest · Playwright · Vercel.

## Repository layout
| Path | What |
|---|---|
| `src/app/` | Routes: `(auth)/login`, `(admin)/admin`, `(teacher)/teacher`, `(student)/learn`, `(parent)/parent`, `api/health` |
| `src/proxy.ts`, `src/lib/supabase/` | Session refresh + optimistic role redirects; Supabase clients (`admin.ts` is server-only) |
| `src/lib/auth/` | Username→email mapping, role rules, `requireRole()` guard |
| `src/features/<module>/` | Server actions, schemas and components per feature |
| `supabase/migrations/` | Database schema, RLS policies, grading/report functions (source of truth) |
| `supabase/tests/` | 149 permission/grading/report assertions + local Supabase shim |
| `scripts/test-db.sh` | Runs migrations + DB tests on a throwaway PostgreSQL 15/16 server |
| `scripts/seed-dev.mts` | `[SAMPLE]` accounts, class and links for local/preview (refuses non-local URLs) |
| `tests/unit`, `tests/e2e` | Vitest and Playwright suites |

## Run it locally
Requires Node 22+ and Docker (for the local Supabase stack).
```bash
npm install
npx supabase start                 # applies all migrations; prints URL and keys
cp .env.example .env.local         # fill in the URL, anon key and service-role key printed above
node --env-file=.env.local scripts/seed-dev.mts
npm run dev                        # http://localhost:3000
```
Sample logins (local/preview only, password `Sample-Pass-2026` unless `SEED_PASSWORD` is set):

| Role | Log in with |
|---|---|
| Admin | `admin@example.com` |
| Teacher with a class / without | `gv.lan` / `gv.minh` |
| Student / deactivated student | `hs.an` / `hs.khoa` |
| Parent | `ph.an` |

## Checks
```bash
npm run lint && npm run format:check && npm run typecheck
npm test                           # unit
npm run test:db                    # database (needs PostgreSQL server binaries, no Docker)
npm run build && npm run test:e2e  # end-to-end (needs the seeded Supabase stack above)
```
CI (`.github/workflows/ci.yml`) runs all of these on every pull request, including e2e against a real
local Supabase stack and a check that the service-role key never reaches the browser bundle.

## Environment variables
| Name | Where | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) | browser + server | no (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` (secret key) | **server only** (Vercel env, never `NEXT_PUBLIC_`) | **yes** |
| `APP_BASE_URL` | server | no |

Never commit `.env*` files (only `.env.example`).

## Deployment (summary — full guide in Milestone 8)
1. GitHub repository (private) · 2. Supabase project (Pro, Singapore region) · 3. Auth settings: disable
sign-up, configure password policy · 4. `supabase link && supabase db push` · 5. Vercel project linked to
GitHub, env vars set per environment · 6. Custom domain · 7. Deploy preview → verify → **owner approval** →
promote to production.
