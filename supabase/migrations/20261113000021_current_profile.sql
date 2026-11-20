-- =============================================================================
-- 0021 CURRENT PROFILE + LIVE SESSION CHECK (ARCHITECTURE D25, amended)
--   Pages verify the JWT locally (getClaims) for speed. That alone would keep
--   a revoked session (signed out elsewhere, sessions ended by an admin)
--   working until the token expires. This function checks the session still
--   exists in auth.sessions AND returns the caller's profile, in one call —
--   the same single round trip the profile read already cost.
--     { "session": false }                       → session revoked / unknown
--     { "session": true, "profile": {…} | null } → profile row (RLS-equivalent:
--                                                   only the caller's own row)
-- Safe to re-run.
-- =============================================================================

create or replace function public.current_profile()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null or not exists (
      select 1 from auth.sessions s
      where s.id = private.try_uuid(auth.jwt() ->> 'session_id')
        and s.user_id = auth.uid()
        and (s.not_after is null or s.not_after > now())
    ) then jsonb_build_object('session', false)
    else jsonb_build_object('session', true, 'profile', (
      select to_jsonb(p) from (
        select id, role, full_name, display_name, is_active, deleted_at
        from public.profiles where id = auth.uid()
      ) p
    ))
  end
$$;
revoke all on function public.current_profile() from public, anon;
grant execute on function public.current_profile() to authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 21);
$$;
