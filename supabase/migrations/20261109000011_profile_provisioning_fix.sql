-- =============================================================================
-- 0011 PROFILE PROVISIONING FIX
-- Found by the first end-to-end run on a real Supabase stack (Milestone 1):
-- the Auth Admin API inserts the auth.users row FIRST and writes app_metadata
-- (where the role lives) in a SECOND statement. The 0003 insert trigger
-- rejected every user without a role at insert time, so no account could be
-- created through the Admin API at all.
--
-- New behaviour:
--   * Insert without app_metadata.role  -> user row allowed, NO profile.
--     Without a profile the user has no role and RLS gives them nothing.
--   * app_metadata.role appears (insert or later update) -> profile created.
--   * user_metadata (editable by the user) is never read.
--   * Once a profile exists, its role is changed only through profiles
--     (admin-only, audited) — later app_metadata edits do not change it.
-- =============================================================================

create or replace function private.provision_profile_from_app_metadata(p_user auth.users)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role;
begin
  begin
    v_role := (p_user.raw_app_meta_data ->> 'role')::public.app_role;
  exception when invalid_text_representation then
    v_role := null;
  end;
  if v_role is null then
    return;
  end if;

  insert into public.profiles (id, role, full_name, username)
  values (
    p_user.id,
    v_role,
    coalesce(nullif(p_user.raw_app_meta_data ->> 'full_name', ''), split_part(coalesce(p_user.email, 'user'), '@', 1)),
    nullif(p_user.raw_app_meta_data ->> 'username', '')
  )
  on conflict (id) do nothing;
end $$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.provision_profile_from_app_metadata(new);
  return new;
end $$;

create or replace function private.handle_user_app_metadata_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data is distinct from old.raw_app_meta_data then
    perform private.provision_profile_from_app_metadata(new);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_app_metadata_change on auth.users;
create trigger on_auth_user_app_metadata_change
  after update of raw_app_meta_data on auth.users
  for each row execute function private.handle_user_app_metadata_change();

revoke all on function private.provision_profile_from_app_metadata(auth.users) from public;
