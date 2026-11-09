-- =============================================================================
-- 0010 HEALTH CHECK
-- /api/health calls this with the publishable (anon) key to confirm the
-- database answers. It reads no table and returns no personal data.
-- =============================================================================

create or replace function public.health_check()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 10);
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated, service_role;
