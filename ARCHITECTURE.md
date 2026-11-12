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
| D16 | **Accounts created by the centre: username + password for students and parents** (no SMS/OTP, no self-sign-up). Supabase Auth needs an email, so a username maps to a non-deliverable internal address `<username>@users.shining.internal`; the login form accepts either a username or a real email (teachers/admins). Password resets are done by an admin. *Owner decision, 2026-11-09.* Each account signs in with **either** a username **or** a real email, never both (M2's account form enforces this; no username→email lookup on the login path). | Free; children need no email or phone. |
| D17 | **Data minimisation**: no date of birth, no photos of children, no national ID, no home address. Student record = name, English name, student code, school/grade (optional). | Owner decision; less personal data = less risk. |
| D18 | **Next.js 16 with Cache Components** (framework default). Every session read sits inside `<Suspense>`; role chrome prerenders as a static shell and user data streams in. `proxy.ts` (formerly middleware) refreshes the session and does *optimistic* role redirects from the JWT; every page and Server Action re-checks with `requireRole()`, which reads `profiles` (role, `is_active`) under RLS. | Fast first paint on phones; authorization never depends on the proxy alone. |
| D19 | **Profile provisioning follows `app_metadata.role`** (migration 0011). A user row without it gets no profile and therefore no access; the profile is created when the role appears. After that, the role changes only through `profiles` (admin-only, audited). | The Auth Admin API writes `app_metadata` after inserting the user; the M0 insert-time check blocked all account creation. Found by the first real-stack e2e run. |
| D20 | **Vietnamese UI** for all roles; English only in learning content and the student greeting. Self-hosted Be Vietnam Pro via `@fontsource`. | Parents and teachers read Vietnamese; no Google Fonts request. |
| D21 | **Milestone 2 scope cut to what students need to do homework** *(owner decision, 2026-11-09)*: student and teacher accounts, classes with one level, enrolment, teacher assignment. Parents, CSV import, student history pages and an audit-log screen are deferred. | The system's main goal is students doing exercises; teachers assign and grade. |
| D22 | **Standard levels are seeded by migration 0012** (Starters, Movers, Flyers, Global Success 1–5, published) so classes can be created before the curriculum editor (M3). Student codes default to `HSnnnn` from a sequence; usernames are suggested as `hs.<given name>` / `gv.<given name>` with a number appended when taken; passwords are generated as `Word-Word-1234` and shown once. | Admins should never have to invent codes or passwords; readable passwords suit children. |
| D23 | **Practice library first** *(owner decisions, 2026-11-10)*: the main goal is students doing exercises. Practice is Level → Topic → short games (8 kinds). **Every active account opens every level** (lower or higher than its class), so published practice content is readable by all signed-in users. **Teachers and admins both edit** practice content. Practice is self-study: answers reach the browser and the browser scores the round; only stars/progress are stored (`record_practice()` validates). Graded tests keep D3/D4. | Children practise at their own pace; low stakes make client scoring acceptable and keep games instant. |
| D24 | **One theme per level** for students (Starters "Nắng Sớm", Movers "Đảo Phiêu Lưu", Flyers "Vũ Trụ Kẹo"), built on the official logo colours (charcoal #3A3A3C, sunshine #FFC61A, orange #F28C1B), rounded fonts Nunito/Quicksand (self-hosted). Pictures: Microsoft Fluent Emoji 3D (MIT), served by the app. Voice: the device's own text-to-speech for the pilot; recorded voices only if the pilot shows a need. | Friendly, consistent look for 6–10 year-olds at zero asset cost. |
| D25 | **Speed and navigation feedback** *(pilot feedback, 2026-11-11)*: Vercel functions run in `hnd1` (Tokyo), the Supabase region, via `vercel.json`. Pages verify the session with `getClaims()` (no Auth round trip with asymmetric signing keys); the role still comes from `profiles` per request. Each activity's progress is embedded in the topic query (one request, RLS returns only the student's rows); independent reads run in parallel. A thin top bar shows on every link navigation, and each area has a `loading.tsx` skeleton. | Every server request crossed the Pacific several times per page; children got no sign that a tap worked. A revoked session now stays valid until its JWT expires (≤1 h); deactivation still applies at once. |
| D26 | **Programme → Level → Topic/Unit → Activity** *(owner, 2026-11-11)*: Cambridge (Starters, Movers, Flyers) and Global Success (G1–G5, topics = textbook units). Content per level is independent (vocabulary is unique per level). Global Success sentences and passages are written by SHINING; unit titles and core words follow the syllabus. Textbook texts, pictures and audio are not copied into the public repository. | Teachers use both programmes; the books are © NXB Giáo dục Việt Nam. |
| D27 | **One shared student theme** *(owner, 2026-11-11)*, replacing D24's per-level themes: pale yellow `#FFF8DC` background, leaf green `#3A9A47` primary (white text, `#2E7D32` shadow), sunshine `#FFC93C` accent, ink `#2F3B1F`. Tokens in `globals.css` (`--k-*`). | One look across programmes; simpler to maintain. |
| D28 | **Four more activity kinds** (12 in all): *listen and write* (hear a word, type it), *listening* (YouTube link via youtube-nocookie, or teacher audio in `learning-media/practice/`, then Yes/No or multiple-choice questions), *reading* (short passage + questions), *mixed* "skills challenge" (2–6 steps of other kinds, ≤3 questions per step, one star score). The video/passage stays on screen above its questions. Content is validated by `contentSchemaFor()` in the editor action. Staff upload audio straight to Storage under RLS (no 4.5 MB function limit); students get 2-hour signed URLs. | Teachers asked for more variety and one exercise combining skills. |
| D29 | **Hints, tries and scoring; results pages** *(pilot feedback 2, 2026-11-12)*: per activity `settings` = `{ hints (default on), maxTries 1–5 (default 3) }`; optional teacher hint per item, else an automatic hint (first letter, one wrong option removed…). Out of tries: the answer shows and the next question opens after 3 s. Points per question: 2 right first time, 1 after a mistake, 0 out of tries. Stars and results use each activity's **latest** attempt. `/teacher/results` and `/admin/results`: per class (period/level filters) by student — activities done, stars, average, last practice, "needs attention" (no practice for 7 days or average < 50 %) — or by activity; a page per student. RLS limits teachers to their classes. | Children should not get stuck on one question; teachers asked for one place to see who practises and how well. |
| D30 | **Student interface language**: English by default, Vietnamese on request (EN/VI switch, cookie `shining-lang`, server-rendered). One message table (`src/features/i18n/messages.ts`); in English the Vietnamese instructions, meanings and titles are hidden. Staff/admin stay Vietnamese. | Immersion by default; Vietnamese for children who need it. |
| D31 | **Video listening activities**: YouTube songs (official Super Simple Songs uploads) embedded via youtube-nocookie with 4 questions each, seeded from `content/videos.mts` (migration 0019) and editable like any listening activity. | Teachers asked for video exercises; embedding needs no hosting or licence. |

## 3. Application structure (built in Milestone 1; later modules follow the same layout)

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
