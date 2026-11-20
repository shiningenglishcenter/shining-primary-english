# Project Status

_Last updated: 2026-11-20_

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

**Milestone 2 — People & classes (admin)** ✅ (PR #3, merged)
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

## Current milestone
**Phase 1 — Practice library (Starters pilot)** ✅ built, awaiting owner review (PR on branch `milestone-1`)
- Owner direction (D23): the system is mainly for students doing exercises; organise by level → topic;
  every account opens every level; teachers edit content; pilot with Starters, then feedback.
- **Students** (`/learn`): level tabs Starters / Movers / Flyers, each with its own theme (D24); topic grid
  with stars; topic page with its activities; player with **8 games** — flashcards, listen & choose,
  look & choose, match, look & spell, yes/no, fill the blank, make a sentence. Device voice reads the
  English; Web Audio tones; mute; a wrong answer gives a hint and the child retries (points only for a
  first-try answer); celebration with 0–3 stars; result saved.
- **Starters pack** (original content): 12 topics, 134 words, 96 activities (8 per topic) with Fluent
  Emoji 3D pictures. Source `content/starters.mts` → `npm run content:build` → migration 0014.
- **Teachers and admins** (`/teacher/content`, `/admin/content`): topics per level (draft/published),
  vocabulary with emoji pictures, activities: pick words for word games, write items for sentence games
  (validated: blanks, right answer among options, 2–10 words). Students see only published content.
- Migration 0013: `topics`, `practice_activities`, `vocabulary.topic_id/emoji`, `record_practice()`,
  open read access for published practice, staff write access, progress per activity.
- Fixed: forms no longer lose what was typed after a failed save (React 19 form reset) — admin forms too.

### Phase 1.1 — Pilot feedback (2026-11-11, same branch)
From the owner's demo with teachers:
- **Speed** (D25): functions moved to Tokyo next to Supabase; fewer and parallel Supabase calls per page.
- **Loading feedback** (D25): top progress bar on every navigation + skeleton pages.
- **Programmes** (D26): Cambridge (Starters/Movers/Flyers) and Global Success (G1–G5) tabs for students and
  in the editor; Global Success topics are called units.
- **One theme** (D27): pale yellow + green for every level.
- **4 new activity kinds** (D28): listen and write, listening (YouTube or uploaded audio), reading, skills
  challenge (mixed). Editor support for each, including audio upload.
- **Global Success 1 pack**: 16 units, 78 words, 11 activities per unit (reading and skills challenge
  included). Unit titles are from memory of the syllabus — **teachers should check them** (editable).
- Starters: every topic gains *Listen and write* and a *Skills challenge* (10 activities per topic).

### Phase 1.2 — Pilot feedback 2 (2026-11-12, same branch)
- **Hints and move-on** (D29): teachers set hints on/off and wrong answers allowed (default 3) per
  activity, and may write a hint per question; out of tries → answer shown, next question. Scoring 2/1/0;
  stars follow the latest attempt.
- **Results pages** (D29): `/teacher/results`, `/admin/results` — by student or by activity, per class,
  with period and level filters; detail page per student.
- **Language** (D30): students choose EN (default) or VI.
- **Results v2** (D32): auto-applied filters, sortable columns, paging; students × topics colour grid;
  student page with skills, to-review list, often-wrong words, topic blocks incl. undone activities.
- **Share links** (D33) with an editable, remembered message; **sounds and animations** (D34).
- Fixed: password reset crashed on the preview when the service-role key is missing (now a clear
  message); revoked sessions are refused again without slowing pages (0021).
- **Video exercises** (D31): 13 YouTube song activities (8 Starters, 5 GS1). Not playable from the build
  environment — **teachers should watch each once** and swap links in the editor if needed.

### Phase 1.3 — Guest links and new login (2026-11-13, same branch)
- **Guest links** (D35): "no login needed" switch per activity (off by default), permanent public link,
  first name before playing, results under Kết quả → "Link không cần đăng nhập"; new link stops the old.
- **Login screen** (D36) redesigned in the kids' theme with EN/VI.
- **User guide** (D37): public page `/huong-dan` with screenshots.
- **Pilot feedback** (D38): public page `/gop-y`, floating button for teachers/admins, admin triage at
  `/admin/gop-y` with CSV export. v2 (D39): name + Zalo required, ideas section first, compact layout;
  guide overview of all programmes and topics; links to emoji sites.
- 12 trial student accounts (`hs.thu01`–`hs.thu12`) in class `SAMPLE-TRIAL` on `shining-dev`.

### Phase 1.4 — Teacher feedback, round 1 (2026-11-20, branch `milestone-2-feedback`)
From the 9 pilot teachers' feedback (`/admin/gop-y`; averages: pupils like it 4.6, ready 4.0, easy to prepare 2.8,
results page 2.8). D40, D41.
- **C3** Yes/No (also inside listening, reading and skills challenge): one answer only; wrong → answer shown,
  next question after 3 s. The editor explains this under "Sai … lần".
