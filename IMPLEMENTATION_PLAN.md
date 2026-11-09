# Implementation Plan

Each milestone ends with: tests green · security review · docs + `PROJECT_STATUS.md` updated · PR with summary.
Database work for later milestones is already done (schema, RLS, RPCs for M2–M6), so later milestones are
mostly UI on top of a tested data layer.

| Milestone | Scope | Exit criteria |
|---|---|---|
| **0 Discovery & architecture** | Repo inspection, architecture, schema, security model, costs | ✅ docs; ✅ migrations + 140 passing DB tests |
| **1 Foundation** | Scaffold Next.js (strict TS, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Playwright); Supabase SSR clients; login (username *or* email + password); role layouts and guards; design tokens & Shining brand; dashboards (empty states); `/api/health`; CI (lint, typecheck, unit, DB tests) | login/logout/session-expiry/unauthorized e2e; DB tests in CI |
| **2 People & classes (admin)** | Create accounts (service-role server action), students/parents/teachers CRUD, link parents, classes, class levels, enrolment, teacher assignment, CSV import of students | role tests for every screen; audit of account creation |
| **3 Learning content (admin)** | Curriculum tree with reorder/publish, vocabulary (image/audio upload), grammar topics, learning materials, media upload with signed URLs; CSV/Excel import for vocabulary | admin e2e; student sees only published content of own level |
| **4 Learning & testing** | Student home, lessons, flashcards & vocabulary games (writes `progress_records`), question editor for 8 types, tests, assignments, test-taking UI with autosave & timer, results page | grading e2e per question type; keys absent from network payloads |
| **5 Teacher workspace & progress** | Teacher dashboard (classes, active/complete/incomplete, students needing support), submission review with per-question comments, manual grading, overall feedback, template library, weekly/monthly charts | teacher e2e; "needs support" rule documented |
| **6 Parent reports** | Monthly + test report templates, preview, editable comments with templates, PNG/PDF export (Vietnamese font), upload & publish, parent portal | report figures = DB; PDF/PNG render tests incl. diacritics; mobile layout check |
| **7 Story library** | Story CRUD, video/audio player, WebVTT subtitles, transcript, listening exercises | playback on iOS/Android browsers |
| **8 Production readiness** | Full test pass, performance review, error handling, monitoring/alerts, backup restore drill, deployment & recovery docs | owner approval → production deploy |

## "Students needing support" (proposed rule, M5)
Flag a student when any of: average score < 60 % over the last 4 graded tests · ≥ 2 overdue assignments ·
a skill below 50 % with ≥ 10 questions answered this month · no activity for 14 days. Thresholds stored in a
settings table so the centre can tune them.
