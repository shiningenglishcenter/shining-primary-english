-- =============================================================================
-- 0034 ACTIVITY DRAFTS (ARCHITECTURE D59)
--   The activity editor saves changes automatically into a separate draft,
--   which only the editor's preview shows. Pupils keep playing the version in
--   practice_activities until a teacher presses "Xuất bản" / "Cập nhật cho
--   học sinh", which copies the draft over and removes it.
--   Staff only: pupils, parents and guests cannot read drafts.
-- Safe to re-run.
-- =============================================================================

create table if not exists public.activity_drafts (
  activity_id uuid primary key references public.practice_activities(id) on delete cascade,
  title_en    text not null default '' check (char_length(title_en) <= 80),
  title_vi    text not null default '' check (char_length(title_vi) <= 120),
  content     jsonb not null default '{}'::jsonb check (pg_column_size(content) <= 200000),
  settings    jsonb not null default '{}'::jsonb,
  updated_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now()
);

alter table public.activity_drafts enable row level security;
drop policy if exists activity_drafts_staff on public.activity_drafts;
create policy activity_drafts_staff on public.activity_drafts for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
grant select, insert, update, delete on public.activity_drafts to authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 34);
$$;
