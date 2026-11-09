# Database Schema

Source of truth: `supabase/migrations/*.sql` (applied in filename order). This document explains them.
Conventions: `uuid` PKs, `snake_case` plural tables, `created_at/updated_at` (trigger), soft delete via
`deleted_at` on user-facing entities, history tables append-only. `private` schema = helpers not exposed by
the API.

## Entity overview

```
auth.users 1─1 profiles ─┬─1 teachers ── teacher_classes ──┐
                         ├─1 students ── class_students ───┼── classes ── class_levels ── levels
                         └─1 parents  ── student_parents ──┘

levels ─< grades ─< units ─< lessons ─< learning_materials ──> media_assets
   │                  │         ├─< lesson_vocabulary >── vocabulary
   │                  │         └─< lesson_grammar_topics >── grammar_topics
   └─< stories (video/audio/subtitle → media_assets; comprehension_test → tests)

questions ─< question_options          question_answer_keys (1─1 questions, staff only)
tests ─< test_questions >─ questions
assignments (test, class?) ─< assignment_students (student) ─< test_attempts ─< student_answers ─< manual_grades
teacher_comments (student, attempt?, answer?)   feedback_templates   progress_records   parent_reports
```

## Tables (by migration)

| Migration | Tables |
|---|---|
| 0001 foundation | `roles`, `private.audit_log`, `private.rate_limits`; enums |
| 0002 curriculum | `levels`, `grades`, `units`, `lessons`, `media_assets`, `learning_materials` |
| 0003 people & classes | `profiles`, `teachers`, `students`, `student_notes`, `parents`, `student_parents`, `classes`, `class_levels`, `class_students`, `teacher_classes` |
| 0004 content | `vocabulary`, `lesson_vocabulary`, `grammar_topics`, `lesson_grammar_topics`, `unit_grammar_topics`, `stories`, `story_vocabulary`, `story_grammar_topics` |
| 0005 assessment | `question_stimuli`, `questions`, `question_options`, `question_answer_keys`, `tests`, `test_questions`, `assignments`, `assignment_students`, `test_attempts`, `student_answers`, `manual_grades` |
| 0006 feedback/reports | `teacher_comments`, `feedback_templates`, `progress_records`, `parent_reports` |
| 0007 rls | helper functions, grants, all policies |
| 0008 rpc | grading + workflow functions |
| 0009 storage | buckets `learning-media`, `reports` + object policies |
| 0010 health | `health_check()` for `/api/health` |
| 0011 provisioning fix | profile created when `app_metadata.role` appears (Auth Admin API) |
| 0012 admin people | standard levels seeded; `students.student_code` defaults to `HSnnnn`; `log_account_event()`; lock/unlock audited |

### Notes on choices vs. the requested table list
- **roles**: lookup table; `profiles.role` is an enum with an FK to it (one role per account; a person who is
  both teacher and parent gets two accounts — simplest safe model).
- **students / parents** have their own ids and an optional `profile_id`, so a child can be enrolled before
  having a login.
- **student_notes**: staff-only notes split from `students` so students/parents can never read them.
- **class_levels**: which curriculum levels a class can study (e.g. Movers + Global Success 4).
- **question_stimuli**: shared reading passage / listening audio for comprehension questions. "Reading
  comprehension" and "listening comprehension" are therefore *skills* on ordinary question types, not separate
  types.
- **question_answer_keys**: replaces `question_options.is_correct` so keys are never in a student-readable row.
- **test_questions**: tests reuse questions from the bank with per-test points.
- **progress_records**: non-test practice only (flashcards, games, stories). Test performance is computed
  from `student_answers` (which snapshots `skill` and `max_points`) to avoid duplicated, drift-prone data.
- **manual_grades**: full history of manual grades; `student_answers.final_points` holds the current value.

## Question types and answer formats

| type | `questions.data` (visible) | response (`save_answer`) | key (`question_answer_keys.key`) | scoring |
|---|---|---|---|---|
| multiple_choice / true_false / picture_choice | – (options table) | `{"option_ids":[…]}` | `{"option_ids":[…]}` | all-or-nothing, order-insensitive |
| fill_blank | `{"blanks":n}` | `{"blanks":["…"]}` | `{"blanks":[["a","an"],…]}` | per blank |
| matching | `{"left":[…],"right":[…]}` | `{"pairs":{l:r}}` | `{"pairs":{l:r}}` | per pair |
| rearrange | `{"tokens":[…]}` (pre-shuffled) | `{"tokens":[…]}` | `{"accepted":["…"]}` | all-or-nothing |
| short_answer | – | `{"text":"…"}` | `{"accepted":["…"]}` | all-or-nothing |
| written | – | `{"text":"…"}` | `{"rubric":"…"}` optional | manual |

Text comparison is normalised: case, extra spaces, curly quotes, spaces before punctuation, trailing `.!?`.
Teachers can override any answer's points with `grade_answer()` (audited).

## RPC functions (callable by signed-in users)

| Function | Who | Purpose |
|---|---|---|
| `start_attempt(assignment_student_id)` | student | start/resume; enforces open date, max attempts, time limit |
| `get_attempt_paper(attempt_id)` | owning student | questions + options + saved responses, **no keys** |
| `save_answer(attempt_id, question_id, response)` | owning student | autosave while in progress and before deadline |
| `submit_attempt(attempt_id)` | owning student | grade on server; idempotent |
| `get_attempt_review(attempt_id)` | student (after submit), parent, teacher, admin | answers, keys, points, comments |
| `grade_answer(answer_id, points, comment?)` | teacher of student, admin | manual grading / override |
| `create_assignment(test, title, class?, students?, …)` | teacher (own class/students), admin | assignment + recipients atomically |
| `create_parent_report(student, type, period / attempt, class?)` | teacher of student, admin | report with DB-computed snapshot |
| `refresh_parent_report(report_id)` | same | recompute a draft |

## Indexes
Every FK used for filtering is indexed (see migrations); partial unique indexes ignore soft-deleted rows
(`… where deleted_at is null`). Active-membership lookups use partial indexes
(`class_students … where left_at is null`, `teacher_classes … where unassigned_at is null`) because every RLS
check walks them.