- **C4** Sounds checked on Listen Yes/No; a small one-time "Bật tiếng để nghe" / "Turn the sound on" tip when
  the browser blocks audio, and once per iPhone/iPad (silent switch).
- **C5** Match: 4 pairs per screen on phones, up to 6 on tablets/desktops (12 words per activity).
- **C8** Every seeded Starters/GS1 sentence activity now has ≥ 6 questions (Starters: +1 fill-in, +2 sentences
  per topic; GS1: +2 Yes/No, +3 fill-in, +3 sentences, +3 reading questions per unit) — migration 0025 leaves
  activities a teacher edited alone. Word games with fewer than 6 words repeat words up to 6 questions.
  **Not changed**: the 13 video activities (4 questions each) — questions must match each song; teachers who
  watch them can add questions in the editor.
- **C10** Flashcards flip to show the Vietnamese meaning.
- **A2** Topic editor: "Bước tiếp theo: tạo bài luyện" box after the word list with **"Tạo nhanh … bài từ danh
  sách từ"** (5 draft word games, kinds already in the topic skipped).
- `docs/DESIGN_SYSTEM.md` and the UI/UX Pro Max skill (`.claude/skills/ui-ux-pro-max/`, MIT).

### Phase 1.5 — Teacher feedback, round 2 (2026-11-20, same branch)
Owner decisions: uploads ≤ 2 MB and visible through guest links; "practise the mistakes" earns no stars but is
recorded. D42–D45.
- **A1** Picture picker on every emoji field (search in English or Vietnamese, suggestions for the word) and
  picture upload per word (shrunk to ≤ 512 px in the browser).
- **B1–B3** Results: "Xem chi tiết" button per student; latest rounds with the questions missed; every round per
  activity; "Cả lớp hay sai" box and a full view ranked by number of students.
- **C2** End screen: "Xem lại câu chưa đúng" with the answers and "Luyện lại câu sai"; no stars, recorded.
- **C1** Garden, monkey in the tree, grandfather/grandmother (walking stick), frog jumping: new pictures; a
  pointing hand for "This/That …" sentences. `this/that` needed no data change.

### To deploy to the preview (owner)
Supabase `shining-dev` → SQL Editor, in order (skip any already run):
1. `supabase/migrations/20261110000013_practice.sql`
2. `supabase/migrations/20261110000014_starters_content.sql`
3. `supabase/migrations/20261111000015_practice_skills.sql` ← run alone first (adds the new kinds)
4. `supabase/migrations/20261111000016_gs1_content.sql`
5. `supabase/migrations/20261111000017_starters_skills.sql`
6. `supabase/migrations/20261112000018_practice_settings.sql`
7. `supabase/migrations/20261112000019_video_activities.sql`
8. `supabase/migrations/20261112000020_practice_details.sql`
9. `supabase/migrations/20261113000021_current_profile.sql`
10. `supabase/migrations/20261113000022_guest_links.sql`
11. `supabase/migrations/20261113000023_feedback.sql`
12. `supabase/migrations/20261113000024_feedback_required_catalog.sql`
13. `supabase/migrations/20261120000025_more_questions.sql` (C8; safe to re-run, touches only unedited activities)
14. `supabase/migrations/20261120000026_word_images.sql` (A1)
15. `supabase/migrations/20261120000027_practice_retry.sql` (C2)
16. `supabase/migrations/20261120000028_clearer_pictures.sql` (C1; touches only unedited rows)

**Run 14–16 before deploying Phase 1.5**: the new code reads `vocabulary.image_path` and
`progress_records.is_retry`; students' pages fail until those columns exist.

Vercel → Settings → Environment Variables: `SUPABASE_SERVICE_ROLE_KEY` must be set for **Preview** too
(account creation and password reset need it). Settings → Deployment Protection: turn off Vercel
Authentication so testers can open preview links.

Recommended: Supabase → Settings → JWT Keys → enable asymmetric signing keys, so `getClaims()` checks
sessions without calling the Auth server. Vercel picks up the Tokyo region from `vercel.json` on the
next deploy (check: Project → Settings → Functions → Region).

## Next
Teachers try Phase 1.1 → then Phase 2 mock tests (Cambridge format), Phase 3 teacher homework, Movers/
Flyers and G2–G5 content, as the owner decides.

