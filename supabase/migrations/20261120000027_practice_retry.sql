-- =============================================================================
-- 0027 "PRACTISE THE MISTAKES AGAIN" (teacher feedback C2, ARCHITECTURE D44)
--   * progress_records.is_retry: a round made only of the questions a pupil
--     missed. It is kept so teachers see the extra practice (time, days,
--     which mistakes were fixed) but it never sets an activity's stars or
--     score: those stay on the latest FULL round (owner, 2026-11-20).
--   * record_practice() gains p_retry (default false). The old 5-argument
--     version is dropped so calls stay unambiguous; 4/5-argument calls still
--     resolve to the new one through the defaults.
-- Safe to re-run.
-- =============================================================================

alter table public.progress_records add column if not exists is_retry boolean not null default false;

drop function if exists public.record_practice(uuid, integer, integer, integer, jsonb);

create or replace function public.record_practice(
  p_activity_id uuid, p_score integer, p_max_score integer, p_duration_seconds integer,
  p_details jsonb default null, p_retry boolean default false
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := private.current_student_id();
  v_ratio numeric;
  v_details jsonb := null;
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
  -- Details are informative only: keep them when well formed, drop them otherwise.
  if p_details is not null and jsonb_typeof(p_details) = 'array'
     and jsonb_array_length(p_details) <= 60 and pg_column_size(p_details) < 16384 then
    v_details := p_details;
  end if;

  insert into public.progress_records
    (student_id, activity, practice_activity_id, score, max_score, duration_seconds, details, is_retry)
  values (v_student, 'practice', p_activity_id, p_score, p_max_score,
          least(greatest(coalesce(p_duration_seconds, 0), 0), 14400), v_details, coalesce(p_retry, false));

  -- A retry round earns no stars.
  if coalesce(p_retry, false) then
    return 0;
  end if;
  v_ratio := p_score::numeric / p_max_score;
  return case when v_ratio >= 0.9 then 3 when v_ratio >= 0.7 then 2 when v_ratio > 0 then 1 else 0 end;
end $$;
revoke all on function public.record_practice(uuid, integer, integer, integer, jsonb, boolean) from public;
grant execute on function public.record_practice(uuid, integer, integer, integer, jsonb, boolean) to authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 27);
$$;
