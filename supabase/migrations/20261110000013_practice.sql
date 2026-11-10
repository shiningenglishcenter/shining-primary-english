-- =============================================================================
-- 0013 PRACTICE LIBRARY (Phase 1)
-- Owner decisions (2026-11-10):
--   * Practice is organised Level → Topic → short game-like activities.
--   * EVERY signed-in account may open every level (lower or higher than its
--     class), so published practice content is readable by all active users,
--     not only by members of a class with that level (ARCHITECTURE D23).
--   * Teachers as well as admins create and edit practice content.
-- Practice is low-stakes self-study: answers travel to the browser and the
-- browser scores the round. Results are only progress/stars; graded tests
-- keep using the server-side question bank (D3/D4).
-- =============================================================================

-- ------------------------------------------------------------- helpers ------
create or replace function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.current_app_role() is not null
$$;
revoke all on function private.is_active_user() from public;
grant execute on function private.is_active_user() to authenticated, service_role;

-- Image reference: a Fluent Emoji code point sequence such as "1f408" or
-- "1f469-1f3fd"; the app serves /emoji/<code>.webp.
create domain public.emoji_code as text
  check (value ~ '^[0-9a-f]{4,6}(-[0-9a-f]{4,6}){0,6}$');

-- -------------------------------------------------------------- topics ------
create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.levels(id) on delete restrict,
  code        text not null check (code ~ '^[a-z0-9-]{2,40}$'),
  title_en    text not null check (char_length(title_en) between 1 and 80),
  title_vi    text not null check (char_length(title_vi) between 1 and 80),
  emoji       public.emoji_code,
  sort_order  integer not null default 0,
  status      public.publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index topics_code_uq on public.topics (level_id, code) where deleted_at is null;
create index topics_level_idx on public.topics (level_id, sort_order) where deleted_at is null;
create trigger topics_updated_at before update on public.topics
  for each row execute function private.set_updated_at();

alter table public.vocabulary
  add column topic_id uuid references public.topics(id) on delete set null,
  add column emoji public.emoji_code;
create index vocabulary_topic_id_idx on public.vocabulary (topic_id) where deleted_at is null;

-- -------------------------------------------------- practice activities -----
create type public.practice_kind as enum (
  'flashcards',     -- picture + word + sound, flip through
  'listen_choose',  -- hear a word, pick its picture
  'look_choose',    -- see a picture, pick its word
  'spell',          -- see a picture, build the word from letter tiles
  'match',          -- pair words with pictures
  'fill_blank',     -- choose the word that completes a sentence
  'true_false',     -- picture + sentence: yes or no
  'rearrange'       -- put words in order to make a sentence
);

-- content shape (validated by the app, see src/features/practice/content.ts):
--   word games:      {"words": ["cat", "dog"]}  (empty/absent = all words of the topic)
--   fill_blank:      {"items": [{"sentence": "I've got a ___.", "answer": "cat", "options": ["cat","dog","egg"], "emoji": "1f408"}]}
--   true_false:      {"items": [{"sentence": "This is a dog.", "answer": true, "emoji": "1f415"}]}
--   rearrange:       {"items": [{"sentence": "This is my cat.", "emoji": "1f408"}]}
create table public.practice_activities (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  kind        public.practice_kind not null,
  title_en    text not null check (char_length(title_en) between 1 and 80),
  title_vi    text not null check (char_length(title_vi) between 1 and 120),
  sort_order  integer not null default 0,
  status      public.publish_status not null default 'draft',
  content     jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 65536),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index practice_activities_topic_idx on public.practice_activities (topic_id, sort_order) where deleted_at is null;
create trigger practice_activities_updated_at before update on public.practice_activities
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------ progress ------
alter table public.progress_records
  add column practice_activity_id uuid references public.practice_activities(id) on delete set null;
alter table public.progress_records drop constraint progress_records_activity_check;
alter table public.progress_records add constraint progress_records_activity_check
  check (activity in ('flashcards', 'vocabulary_practice', 'grammar_practice', 'story', 'lesson_view', 'practice'));
create index progress_records_practice_idx on public.progress_records (student_id, practice_activity_id)
  where practice_activity_id is not null;

-- ---------------------------------------------------------------- RLS -------
alter table public.topics enable row level security;
alter table public.topics force row level security;
alter table public.practice_activities enable row level security;
alter table public.practice_activities force row level security;
grant select, insert, update, delete on public.topics, public.practice_activities to authenticated;

create or replace function private.topic_is_live(p_topic_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.topics t join public.levels l on l.id = t.level_id
    where t.id = p_topic_id and t.status = 'published' and t.deleted_at is null
      and l.status = 'published' and l.deleted_at is null
  )
$$;
revoke all on function private.topic_is_live(uuid) from public;
grant execute on function private.topic_is_live(uuid) to authenticated, service_role;

-- Staff (admins and teachers) manage practice content and see drafts.
create policy topics_staff_all on public.topics for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy practice_activities_staff_all on public.practice_activities for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy vocabulary_staff_write on public.vocabulary for all to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- Every active account reads published practice content of every level.
create policy topics_live_read on public.topics for select to authenticated
  using (private.is_active_user() and private.topic_is_live(id));
create policy practice_activities_live_read on public.practice_activities for select to authenticated
  using (private.is_active_user() and status = 'published' and deleted_at is null
         and private.topic_is_live(topic_id));
create policy vocabulary_practice_read on public.vocabulary for select to authenticated
  using (private.is_active_user() and status = 'published' and deleted_at is null
         and topic_id is not null and private.topic_is_live(topic_id));
-- Levels themselves (names for the level switcher) are readable when published.
create policy levels_live_read on public.levels for select to authenticated
  using (private.is_active_user() and status = 'published' and deleted_at is null);

-- ------------------------------------------------------------- RPC ----------
-- A student finished a round. Validates the activity is playable and the
-- score is plausible; returns the stars earned for this round (0–3).
create or replace function public.record_practice(
  p_activity_id uuid, p_score integer, p_max_score integer, p_duration_seconds integer
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := private.current_student_id();
  v_ratio numeric;
begin
  if v_student is null then
    raise exception 'only students record practice' using errcode = '42501';
  end if;
  perform private.check_rate_limit('record_practice', 120, 600);
  if not exists (
    select 1 from public.practice_activities a
    where a.id = p_activity_id and a.status = 'published' and a.deleted_at is null
      and private.topic_is_live(a.topic_id)
  ) then
    raise exception 'activity not available' using errcode = '22023';
  end if;
  if p_max_score is null or p_max_score < 1 or p_max_score > 200
     or p_score is null or p_score < 0 or p_score > p_max_score then
    raise exception 'invalid score' using errcode = '22023';
  end if;

  insert into public.progress_records (student_id, activity, practice_activity_id, score, max_score, duration_seconds)
  values (v_student, 'practice', p_activity_id, p_score, p_max_score,
          least(greatest(coalesce(p_duration_seconds, 0), 0), 14400));

  v_ratio := p_score::numeric / p_max_score;
  return case when v_ratio >= 0.9 then 3 when v_ratio >= 0.7 then 2 when v_ratio > 0 then 1 else 0 end;
end $$;
revoke all on function public.record_practice(uuid, integer, integer, integer) from public;
grant execute on function public.record_practice(uuid, integer, integer, integer) to authenticated;

-- ------------------------------------------------------------ health --------
create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 13);
$$;
