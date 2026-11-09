# Project Status

_Last updated: 2026-11-09_

## Completed milestones
**Milestone 0 — Discovery & architecture** ✅
- Architecture, schema, security model, plan, costs documented.
- Database layer for Milestones 1–6: migrations (40 tables), RLS on every table, server-side grading,
  assignment, review and report functions, private storage buckets.

**Milestone 1 — Foundation** ✅ (PR #2, awaiting owner review)
- Next.js 16 (App Router, Cache Components) · strict TypeScript · Tailwind v4 · shadcn/ui-style components
  (`components.json` included) · ESLint (no-console, service-key import restriction) · Prettier · Vitest ·
  Playwright.
- Supabase SSR clients: user (server/browser) and a `server-only` service-role client (not used yet).
- `proxy.ts` refreshes the session and redirects by role; `requireRole()` re-checks role and `is_active`
  from the database in every page/action.
- Login with centre username or email; one generic error for bad credentials; deactivated accounts refused;
  logout; expired/revoked sessions cleared and explained; `next=` redirects restricted to the user's own area.
- SHINING brand tokens, self-hosted Be Vietnam Pro, Vietnamese UI; dashboards for admin (centre figures),
  teacher (assigned classes), student (greeting + assignments empty state), parent (linked children +
  reports empty state); `/forbidden` page.
- `/api/health` (status + version only) via new `health_check()` RPC (migration 0010).
- **Bug fixed from M0** (migration 0011): account creation through the Supabase Auth Admin API was blocked by
  the insert-time role check. Found by the first run against a real Supabase stack.
- `[SAMPLE]` seed script; CI with lint, format, typecheck, unit, build, DB tests, e2e on a real local
  Supabase stack, and a service-key-in-bundle check.

## Current milestone
**Milestone 2 — People & classes (admin)** — not started; begins after PR #2 is reviewed.

## Test status
| Suite | Result |
|---|---|
| DB (migrations + RLS/grading/reports/health) | 149/149 |
| Unit (Vitest) | 36/36 |
| End-to-end (Playwright, real local Supabase in CI): login per role, wrong credentials, deactivated account, logout, session expiry (revoked + corrupted cookie), unauthorized access, safe redirects, health | 27/27 (desktop + phone viewport) |

Still not run against a hosted Supabase project — required before production (M8).

## Known limitations
- Accounts sign in with a username **or** a real email, not both (ARCHITECTURE D16).
- No generated Supabase TypeScript types yet (queries are typed by hand); add `supabase gen types` in M2.
- Preview runs on Vercel Hobby with the repo temporarily **public** (Hobby cannot deploy private
  organization repos, and forbids commercial use): sample data only, no real students until Vercel Pro.

## Technical decisions
See `ARCHITECTURE.md` §2 (D1–D20). New in M1: D18 (Cache Components + proxy/guard split), D19 (profile
provisioning), D20 (Vietnamese UI, self-hosted font).

## Outstanding questions (need owner)
1. **Before real students**: upgrade Vercel to Pro and make the repository private again.
2. Before go-live (owner/legal, not blocking development): enrolment consent wording; transfer impact
   assessment for overseas hosting; confirm Decree 333/2026 localisation does not apply.

## Resolved decisions
- 2026-11-09 — Preview environment: Supabase `shining-dev` (Singapore, free, `[SAMPLE]` seed, sign-up
  disabled) + Vercel Hobby; repository made public for the trial period (owner decision).
- 2026-11-09 — GitHub repo `shiningenglishcenter/shining-primary-english`; work on branches + PRs.
- 2026-11-09 — Hosting: Supabase Singapore + Vercel (ARCHITECTURE D15).
- 2026-11-09 — Login: centre-created username + password for students and parents (D16).
- 2026-11-09 — MVP includes stories (no video), vocabulary games and all 8 question types incl. picture
  and listening; only video is deferred. Media bucket limited to images/audio/PDF, 20 MB.
- 2026-11-09 — Minimal personal data; `students.date_of_birth` removed from the schema (D17).
