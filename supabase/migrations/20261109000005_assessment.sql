-- =============================================================================
-- 0005 ASSESSMENT: question bank · answer keys · tests · assignments · attempts
-- =============================================================================
-- Answer secrecy model
--   * Correct answers live ONLY in question_answer_keys. question_options has no
--     is_correct column, so no student-readable table ever contains a key.
--   * Students have NO select access to questions/options/keys. They receive a
--     question paper through get_attempt_paper() (no keys) and see answers only
--     through get_attempt_review() after submitting.
--   * Students cannot write attempts/answers directly; only the RPCs in 0007
--     (security definer, validated) can.
-- =============================================================================

create table public.question_stimuli (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('passage', 'audio', 'image', 'video')),
  title           text,
  body            text,  -- reading passage / transcript
  media_asset_id  uuid references public.media_assets(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table public.questions (
  id                uuid primary key default gen_random_uuid(),
  type              public.question_type not null,
  skill             public.skill not null,
  prompt            text not null check (char_length(prompt) between 1 and 4000),
  instructions      text,
  -- Non-secret, type-specific structure shown to students:
  --   fill_blank: {"blanks": 2}   matching: {"left":[{id,label}], "right":[{id,label}]}
  --   rearrange:  {"tokens": ["like","I","apples","."]}
  data              jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  image_asset_id    uuid references public.media_assets(id) on delete set null,
  audio_asset_id    uuid references public.media_assets(id) on delete set null,
  stimulus_id       uuid references public.question_stimuli(id) on delete set null,
  level_id          uuid references public.levels(id) on delete set null,
  unit_id           uuid references public.units(id) on delete set null,
  lesson_id         uuid references public.lessons(id) on delete set null,
  grammar_topic_id  uuid references public.grammar_topics(id) on delete set null,
  default_points    numeric(6,2) not null default 1 check (default_points > 0),
  status            public.publish_status not null default 'draft',
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index questions_bank_idx on public.questions (level_id, unit_id, skill) where deleted_at is null;
create index questions_grammar_idx on public.questions (grammar_topic_id);

create table public.question_options (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.questions(id) on delete cascade,
  label           text,
  image_asset_id  uuid references public.media_assets(id) on delete set null,
  sort_order      integer not null default 0,
  check (label is not null or image_asset_id is not null)
);
create index question_options_question_idx on public.question_options (question_id, sort_order);

-- Key shapes (validated by private.grade_response):
--   multiple_choice / true_false / picture_choice : {"option_ids": [uuid, ...]}
--   fill_blank   : {"blanks": [["apple","an apple"], ["red"]]}   (accepted per blank)
--   matching     : {"pairs": {"<leftId>": "<rightId>", ...}}
--   rearrange    : {"accepted": ["I like apples."]}
--   short_answer : {"accepted": ["a cat", "cat"]}
--   written      : {}  (manual grading; optional {"rubric": "..."})
create table public.question_answer_keys (
  question_id  uuid primary key references public.questions(id) on delete cascade,
  key          jsonb not null check (jsonb_typeof(key) = 'object'),
  explanation  text,
  updated_at   timestamptz not null default now()
);

create table public.tests (
  id                         uuid primary key default gen_random_uuid(),
  title                      text not null check (char_length(title) between 1 and 200),
  description                text,
  kind                       text not null default 'quiz' check (kind in ('practice', 'quiz', 'exam')),
  level_id                   uuid references public.levels(id) on delete set null,
  unit_id                    uuid references public.units(id) on delete set null,
  lesson_id                  uuid references public.lessons(id) on delete set null,
  skill                      public.skill,  -- null = mixed
  time_limit_minutes         integer check (time_limit_minutes is null or time_limit_minutes between 1 and 300),
  shuffle_questions          boolean not null default false,
  show_answers_after_submit  boolean not null default true,
  status                     public.publish_status not null default 'draft',
  created_by                 uuid references auth.users(id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  deleted_at                 timestamptz
);
create index tests_bank_idx on public.tests (level_id, unit_id, skill) where deleted_at is null;

create table public.test_questions (
  test_id      uuid not null references public.tests(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete restrict,
  sort_order   integer not null default 0,
  points       numeric(6,2) not null default 1 check (points > 0),
  primary key (test_id, question_id)
);
create index test_questions_question_idx on public.test_questions (question_id);

alter table public.learning_materials
  add constraint learning_materials_test_fk foreign key (test_id) references public.tests(id) on delete restrict;
alter table public.stories
  add constraint stories_comprehension_test_fk foreign key (comprehension_test_id) references public.tests(id) on delete set null;

create table public.assignments (
  id                  uuid primary key default gen_random_uuid(),
  test_id             uuid not null references public.tests(id) on delete restrict,
  class_id            uuid references public.classes(id) on delete restrict,  -- null = individual students only
  title               text not null check (char_length(title) between 1 and 200),
  instructions        text,
  assigned_by         uuid not null references public.profiles(id) on delete restrict,
  opens_at            timestamptz not null default now(),
  due_at              timestamptz,
  time_limit_minutes  integer check (time_limit_minutes is null or time_limit_minutes between 1 and 300),
  max_attempts        smallint not null default 1 check (max_attempts between 1 and 10),
  is_cancelled        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  check (due_at is null or due_at > opens_at)
);
create index assignments_class_idx on public.assignments (class_id, due_at);
create index assignments_test_idx  on public.assignments (test_id);

create table public.assignment_students (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete restrict,
  assigned_at    timestamptz not null default now(),
  is_excused     boolean not null default false,
  unique (assignment_id, student_id)
);
create index assignment_students_student_idx on public.assignment_students (student_id);

create table public.test_attempts (
  id                     uuid primary key default gen_random_uuid(),
  assignment_student_id  uuid not null references public.assignment_students(id) on delete restrict,
  student_id             uuid not null references public.students(id) on delete restrict,
  test_id                uuid not null references public.tests(id) on delete restrict,
  attempt_number         smallint not null check (attempt_number >= 1),
  status                 public.attempt_status not null default 'in_progress',
  started_at             timestamptz not null default now(),
  deadline_at            timestamptz,  -- started_at + time limit (server-enforced)
  submitted_at           timestamptz,
  graded_at              timestamptz,
  auto_score             numeric(8,2),
  total_score            numeric(8,2),
  max_score              numeric(8,2) not null default 0,
  is_late                boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (assignment_student_id, attempt_number),
  check (status = 'in_progress' or submitted_at is not null)
);
create index test_attempts_student_idx on public.test_attempts (student_id, submitted_at desc);
create index test_attempts_test_idx    on public.test_attempts (test_id);

create table public.student_answers (
  id                    uuid primary key default gen_random_uuid(),
  attempt_id            uuid not null references public.test_attempts(id) on delete cascade,
  question_id           uuid not null references public.questions(id) on delete restrict,
  sort_order            integer not null default 0,
  skill                 public.skill not null,         -- snapshot for reporting
  max_points            numeric(6,2) not null check (max_points > 0),
  response              jsonb,
  answered_at           timestamptz,
  is_correct            boolean,
  auto_points           numeric(6,2),
  final_points          numeric(6,2),
  needs_manual_grading  boolean not null default false,
  manually_graded       boolean not null default false,
  unique (attempt_id, question_id),
  check (response is null or pg_column_size(response) <= 16384),
  check (final_points is null or (final_points >= 0 and final_points <= max_points))
);
create index student_answers_attempt_idx on public.student_answers (attempt_id, sort_order);

create table public.manual_grades (
  id                 uuid primary key default gen_random_uuid(),
  student_answer_id  uuid not null references public.student_answers(id) on delete cascade,
  graded_by          uuid not null references public.profiles(id) on delete restrict,
  points             numeric(6,2) not null check (points >= 0),
  created_at         timestamptz not null default now()
);
create index manual_grades_answer_idx on public.manual_grades (student_answer_id, created_at desc);

create trigger questions_updated_at        before update on public.questions        for each row execute function private.set_updated_at();
create trigger question_stimuli_updated_at before update on public.question_stimuli for each row execute function private.set_updated_at();
create trigger tests_updated_at            before update on public.tests            for each row execute function private.set_updated_at();
create trigger assignments_updated_at      before update on public.assignments      for each row execute function private.set_updated_at();
create trigger test_attempts_updated_at    before update on public.test_attempts    for each row execute function private.set_updated_at();
create trigger answer_keys_updated_at      before update on public.question_answer_keys for each row execute function private.set_updated_at();

-- ---------------------------------------------- historical integrity ---------
-- Once anyone has attempted a test, its question list, points and keys are
-- frozen so stored scores always match what the student actually sat.
-- To change it, duplicate the test (admin UI "Duplicate & edit").
create or replace function private.forbid_change_if_attempted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_question uuid;
  v_test uuid;
begin
  if tg_table_name = 'test_questions' then
    v_test := coalesce(new.test_id, old.test_id);
    if exists (select 1 from public.test_attempts a where a.test_id = v_test) then
      raise exception 'test already attempted; duplicate it to make changes' using errcode = '55000';
    end if;
  elsif tg_table_name = 'question_answer_keys' then
    v_question := coalesce(new.question_id, old.question_id);
    if exists (select 1 from public.student_answers sa where sa.question_id = v_question) then
      raise exception 'question already answered by students; duplicate it to change the key' using errcode = '55000';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger test_questions_freeze before insert or update or delete on public.test_questions
  for each row execute function private.forbid_change_if_attempted();
create trigger answer_keys_freeze before update or delete on public.question_answer_keys
  for each row execute function private.forbid_change_if_attempted();
