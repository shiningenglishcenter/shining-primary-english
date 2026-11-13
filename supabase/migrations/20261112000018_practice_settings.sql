-- =============================================================================
-- 0018 PRACTICE SETTINGS (pilot feedback 2, ARCHITECTURE D29)
--   Per-activity play settings, edited by teachers:
--     { "hints": true, "maxTries": 3 }   (defaults when missing)
--   hints: show a hint after a wrong answer; maxTries: wrong answers before the
--   player shows the answer and moves on. Validated by the app
--   (src/features/practice/model.ts settingsSchema). Safe to re-run.
-- =============================================================================

alter table public.practice_activities
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.practice_activities drop constraint if exists practice_activities_settings_check;
alter table public.practice_activities add constraint practice_activities_settings_check
  check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) < 1024);

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 18);
$$;
