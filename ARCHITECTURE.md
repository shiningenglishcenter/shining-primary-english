# Architecture — SHINING PRIMARY ENGLISH

## 1. Shape of the system

```
 Browser (student · parent · teacher · admin)
        │  HTTPS, Supabase session cookie (httpOnly)
        ▼
 Next.js App Router on Vercel  ──────────────►  Supabase (Singapore region proposed)
  • Server Components read data with the         • Postgres 15+ : tables, RLS, RPC functions
    USER's session (RLS applies)                 • Auth         : email/username + password
  • Server Actions for mutations                 • Storage      : private buckets, signed URLs
  • Route Handlers: /api/health, report export
  • Service-role key used ONLY for Auth admin
    tasks (create user / reset password)
```

One Next.js application, one Supabase project per environment (dev, prod). No separate backend service: the
database is the authorization boundary (RLS + `SECURITY DEFINER` RPCs), and Next.js is a thin, typed layer on top.

**Why this split.** For a 50–200 student centre the cheapest reliable design is "logic where the data is":
grading, assignment fan-out and report figures run inside Postgres in a single transaction. The UI cannot
change a score because no code path outside the database is able to write one.

## 2. Key decisions

| # | Decision | Reason |
|---|----------|--------|
| D1 | Next.js (latest stable, App Router) + TypeScript strict, Tailwind, shadcn/ui, RHF + Zod | As specified. |
| D2 | All reads/writes use the **user's** Supabase session; the service-role key is used only by the admin "accounts" server actions (Auth admin API). | RLS is never bypassed for features. |
| D3 | Correct answers stored only in `question_answer_keys`; students get papers via `get_attempt_paper()` and results via `get_attempt_review()`. | Answers can't leak through any table or API query. |
| D4 | Grading, scoring, assignment fan-out and report snapshots are Postgres functions. | Server-side, atomic, testable without a browser. |
| D5 | Attempted tests and answered keys are frozen (trigger); edits go to a duplicate. | Historical scores always match what was sat. |
| D6 | Reports store a `data_snapshot` computed by the database; teachers edit only comment fields. | "Reports from real records", reproducible after later edits. |
| D7 | Report export rendered **in the browser** from one React report component: PNG via DOM-to-image at 2×, PDF via jsPDF from the same render, self-hosted *Be Vietnam Pro* font. | Zero extra infrastructure (no headless Chrome on Vercel), identical PDF/PNG, correct Vietnamese diacritics. Trade-off: PDF text is an image (not selectable) — acceptable for parent sharing on Zalo. |
| D8 | `media_assets` table with a `provider` column (supabase_storage / youtube / bunny_stream / cloudflare_stream / external_url). | Videos can move to a video host later by updating rows, not code. |
| D9 | Students and parents may exist without logins; accounts are created by admins only (self-sign-up disabled). | Children don't self-register; centre controls access. |
| D10 | Curriculum visibility for students = published content of the levels attached to their active classes (`class_levels`). | Simple, predictable rule teachers can understand. Finer "per-lesson unlock" can be added later. |
| D11 | Late submissions are allowed and flagged `is_late`; the time limit is enforced on the server with a 30-second grace. | Kids' connectivity is unreliable; teachers decide what late means. |
| D12 | Content editing is admin-only in the MVP; teachers assign, grade and report. | Matches the role spec; keeps the question bank consistent. |
| D13 | App-level rate limiting in Postgres (`private.check_rate_limit`) + Supabase Auth's built-in login limits. | No paid Redis/Upstash needed. |
| D14 | Vietnam time (`Asia/Ho_Chi_Minh`) for report periods; timestamps stored as `timestamptz`. | Monthly boundaries match the centre's calendar. |
| D15 | **Hosting abroad: Supabase Singapore (`ap-southeast-1`) + Vercel.** *Owner decision, 2026-11-09.* | Managed backups/security; no Vietnam region exists for Supabase. |
| D16 | **Accounts created by the centre: username + password for students and parents** (no SMS/OTP, no self-sign-up). Supabase Auth needs an email, so a username maps to a non-deliverable internal address `<username>@users.shining.internal`; the login form accepts either a username or a real email (teachers/admins). Password resets are done by an admin. *Owner decision, 2026-11-09.* | Free; children need no email or phone. |
| D17 | **Data minimisation**: no date of birth, no photos of children, no national ID, no home address. Student record = name, English name, student code, school/grade (optional). | Owner decision; less personal data = less risk. |

## 3. Application structure (planned, Milestone 1)

```
src/
  app/
    (auth)/login/                     username or email + password
    (admin)/admin/...                 people, classes, curriculum, tests, reports
    (teacher)/teacher/...             dashboard, classes/[id], submissions/[attemptId], reports
    (student)/learn/...               home, lessons/[id], flashcards, assignments/[id]/take, results
    (parent)/parent/...               children/[id], reports/[id]
    api/health/route.ts               DB ping + version (no PII)
  proxy.ts / middleware               refresh session; redirect by role (UX only — DB enforces)
  lib/supabase/{server,browser,admin}.ts   admin.ts is `server-only`, service role
  lib/auth/require-role.ts            server-side role guard for layouts & actions
  features/<module>/{queries,actions,schemas,components}
  components/ui/                      shadcn/ui
supabase/migrations/                  SQL source of truth (this repo)
supabase/tests/                       RLS/RPC tests (scripts/test-db.sh)
tests/unit, tests/e2e                 Vitest + RTL, Playwright
```

Each role has its own layout. Student UI: large touch targets (≥ 48 px), picture-first, minimal text.
Teacher/admin UI: dense tables, keyboard-friendly forms, bulk actions.

## 4. Data flow examples

**Student takes a test**: `start_attempt(assignment_student_id)` → `get_attempt_paper(attempt)` (no keys) →
autosave each answer with `save_answer()` (debounced) → `submit_attempt()` grades on the server → result page
calls `get_attempt_review()` (keys visible only after submission, and only if the test allows it).

**Teacher report**: pick student + month → `create_parent_report()` computes figures → teacher edits
strengths / improvements / comment, picks feedback templates → preview → export PNG/PDF in the browser →
upload to `reports/<student_id>/<report_id>.png` → publish → parent sees it in their portal; teacher shares the
PNG via Zalo manually.

## 5. Environments

| Env | Supabase | Vercel | Data |
|-----|----------|--------|------|
| local | `supabase start` (Docker) or `scripts/test-db.sh` for DB tests | `next dev` | seed with `[SAMPLE]` data |
| preview | dev project | Preview deployments per PR | sample data only |
| production | prod project (Pro) | Production (manual promote, owner approval) | real data, no seeds |
