-- =============================================================================
-- 0006 FEEDBACK · PROGRESS · PARENT REPORTS
-- =============================================================================

create table public.teacher_comments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete restrict,
  attempt_id          uuid references public.test_attempts(id) on delete cascade,
  student_answer_id   uuid references public.student_answers(id) on delete cascade,
  author_id           uuid not null references public.profiles(id) on delete restrict,
  kind                public.comment_kind not null,
  body                text not null check (char_length(body) between 1 and 4000),
  visible_to_student  boolean not null default true,
  visible_to_parent   boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  check (kind <> 'question'        or student_answer_id is not null),
  check (kind <> 'attempt_overall' or attempt_id is not null)
);
create index teacher_comments_student_idx on public.teacher_comments (student_id, created_at desc);
create index teacher_comments_attempt_idx on public.teacher_comments (attempt_id);
create index teacher_comments_answer_idx  on public.teacher_comments (student_answer_id);

create table public.feedback_templates (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'general'
                check (category in ('general', 'vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'homework', 'progress')),
  body_en     text check (body_en is null or char_length(body_en) <= 1000),
  body_vi     text check (body_vi is null or char_length(body_vi) <= 1000),
  is_shared   boolean not null default true,  -- shared with all teachers
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  check (body_en is not null or body_vi is not null)
);

-- Non-test practice (flashcards, vocabulary games, story listening). Test
-- performance is NOT duplicated here; it is computed from student_answers.
create table public.progress_records (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  activity          text not null check (activity in ('flashcards', 'vocabulary_practice', 'grammar_practice', 'story', 'lesson_view')),
  skill             public.skill,
  lesson_id         uuid references public.lessons(id) on delete set null,
  story_id          uuid references public.stories(id) on delete set null,
  score             numeric(6,2) check (score is null or score >= 0),
  max_score         numeric(6,2) check (max_score is null or max_score > 0),
  duration_seconds  integer check (duration_seconds is null or duration_seconds between 0 and 14400),
  recorded_at       timestamptz not null default now(),
  check (score is null or max_score is null or score <= max_score)
);
create index progress_records_student_idx on public.progress_records (student_id, recorded_at desc);

create table public.parent_reports (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students(id) on delete restrict,
  class_id         uuid references public.classes(id) on delete set null,
  report_type      public.report_type not null,
  period_start     date,
  period_end       date,
  attempt_id       uuid references public.test_attempts(id) on delete restrict,
  data_snapshot    jsonb not null,   -- computed server-side from DB records; never client-supplied
  strengths        text check (strengths is null or char_length(strengths) <= 2000),
  improvements     text check (improvements is null or char_length(improvements) <= 2000),
  teacher_comment  text check (teacher_comment is null or char_length(teacher_comment) <= 4000),
  status           public.report_status not null default 'draft',
  created_by       uuid not null references public.profiles(id) on delete restrict,
  published_at     timestamptz,
  pdf_path         text,
  png_path         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  check (report_type <> 'monthly' or (period_start is not null and period_end is not null and period_end >= period_start)),
  check (report_type <> 'test' or attempt_id is not null),
  check (status <> 'published' or published_at is not null)
);
create index parent_reports_student_idx on public.parent_reports (student_id, created_at desc);

create trigger teacher_comments_updated_at   before update on public.teacher_comments   for each row execute function private.set_updated_at();
create trigger feedback_templates_updated_at before update on public.feedback_templates for each row execute function private.set_updated_at();
create trigger parent_reports_updated_at     before update on public.parent_reports     for each row execute function private.set_updated_at();