## Test status
| Suite | Result |
|---|---|
| DB (migrations + RLS/grading/reports/health/account audit/practice) | 263/263 |
| Unit (Vitest) | 88/88 |
| End-to-end (Playwright, real local Supabase): M1 login/session/redirect suite + M2: every admin screen refused for teacher/student/parent and signed-out visitors; create class → student with login → student signs in; numbered usernames; teacher by username and by email, assigned → sees class; lock/unlock; password reset; name edit shows after login; login created later; enrol/remove; search | 49/49 (desktop + phone viewport) |

Phase 1.3: full e2e suite **57/57** on a local Supabase stack (2026-11-13), incl. guest links and login.

Phase 1.4 (2026-11-20): DB **267/267**, unit **99/99**, e2e **64/64** on a local Supabase stack, incl. Yes/No single
answer, flashcard flip, match 6/4 pairs (desktop/phone), sound tip, GS1 ≥ 6 questions, quick create.

Phase 1.5 (2026-11-20): DB **287/287**, unit **108/108**, e2e **66/66** on a local Supabase stack, incl. picker
(English/Vietnamese/suggestions), picture upload shown to pupils, 2 MB limit, retry round without stars, retry
and mistakes on the teacher's student page, class "hay sai" view.

Phase 1 e2e: levels open with their themes; a student plays all 8 games of a topic and earns 3 stars each;
a wrong first answer costs the point; editor is staff-only; a teacher builds a Movers topic (words,
word game, sentence game with validation) and students see it only after publishing.

Still not run against a hosted Supabase project — required before production (M8).

## Known limitations
- Accounts sign in with a username **or** a real email, not both (ARCHITECTURE D16).
- No generated Supabase TypeScript types yet (queries are typed by hand); planned for M3.
- Admin screens are built for desktop/tablet; on phones the tables scroll sideways.
- Re-enrolling a student who left a class re-opens the same enrolment row (the earlier dates are replaced).
- Preview runs on Vercel Hobby with the repo temporarily **public** (Hobby cannot deploy private
  organization repos, and forbids commercial use): sample data only, no real students until Vercel Pro.

## Technical decisions
See `ARCHITECTURE.md` §2 (D1–D45; Phase 1.5: D42–D45; Phase 1.4: D40–D41; Phase 1.1: D25–D28; Phase 1.2: D29–D34; Phase 1.3: D35–D39). New in M1: D18 (Cache Components + proxy/guard split), D19 (profile
provisioning), D20 (Vietnamese UI, self-hosted font). New in M2: D21 (reduced scope), D22 (levels, codes,
usernames, passwords).

## Outstanding questions (need owner)
1. **Before real students**: upgrade Vercel to Pro and make the repository private again.
2. Before go-live (owner/legal, not blocking development): enrolment consent wording; transfer impact
   assessment for overseas hosting; confirm Decree 333/2026 localisation does not apply.

## Resolved decisions
- 2026-11-12 — Hints configurable, default on, move on after 3 wrong answers; 2/1/0 points per question;
  results use the latest attempt; results pages for teachers; student UI EN (default) / VI only for
  students; video exercises published directly, teachers fix later (D29–D31).
- 2026-11-11 — Organise as Cambridge / Global Success → level; one pale-yellow + green theme; add
  listening (YouTube or teacher audio), reading, listen-and-write and a skills challenge; seed G1;
  loading bar + skeletons; Supabase region is Tokyo (D25–D28).
- 2026-11-10 — Practice library first, every level open to every account, teachers edit content,
  Starters pilot; one theme per level; Fluent Emoji pictures; free device voice for now; QR login cards
  and teacher homework later (D23, D24).
- 2026-11-09 — M2 scope: students + teachers + classes only; parents and CSV import later. Teachers assign
  and grade work. Levels: Starters, Movers, Flyers, Global Success 1–5. Passwords generated and shown once.
- 2026-11-09 — Preview environment: Supabase `shining-dev` (Northeast Asia / Tokyo, free, `[SAMPLE]` seed, sign-up
  disabled) + Vercel Hobby; repository made public for the trial period (owner decision).
- 2026-11-09 — GitHub repo `shiningenglishcenter/shining-primary-english`; work on branches + PRs.
- 2026-11-09 — Hosting: Supabase Singapore + Vercel (ARCHITECTURE D15).
- 2026-11-09 — Login: centre-created username + password for students and parents (D16).
- 2026-11-09 — MVP includes stories (no video), vocabulary games and all 8 question types incl. picture
  and listening; only video is deferred. Media bucket limited to images/audio/PDF, 20 MB.
- 2026-11-09 — Minimal personal data; `students.date_of_birth` removed from the schema (D17).
