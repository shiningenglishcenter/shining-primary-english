# Implementation Plan

Each milestone ends with: tests green · security review · docs + `PROJECT_STATUS.md` updated · PR with summary.
Database work for later milestones is already done (schema, RLS, RPCs for M2–M6), so later milestones are
mostly UI on top of a tested data layer.

| Milestone | Scope | Exit criteria |
|---|---|---|
| **0 Discovery & architecture** | Repo inspection, architecture, schema, security model, costs | ✅ docs; ✅ migrations + 140 passing DB tests |
| **1 Foundation** | Scaffold Next.js (strict TS, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Playwright); Supabase SSR clients; login (username *or* email + password); role layouts and guards; design tokens & Shining brand; dashboards (empty states); `/api/health`; CI (lint, typecheck, unit, DB tests) | login/logout/session-expiry/unauthorized e2e; DB tests in CI |
| **2 People & classes (admin)** ✅ | Create accounts (service-role server action), students and teachers (create/edit, login, password reset, lock), classes with a level, enrolment, teacher assignment. *Deferred by owner (D21): parents, CSV import.* | role tests for every screen; audit of account creation |
| **3 Learning content (admin)** | Curriculum tree with reorder/publish, vocabulary (image/audio upload), grammar topics, learning materials, media upload with signed URLs; CSV/Excel import for vocabulary | admin e2e; student sees only published content of own level |
| **4 Learning & testing** | Student home, lessons, flashcards & vocabulary games (writes `progress_records`), question editor for 8 types, tests, assignments, test-taking UI with autosave & timer, results page | grading e2e per question type; keys absent from network payloads |
| **5 Teacher workspace & progress** | Teacher dashboard (classes, active/complete/incomplete, students needing support), submission review with per-question comments, manual grading, overall feedback, template library, weekly/monthly charts | teacher e2e; "needs support" rule documented |
| **6 Parent reports** | Monthly + test report templates, preview, editable comments with templates, PNG/PDF export (Vietnamese font), upload & publish, parent portal | report figures = DB; PDF/PNG render tests incl. diacritics; mobile layout check |
| **7 Story library** | Story CRUD, video/audio player, WebVTT subtitles, transcript, listening exercises | playback on iOS/Android browsers |
| **8 Production readiness** | Full test pass, performance review, error handling, monitoring/alerts, backup restore drill, deployment & recovery docs | owner approval → production deploy |

## Re-plan (owner, 2026-11-10)
The main purpose is students doing exercises. New order:
**Phase 1 ✅ practice library + Starters pack + content editor** → pilot & feedback →
**Phase 1.1 ✅ feedback: programmes (Cambridge / Global Success), one theme, 4 new kinds, G1 pack, speed,
loading** (2026-11-11) → **Phase 1.2 ✅ hints/tries, results pages, EN/VI, video exercises** (2026-11-12) →
**Phase 1.3 (next): guest links + new login screen** — owner decisions 2026-11-13: per-activity switch
"no login needed", **off by default**; a public link with a random token that **does not expire** (the
teacher can turn it off or make a new one); the child **types a first name before starting**; scores of
guest rounds are kept per link (name, score, time) for the teacher's results, never in a student account;
redesigned login screen in the kid theme → Phase 2 mock tests
(Cambridge format, question bank) → Phase 3 teacher homework (assign, deadline, Zalo message, tracking) →
Movers/Flyers content → later: teacher grading/comments, parents and reports, stories.

## MVP scope (owner decisions, 2026-11-09)
"MVP first, easy features first"; then the owner moved stories (without video), vocabulary games and all
question types into the MVP. **Video is the only content type excluded** (storage/bandwidth).

**MVP = M1 → M2 → M3 → M4 → M5-lite → M6 → M7-lite.** The database already supports all of it.

| In MVP | Deferred to after MVP |
|---|---|
| Login (username/password), role dashboards | **Video** for stories/lessons (hosting decided later; `media_assets.provider` ready) |
| Admin: students, parents, teachers, classes, enrolment | Subtitles (WebVTT) — only needed with video |
| Content: levels → units → lessons, vocabulary with picture + pronunciation audio, grammar pages | Progress charts (weekly/monthly) — M5 full |
| Vocabulary activities: flashcards, meaning quiz, picture selection, listen-and-choose, spelling, fill-in-the-blank, review | CSV/Excel import |
| All 8 question types incl. matching, rearrange, picture choice; listening questions with audio | |
| Story library **without video**: text + transcript, cover image, optional narration audio, target vocabulary/grammar, comprehension questions | |
| Assign to class or student, take test with timer, auto-grade | |
| Teacher review: per-question comments, manual grading, overall feedback, templates | |
| Parent monthly + test report, preview, PNG/PDF export, parent portal | |

Storage note: images (≤ 200 KB, WebP) and audio (≤ 1 MB, MP3 64–96 kbps) for ~2,000 words and ~100 stories
≈ 1–3 GB — far inside the 100 GB / 250 GB egress included in Supabase Pro. Uploads are resized/compressed
in the browser before upload; the bucket rejects video MIME types until video is enabled.

## "Students needing support" (proposed rule, M5)
Flag a student when any of: average score < 60 % over the last 4 graded tests · ≥ 2 overdue assignments ·
a skill below 50 % with ≥ 10 questions answered this month · no activity for 14 days. Thresholds stored in a
settings table so the centre can tune them.
