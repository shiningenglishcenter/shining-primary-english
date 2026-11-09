# Project Status

_Last updated: 2026-11-09_

## Completed milestones
**Milestone 0 — Discovery & architecture** ✅
- Architecture, schema, security model, plan, costs documented.
- Database layer for Milestones 1–6: migrations (40 tables), RLS on every table, server-side grading,
  assignment, review and report functions, private storage buckets.

**Milestone 1 — Foundation** ✅ (PR #2, merged)
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
**Milestone 2 — People & classes (admin)** ✅ built, awaiting owner review (PR on branch `milestone-1`)
- Scope agreed with the owner (D21): what students need to do homework, and what teachers need to assign
  and grade it. Parents and CSV import deferred.
- Admin menu: Tổng quan · Học sinh · Giáo viên · Lớp học.
- **Students**: list with search (name, English name, code) and paging; create with automatic code
  (`HS0001`…), optional class and optional login (suggested username `hs.<tên>`, generated readable
  password shown once); edit details and study status; create a login later; reset password; lock/unlock.
- **Teachers**: list; create with a login by username (`gv.<tên>`) or real email; edit name/phone; reset
  password; lock/unlock; classes they teach.
- **Classes**: list with level, size, teachers, open/closed; create (code generated from the name if left
  blank) with one of the standard levels; edit, close/reopen; add several students at once; a student
  leaves the class (history kept); assign/unassign main teacher or assistant.
- Migration 0012: standard levels (Starters, Movers, Flyers, Global Success 1–5, published), student code
  generator, `log_account_event()` audit for account creation/password reset, lock/unlock audited.
- Fixed while building: Supabase calls now wait for the request (`connection()`), which removes the
  "Date.now() while prerendering" errors that M1 pages also logged under Partial Prefetching.

## Next milestone
**Milestone 3 — Learning content (admin)** — starts after the M2 PR is reviewed.

### To deploy M2 to the preview (owner)
1. Supabase `shining-dev` → SQL Editor: run `supabase/migrations/20261109000012_admin_people.sql`
   ("Run without RLS" is fine: it creates no tables).
2. Vercel → Settings → Environment Variables: add `SUPABASE_SERVICE_ROLE_KEY` (Supabase secret key) for
   **Preview** only, marked Sensitive. Redeploy the preview.

## Test status
| Suite | Result |
|---|---|
| DB (migrations + RLS/grading/reports/health/account audit) | 169/169 |
| Unit (Vitest) | 50/50 |
| End-to-end (Playwright, real local Supabase): M1 login/session/redirect suite + M2: every admin screen refused for teacher/student/parent and signed-out visitors; create class → student with login → student signs in; numbered usernames; teacher by username and by email, assigned → sees class; lock/unlock; password reset; name edit shows after login; login created later; enrol/remove; search | 43/43 (desktop + phone viewport) |

Still not run against a hosted Supabase project — required before production (M8).

## Known limitations
- Accounts sign in with a username **or** a real email, not both (ARCHITECTURE D16).
- No generated Supabase TypeScript types yet (queries are typed by hand); planned for M3.
- Admin screens are built for desktop/tablet; on phones the tables scroll sideways.
- Re-enrolling a student who left a class re-opens the same enrolment row (the earlier dates are replaced).
- Preview runs on Vercel Hobby with the repo temporarily **public** (Hobby cannot deploy private
  organization repos, and forbids commercial use): sample data only, no real students until Vercel Pro.

## Technical decisions
See `ARCHITECTURE.md` §2 (D1–D22). New in M1: D18 (Cache Components + proxy/guard split), D19 (profile
provisioning), D20 (Vietnamese UI, self-hosted font). New in M2: D21 (reduced scope), D22 (levels, codes,
usernames, passwords).

## Outstanding questions (need owner)
1. **Before real students**: upgrade Vercel to Pro and make the repository private again.
2. Before go-live (owner/legal, not blocking development): enrolment consent wording; transfer impact
   assessment for overseas hosting; confirm Decree 333/2026 localisation does not apply.

## Resolved decisions
- 2026-11-09 — M2 scope: students + teachers + classes only; parents and CSV import later. Teachers assign
  and grade work. Levels: Starters, Movers, Flyers, Global Success 1–5. Passwords generated and shown once.
- 2026-11-09 — Preview environment: Supabase `shining-dev` (Singapore, free, `[SAMPLE]` seed, sign-up
  disabled) + Vercel Hobby; repository made public for the trial period (owner decision).
- 2026-11-09 — GitHub repo `shiningenglishcenter/shining-primary-english`; work on branches + PRs.
- 2026-11-09 — Hosting: Supabase Singapore + Vercel (ARCHITECTURE D15).
- 2026-11-09 — Login: centre-created username + password for students and parents (D16).
- 2026-11-09 — MVP includes stories (no video), vocabulary games and all 8 question types incl. picture
  and listening; only video is deferred. Media bucket limited to images/audio/PDF, 20 MB.
- 2026-11-09 — Minimal personal data; `students.date_of_birth` removed from the schema (D17).
