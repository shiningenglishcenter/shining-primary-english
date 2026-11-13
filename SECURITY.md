# Security & Child Data Protection

This platform stores data about primary-school children. The database — not the UI — enforces every rule
below, and each rule has an automated test in `supabase/tests/` (run `scripts/test-db.sh`; 140 assertions,
all passing at Milestone 0).

## 1. Authorization matrix (enforced by RLS + RPC checks)

| Data | Admin | Teacher | Student | Parent |
|---|---|---|---|---|
| Student records | all | current students of assigned classes | own | linked children |
| Staff notes | all | own students | – | – |
| Classes / enrolments | all | assigned classes | own enrolment only (no classmate list) | children's |
| Published curriculum | all (incl. drafts) | all (incl. drafts) | levels of own classes | children's levels |
| Question bank & answer keys | read/write | read | **never** (paper via RPC, keys only after submit) | via child's review after submit |
| Attempts & scores | read | own students | own | children's |
| Writing scores | via RPC only | via RPC (`grade_answer`) | via RPC (`submit_attempt`) | – |
| Teacher comments | all | own students | marked visible-to-student | marked visible-to-parent |
| Parent reports | all | own students (draft + published) | – | children's **published** only |
| Report files (Storage) | all | own students' folders | – | files of published reports |

Teachers lose access as soon as they are unassigned from a class or a student leaves it. Deactivated
accounts (`profiles.is_active = false`) lose all access immediately. Soft-deleted students disappear for
non-admins.

## 2. Mechanisms
- **RLS enabled and forced on every public table**; `anon` has no privileges at all.
- **Helpers** (`private.*`) are `SECURITY DEFINER`, `STABLE`, `search_path=''`, and return non-NULL booleans
  (a NULL-returning helper bypassed a PL/pgSQL check during development; caught by the test suite and fixed).
- **Column-level grants** stop teachers editing report figures (`data_snapshot`), assignment ownership, or
  comment authorship; results tables are not writable by any user role.
- **Roles live in `app_metadata`** (server-only), never `user_metadata`. New users without an admin-assigned
  role are rejected by the provisioning trigger. Only admins can change roles, names or activation; role
  changes are audited.
- **Practice vs tests**: practice activities (D23) are self-study; their answers are in the activity
  content and are scored in the browser — only stars are stored, via `record_practice()` (student only,
  published activity only, score ≤ max, rate-limited). Anything graded uses the question bank below.
- **Answer secrecy**: keys exist only in `question_answer_keys` (staff-only). The paper RPC omits keys and
  explanations; tests assert the paper JSON contains none.
- **Integrity**: attempted tests and answered keys are frozen; submitted attempts are immutable; time limits
  enforced server-side.
- **Rate limits** (per user, fixed window): start attempt 30/min, save answer 300/min, submit 20/min,
  grading 600/min, assignments 60/10 min, reports 60/10 min. Login is rate-limited by Supabase Auth.
- **Storage**: both buckets private; files served through short-lived signed URLs (default 10 min for
  media, 5 min for reports). Report files live at `reports/<student_id>/<report_id>.*`.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server env vars, imported only from a
  `server-only` module, used only for Auth admin tasks. `.env*` files are git-ignored.
- **Account management (M2)**: only `src/features/people/accounts.ts` uses the service-role client, and only
  for the Auth Admin API (create user, set password, delete a half-created user, read a teacher's login
  email). Every caller is a Server Action that first runs `requireRole("admin")`; all table writes then use
  the admin's own session, so RLS and triggers apply. Password reset and lock/unlock act only on student and
  teacher accounts, never admin accounts or the admin themself. Generated passwords are shown once and never
  stored or logged; account creation and password resets are recorded with `log_account_event()` (actor =
  the admin), lock/unlock by the profile trigger.
- **Session ending**: a session the Auth server rejects (revoked, expired) or that belongs to a deactivated
  account is cleared by `/auth/end-session` before showing the login page, so a stale cookie can't loop.
  Login errors are one generic message (no username probing); `next=` redirects only to same-origin paths in
  the user's own area.
- **Sessions**: Supabase SSR cookies (httpOnly, Secure, SameSite=Lax); server components re-validate the user
  with `auth.getUser()`; role redirects in middleware are UX only.

## 3. Logging
- `private.audit_log` stores actor id, action, entity id and numeric details only — **no names, answers,
  comments or contact details**. Account events also store the role and login name; passwords are
  stripped by `log_account_event()` even if a caller passed one.
- Application logs (Vercel) must never print request bodies, student names or report contents; errors are
  logged with an error id and route only. (Lint rule + code review checklist in Milestone 1.)

## 4. Vietnamese personal-data law — decisions and remaining obligations
Vietnam's Law on Personal Data Protection took effect on 1 January 2026. Points relevant here (summary, not
legal advice — please confirm with a lawyer or the relevant authority):
- For children aged 7 and over, where processing reveals the child's private life, consent from both the
  parent/guardian **and** the child is required. → The enrolment form should include a consent section; the
  app can record consent date and version per student.
- Transferring personal data abroad requires a transfer impact assessment filed within 60 days of the first
  transfer. Supabase/Vercel servers are outside Vietnam (nearest Supabase region: Singapore). Small
  enterprises have a grace period for some obligations, micro-enterprises are exempt from some — which
  category SHINING falls into is a business/legal question.
- **Data minimisation (decided 2026-11-09)**: no date of birth, photos, ID numbers or addresses are collected.
  Accounts are created by the centre with usernames; children have no email or phone on file.

**Owner decision (2026-11-09): host in Supabase Singapore.** Note that student names, usernames, scores and
teacher comments are still personal data, and Supabase Auth logs login IP addresses, so the overseas-transfer
paperwork (transfer impact assessment) and the enrolment consent still apply — minimising data reduces risk
but does not remove these obligations. Confirming whether SHINING falls under the Cybersecurity-law data
localisation rules (Decree 333/2026) remains a legal check for the owner before go-live. Retention: export
and delete a student's records on request or 12 months after they leave (admin tool in M2).

## 5. Pre-production checklist (Milestone 8)
Self-sign-up disabled · email confirmations configured · leaked-password protection on · MFA for admins ·
RLS tests green against the real Supabase project · Supabase security advisor clean · backups verified by
a restore drill · no service key in client bundle (build-time check) · CSP & security headers set.
