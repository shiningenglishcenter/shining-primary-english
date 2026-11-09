# Project Status

_Last updated: 2026-11-09_

## Completed milestones
**Milestone 0 — Discovery & architecture** ✅
- Repository inspection: no existing repository or code was available (no GitHub account linked to this
  session); project initialised from scratch.
- Architecture, schema, security model, plan, costs documented.
- Database layer for Milestones 1–6 written ahead of the UI: 9 migrations (40 tables), RLS on every table,
  server-side grading, assignment, review and report functions, private storage buckets.

## Current milestone
**Milestone 1 — Foundation** (blocked — see Outstanding questions 1–2)

## Remaining tasks
- M1: Next.js scaffold, Supabase SSR clients, login, role layouts, design system, dashboards, CI.
- M2–M8 per `IMPLEMENTATION_PLAN.md`.
- Development seed data (`supabase/seed.sql`, all rows labelled `[SAMPLE]`).

## Test status
| Suite | Result |
|---|---|
| DB: auth & profiles | 15/15 |
| DB: people & classes isolation | 26/26 |
| DB: content visibility | 12/12 |
| DB: test-taking, grading, manual grading | 45/45 |
| DB: grading unit checks | 12/12 |
| DB: reports, progress, storage | 30/30 |
| **Total** | **140/140 passing** (PostgreSQL 16 + Supabase shim) |
| Frontend unit / e2e | not started (M1) |

Not yet run against a real Supabase project — required before production.

## Known bugs
None open. Fixed during M0: `can_view_student()` could return NULL, which let an unrelated parent call
`get_attempt_review`; profile-guard role detection inside `SECURITY DEFINER`; auto-submitted expired attempt
being rolled back.

## Technical decisions
See `ARCHITECTURE.md` §2 (D1–D14).

## Outstanding questions (need owner)
1. **GitHub**: connect a GitHub account / give `owner/repo` so work happens on branches + PRs.
2. **Package installs** are blocked in this environment, so the Next.js app can't be scaffolded or tested
   here. Enable network for package registries, or run development in Claude Code on your computer.
3. Before go-live (owner/legal, not blocking development): enrolment consent wording; transfer impact
   assessment for overseas hosting; confirm Decree 333/2026 localisation does not apply.

## Resolved decisions
- 2026-11-09 — Hosting: Supabase Singapore + Vercel (ARCHITECTURE D15).
- 2026-11-09 — Login: centre-created username + password for students and parents (D16).
- 2026-11-09 — MVP includes stories (no video), vocabulary games and all 8 question types incl. picture
  and listening; only video is deferred (see IMPLEMENTATION_PLAN "MVP scope"). Media bucket limited to
  images/audio/PDF, 20 MB.
- 2026-11-09 — Minimal personal data; `students.date_of_birth` removed from the schema (D17).
