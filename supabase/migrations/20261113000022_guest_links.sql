-- =============================================================================
-- 0022 GUEST LINKS (Phase 1.3, ARCHITECTURE D35)
--   A teacher may switch on "no login needed" for one activity (off by
--   default). It then has a random public token; the link /p/<token> works
--   without an account and never expires — the teacher turns it off or makes
--   a new token. The child types a first name before playing; each finished
--   round is kept in guest_attempts for staff, never in a student account.
--   Anonymous callers reach data only through the two functions below.
-- Safe to re-run.
-- =============================================================================

alter table public.practice_activities add column if not exists public_token text;
alter table public.practice_activities drop constraint if exists practice_activities_public_token_check;
alter table public.practice_activities add constraint practice_activities_public_token_check
  check (public_token is null or public_token ~ '^[A-Za-z0-9_-]{16,40}$');
create unique index if not exists practice_activities_public_token_uq
  on public.practice_activities (public_token) where public_token is not null;

create table if not exists public.guest_attempts (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null references public.practice_activities(id) on delete cascade,
  player_name       text not null check (char_length(player_name) between 1 and 40),
  score             integer not null check (score >= 0),
  max_score         integer not null check (max_score between 1 and 200),
  duration_seconds  integer not null default 0 check (duration_seconds between 0 and 14400),
  details           jsonb check (details is null or (jsonb_typeof(details) = 'array'
                                 and jsonb_array_length(details) <= 60 and pg_column_size(details) < 16384)),
  recorded_at       timestamptz not null default now(),
  check (score <= max_score)
);
create index if not exists guest_attempts_activity_idx on public.guest_attempts (activity_id, recorded_at desc);
create index if not exists guest_attempts_recent_idx on public.guest_attempts (recorded_at desc);

alter table public.guest_attempts enable row level security;
alter table public.guest_attempts force row level security;
revoke all on public.guest_attempts from anon, authenticated;
grant select on public.guest_attempts to authenticated;
drop policy if exists guest_attempts_staff_read on public.guest_attempts;
create policy guest_attempts_staff_read on public.guest_attempts for select to authenticated
  using (private.is_staff());

-- The playable activity behind a live public token, or null.
create or replace function public.get_public_activity(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'activity', jsonb_build_object('id', a.id, 'kind', a.kind, 'title_en', a.title_en, 'title_vi', a.title_vi,
                                   'content', a.content, 'settings', a.settings),
    'topic', jsonb_build_object('id', t.id, 'title_en', t.title_en, 'title_vi', t.title_vi, 'emoji', t.emoji,
                                'level', l.code),
    'words', coalesce((
      select jsonb_agg(jsonb_build_object('word', v.word, 'meaning_vi', v.meaning_vi, 'emoji', v.emoji) order by v.word)
      from public.vocabulary v
      where v.topic_id = t.id and v.status = 'published' and v.deleted_at is null
    ), '[]'::jsonb)
  )
  from public.practice_activities a
  join public.topics t on t.id = a.topic_id
  join public.levels l on l.id = t.level_id
  where p_token ~ '^[A-Za-z0-9_-]{16,40}$'
    and a.public_token = p_token
    and a.status = 'published' and a.deleted_at is null
    and private.topic_is_live(a.topic_id)
$$;
revoke all on function public.get_public_activity(text) from public;
grant execute on function public.get_public_activity(text) to anon, authenticated;

-- A guest finished a round: validate, store, return the stars (0–3).
create or replace function public.record_guest_practice(
  p_token text, p_name text, p_score integer, p_max_score integer, p_duration_seconds integer,
  p_details jsonb default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_activity uuid;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_details jsonb := null;
  v_ratio numeric;
begin
  select a.id into v_activity
  from public.practice_activities a
  where p_token ~ '^[A-Za-z0-9_-]{16,40}$' and a.public_token = p_token
    and a.status = 'published' and a.deleted_at is null and private.topic_is_live(a.topic_id);
  if v_activity is null then
    raise exception 'link not available' using errcode = '22023';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'invalid name' using errcode = '22023';
  end if;
  if p_max_score is null or p_max_score < 1 or p_max_score > 200
     or p_score is null or p_score < 0 or p_score > p_max_score then
    raise exception 'invalid score' using errcode = '22023';
  end if;
  -- Flood guard per link: a class of children is fine, a script is not.
  if (select count(*) from public.guest_attempts g
      where g.activity_id = v_activity and g.recorded_at > now() - interval '1 minute') >= 60 then
    raise exception 'rate limit exceeded' using errcode = 'P0429';
  end if;
  if p_details is not null and jsonb_typeof(p_details) = 'array'
     and jsonb_array_length(p_details) <= 60 and pg_column_size(p_details) < 16384 then
    v_details := p_details;
  end if;

  insert into public.guest_attempts (activity_id, player_name, score, max_score, duration_seconds, details)
  values (v_activity, v_name, p_score, p_max_score,
          least(greatest(coalesce(p_duration_seconds, 0), 0), 14400), v_details);

  v_ratio := p_score::numeric / p_max_score;
  return case when v_ratio >= 0.9 then 3 when v_ratio >= 0.7 then 2 when v_ratio > 0 then 1 else 0 end;
end $$;
revoke all on function public.record_guest_practice(text, text, integer, integer, integer, jsonb) from public;
grant execute on function public.record_guest_practice(text, text, integer, integer, integer, jsonb)
  to anon, authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 22);
$$;
