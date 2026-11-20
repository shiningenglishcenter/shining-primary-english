-- =============================================================================
-- 0024 FEEDBACK v2 + PUBLIC CATALOG (ARCHITECTURE D38 amended, D37)
--   * submit_feedback(): name and Zalo phone are required, and at least one
--     idea or bug (internal pilot: every teacher is a staff member).
--   * practice_catalog(): the published structure (programme -> level ->
--     topics, activity counts) for the public guide's overview. Titles and
--     counts only, no content.
-- Safe to re-run.
-- =============================================================================

create or replace function public.submit_feedback(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_item jsonb;
  v_pos smallint := 0;
  v_ratings jsonb := '{}'::jsonb;
  v_key text;
  v_shots text[];
  v_trim text;
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_phone text := regexp_replace(coalesce(p ->> 'contact', ''), '[[:space:].-]', '', 'g');
  v_items int := 0;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'invalid feedback' using errcode = '22023';
  end if;
  if (select count(*) from public.feedback where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'rate limit exceeded' using errcode = 'P0429';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'name required' using errcode = '22023';
  end if;
  if v_phone !~ '^(\+84|0)[0-9]{9}$' then
    raise exception 'phone required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p -> 'items', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p -> 'items', '[]'::jsonb)) > 20 then
    raise exception 'invalid items' using errcode = '22023';
  end if;
  select count(*) into v_items from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) i
  where btrim(coalesce(i ->> 'description', '')) <> '';
  if v_items = 0 then
    raise exception 'at least one idea or bug' using errcode = '22023';
  end if;
  foreach v_key in array array['ease', 'kids', 'results', 'ready'] loop
    if (p -> 'ratings' ->> v_key) ~ '^[1-5]$' then
      v_ratings := v_ratings || jsonb_build_object(v_key, (p -> 'ratings' ->> v_key)::int);
    end if;
  end loop;

  insert into public.feedback (name, role, contact, ratings, liked, change, page_url, user_agent)
  values (v_name, 'teacher', v_phone, v_ratings, null,
          nullif(left(btrim(coalesce(p ->> 'change', '')), 2000), ''),
          nullif(left(p ->> 'page_url', 300), ''),
          nullif(left(p ->> 'user_agent', 300), ''))
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    v_trim := btrim(coalesce(v_item ->> 'description', ''));
    continue when v_trim = '';
    select coalesce(array_agg(s), '{}') into v_shots
    from (select jsonb_array_elements_text(coalesce(v_item -> 'screenshots', '[]'::jsonb)) s limit 3) x
    where s ~ '^incoming/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$';
    insert into public.feedback_items (feedback_id, position, kind, area, severity, description, steps, screenshots)
    values (v_id, v_pos,
            case when v_item ->> 'kind' in ('bug', 'idea', 'content', 'design') then v_item ->> 'kind' else 'idea' end,
            case when v_item ->> 'area' in ('login', 'content', 'share', 'play', 'results', 'other') then v_item ->> 'area' else 'other' end,
            case when v_item ->> 'kind' = 'bug' and v_item ->> 'severity' in ('blocker', 'annoying', 'minor') then v_item ->> 'severity' end,
            left(v_trim, 2000),
            nullif(left(btrim(coalesce(v_item ->> 'steps', '')), 2000), ''),
            v_shots);
    v_pos := v_pos + 1;
  end loop;
  return v_id;
end $$;
revoke all on function public.submit_feedback(jsonb) from public;
grant execute on function public.submit_feedback(jsonb) to anon, authenticated;

-- Published structure for the public guide: [{level, name, program, topics: [{title, activities}]}]
create or replace function public.practice_catalog()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'level', l.code, 'name', l.name, 'program', l.program,
           'topics', coalesce((
             select jsonb_agg(jsonb_build_object('title', t.title_en, 'activities', (
                      select count(*) from public.practice_activities a
                      where a.topic_id = t.id and a.status = 'published' and a.deleted_at is null))
                    order by t.sort_order, t.title_en)
             from public.topics t
             where t.level_id = l.id and t.status = 'published' and t.deleted_at is null
           ), '[]'::jsonb))
         order by l.sort_order), '[]'::jsonb)
  from public.levels l
  where l.status = 'published' and l.deleted_at is null
$$;
revoke all on function public.practice_catalog() from public;
grant execute on function public.practice_catalog() to anon, authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 24);
$$;
