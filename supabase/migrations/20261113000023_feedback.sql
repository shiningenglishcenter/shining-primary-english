-- =============================================================================
-- 0023 PILOT FEEDBACK (ARCHITECTURE D38)
--   Public page /gop-y: anyone (no login) sends feedback — quick ratings,
--   several issues/ideas (optional screenshots), general comments. Admins
--   read and triage it in /admin/gop-y. No notifications.
--   Anonymous callers can only INSERT through submit_feedback() and upload
--   images to the private `feedback` bucket under incoming/; nobody but
--   admins can read anything back.
-- Safe to re-run.
-- =============================================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text check (name is null or char_length(name) <= 80),
  role        text check (role is null or role in ('teacher', 'admin', 'parent', 'other')),
  contact     text check (contact is null or char_length(contact) <= 120),
  ratings     jsonb not null default '{}'::jsonb check (jsonb_typeof(ratings) = 'object' and pg_column_size(ratings) < 1024),
  liked       text check (liked is null or char_length(liked) <= 2000),
  change      text check (change is null or char_length(change) <= 2000),
  page_url    text check (page_url is null or char_length(page_url) <= 300),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 300),
  status      text not null default 'new' check (status in ('new', 'in_progress', 'done', 'wont_do')),
  admin_note  text check (admin_note is null or char_length(admin_note) <= 2000)
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

create table if not exists public.feedback_items (
  id           uuid primary key default gen_random_uuid(),
  feedback_id  uuid not null references public.feedback(id) on delete cascade,
  position     smallint not null default 0,
  kind         text not null check (kind in ('bug', 'idea', 'content', 'design')),
  area         text not null check (area in ('login', 'content', 'share', 'play', 'results', 'other')),
  severity     text check (severity is null or severity in ('blocker', 'annoying', 'minor')),
  description  text not null check (char_length(description) between 1 and 2000),
  steps        text check (steps is null or char_length(steps) <= 2000),
  screenshots  text[] not null default '{}' check (cardinality(screenshots) <= 3),
  status       text not null default 'new' check (status in ('new', 'in_progress', 'done', 'wont_do'))
);
create index if not exists feedback_items_feedback_idx on public.feedback_items (feedback_id, position);

drop trigger if exists feedback_updated_at on public.feedback;
create trigger feedback_updated_at before update on public.feedback
  for each row execute function private.set_updated_at();

alter table public.feedback enable row level security;
alter table public.feedback force row level security;
alter table public.feedback_items enable row level security;
alter table public.feedback_items force row level security;
revoke all on public.feedback, public.feedback_items from anon, authenticated;
grant select, update, delete on public.feedback, public.feedback_items to authenticated;
drop policy if exists feedback_admin on public.feedback;
create policy feedback_admin on public.feedback for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
drop policy if exists feedback_items_admin on public.feedback_items;
create policy feedback_items_admin on public.feedback_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Private bucket for screenshots: 5 MB images; anyone may add under incoming/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists feedback_upload on storage.objects;
create policy feedback_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = 'incoming');
drop policy if exists feedback_admin_read on storage.objects;
create policy feedback_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and private.is_admin());
drop policy if exists feedback_admin_delete on storage.objects;
create policy feedback_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'feedback' and private.is_admin());

-- One submission: header + 0–20 items. Validates everything; returns the id.
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
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'invalid feedback' using errcode = '22023';
  end if;
  -- Flood guard for a public form: plenty for a pilot, not for a script.
  if (select count(*) from public.feedback where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'rate limit exceeded' using errcode = 'P0429';
  end if;
  foreach v_key in array array['ease', 'kids', 'results', 'ready'] loop
    if (p -> 'ratings' ->> v_key) ~ '^[1-5]$' then
      v_ratings := v_ratings || jsonb_build_object(v_key, (p -> 'ratings' ->> v_key)::int);
    end if;
  end loop;
  if jsonb_typeof(coalesce(p -> 'items', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p -> 'items', '[]'::jsonb)) > 20 then
    raise exception 'invalid items' using errcode = '22023';
  end if;
  if v_ratings = '{}'::jsonb and jsonb_array_length(coalesce(p -> 'items', '[]'::jsonb)) = 0
     and coalesce(btrim(p ->> 'liked'), '') = '' and coalesce(btrim(p ->> 'change'), '') = '' then
    raise exception 'empty feedback' using errcode = '22023';
  end if;

  insert into public.feedback (name, role, contact, ratings, liked, change, page_url, user_agent)
  values (nullif(left(btrim(p ->> 'name'), 80), ''),
          case when p ->> 'role' in ('teacher', 'admin', 'parent', 'other') then p ->> 'role' end,
          nullif(left(btrim(p ->> 'contact'), 120), ''),
          v_ratings,
          nullif(left(btrim(p ->> 'liked'), 2000), ''),
          nullif(left(btrim(p ->> 'change'), 2000), ''),
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

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 23);
$$;
