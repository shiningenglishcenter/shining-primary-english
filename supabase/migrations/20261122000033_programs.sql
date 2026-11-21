-- =============================================================================
-- 0033 PROGRAMMES AND LEVELS IN THE DATABASE (ARCHITECTURE D55)
--   Until now the app listed Cambridge / Global Success and their levels in
--   code. Admins can now add a programme (e.g. another textbook series) and
--   its levels on /admin/programs.
--   * programs: code, name, how topics are called ("topic" or "unit"), order,
--     draft/published.
--   * levels gain slug (URL), short_name (tab label) and program_id. The old
--     enum column levels.program stays for compatibility ("other" for new
--     programmes).
--   * practice_levels(): published programmes with their published levels,
--     for every visitor (the app caches it).
-- Safe to re-run.
-- =============================================================================

create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  code        text not null check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  name        text not null check (char_length(name) between 1 and 80),
  topic_noun  text not null default 'topic' check (topic_noun in ('topic', 'unit')),
  sort_order  integer not null default 0,
  status      public.publish_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists programs_code_uq on public.programs (code) where deleted_at is null;
drop trigger if exists programs_updated_at on public.programs;
create trigger programs_updated_at before update on public.programs
  for each row execute function private.set_updated_at();

insert into public.programs (code, name, topic_noun, sort_order)
select 'cambridge', 'Cambridge', 'topic', 10
where not exists (select 1 from public.programs where code = 'cambridge');
insert into public.programs (code, name, topic_noun, sort_order)
select 'global_success', 'Global Success', 'unit', 20
where not exists (select 1 from public.programs where code = 'global_success');

alter table public.levels add column if not exists slug text;
alter table public.levels add column if not exists short_name text;
alter table public.levels add column if not exists program_id uuid references public.programs(id);

update public.levels l set program_id = p.id
from public.programs p
where l.program_id is null and p.code = l.program::text;

update public.levels set slug = lower(code) where slug is null and code !~* '^GS[0-9]$';
update public.levels set slug = 'g' || substr(code, 3) where slug is null and code ~* '^GS[0-9]$';
update public.levels set short_name = name where short_name is null and code !~* '^GS[0-9]$';
update public.levels set short_name = 'G' || substr(code, 3) where short_name is null and code ~* '^GS[0-9]$';

alter table public.levels drop constraint if exists levels_slug_check;
alter table public.levels add constraint levels_slug_check check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{0,39}$');
create unique index if not exists levels_slug_uq on public.levels (slug) where deleted_at is null and slug is not null;

alter table public.programs enable row level security;
drop policy if exists programs_read on public.programs;
create policy programs_read on public.programs for select to authenticated
  using (deleted_at is null and (status = 'published' or private.is_staff()));
drop policy if exists programs_admin on public.programs;
create policy programs_admin on public.programs for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
grant select, insert, update, delete on public.programs to authenticated;

-- Admins edit levels (name, slug, order, programme, status); the existing
-- read policies stay.
drop policy if exists levels_admin_write on public.levels;
create policy levels_admin_write on public.levels for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create or replace function public.practice_levels()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'code', p.code, 'name', p.name, 'topicNoun', p.topic_noun,
           'levels', coalesce((
             select jsonb_agg(jsonb_build_object('code', l.code, 'slug', l.slug, 'name', l.name,
                                                 'short', coalesce(l.short_name, l.name))
                              order by l.sort_order, l.name)
             from public.levels l
             where l.program_id = p.id and l.status = 'published' and l.deleted_at is null
               and l.slug is not null
           ), '[]'::jsonb))
         order by p.sort_order, p.name), '[]'::jsonb)
  from public.programs p
  where p.status = 'published' and p.deleted_at is null
$$;
revoke all on function public.practice_levels() from public;
grant execute on function public.practice_levels() to anon, authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 33);
$$;
