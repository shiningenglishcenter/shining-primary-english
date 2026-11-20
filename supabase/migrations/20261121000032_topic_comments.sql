-- =============================================================================
-- 0032 TEACHER COMMENTS PER TOPIC (round 3, ARCHITECTURE D54)
--   One comment per student and topic/unit, written by a teacher of the
--   student (or an admin) on the results page, then copied with the
--   student's figures into a message for parents (Zalo). Not shown to
--   pupils or parents in the app yet. RLS: admins, and teachers of the student.
-- Safe to re-run.
-- =============================================================================

create table if not exists public.topic_comments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  topic_id    uuid not null references public.topics(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  written_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (student_id, topic_id)
);
create index if not exists topic_comments_topic_idx on public.topic_comments (topic_id);

drop trigger if exists topic_comments_updated_at on public.topic_comments;
create trigger topic_comments_updated_at before update on public.topic_comments
  for each row execute function private.set_updated_at();

alter table public.topic_comments enable row level security;

drop policy if exists topic_comments_staff on public.topic_comments;
create policy topic_comments_staff on public.topic_comments for all to authenticated
  using (private.is_admin() or private.teaches_student(student_id))
  with check (private.is_admin() or private.teaches_student(student_id));

grant select, insert, update, delete on public.topic_comments to authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 32);
$$;
