-- =============================================================================
-- 0012 ADMIN PEOPLE & CLASSES (Milestone 2)
--   * Standard levels so classes can be created before the curriculum editor
--     (M3) exists. Published, because students only see published levels.
--   * Automatic student codes (HS0001, HS0002, …).
--   * Audit trail for account actions that go through the Auth Admin API
--     (service role, so auth.uid() is null there): the admin's Server Action
--     records them with log_account_event() under the admin's own session.
--   * Locking / unlocking an account (profiles.is_active) is audited by the
--     profile guard trigger.
-- =============================================================================

-- ------------------------------------------------------------ levels --------
insert into public.levels (code, name, program, sort_order, status)
select v.code, v.name, v.program::public.program_type, v.sort_order, 'published'
from (values
  ('STARTERS', 'Starters',         'cambridge',      10),
  ('MOVERS',   'Movers',           'cambridge',      20),
  ('FLYERS',   'Flyers',           'cambridge',      30),
  ('GS1',      'Global Success 1', 'global_success', 110),
  ('GS2',      'Global Success 2', 'global_success', 120),
  ('GS3',      'Global Success 3', 'global_success', 130),
  ('GS4',      'Global Success 4', 'global_success', 140),
  ('GS5',      'Global Success 5', 'global_success', 150)
) as v(code, name, program, sort_order)
where not exists (
  select 1 from public.levels l where lower(l.code) = lower(v.code) and l.deleted_at is null
);

-- ------------------------------------------------------- student codes ------
create sequence if not exists private.student_code_seq;

-- Next free HSnnnn code. Skips codes already used (e.g. typed by hand).
create or replace function private.next_student_code()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_code text;
begin
  loop
    v_code := 'HS' || lpad(nextval('private.student_code_seq')::text, 4, '0');
    exit when not exists (
      select 1 from public.students s where lower(s.student_code) = lower(v_code) and s.deleted_at is null
    );
  end loop;
  return v_code;
end $$;
revoke all on function private.next_student_code() from public;
grant execute on function private.next_student_code() to authenticated, service_role;

alter table public.students alter column student_code set default private.next_student_code();

-- ---------------------------------------------------- account audit ---------
create or replace function public.log_account_event(p_action text, p_profile_id uuid, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can record account events' using errcode = '42501';
  end if;
  if p_action not in ('account_created', 'password_reset') then
    raise exception 'unknown account event %', p_action using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_profile_id) then
    raise exception 'no such profile' using errcode = '22023';
  end if;
  -- Never store passwords: keep only a small set of descriptive keys.
  perform private.audit(p_action, 'profiles', p_profile_id,
    coalesce(p_details, '{}'::jsonb) - 'password' - 'new_password');
end $$;
revoke all on function public.log_account_event(text, uuid, jsonb) from public;
grant execute on function public.log_account_event(text, uuid, jsonb) to authenticated;

-- Profile guard (from 0007) + audit of lock / unlock.
create or replace function private.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- current_user is the function owner inside SECURITY DEFINER; the `role`
  -- setting still holds the API caller's role (authenticated / anon).
  v_privileged boolean := coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon')
                          or private.is_admin();
begin
  if not v_privileged and (
       new.role is distinct from old.role
    or new.full_name is distinct from old.full_name
    or new.username is distinct from old.username
    or new.is_active is distinct from old.is_active
    or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'only admins can change these profile fields' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    perform private.audit('role_changed', 'profiles', new.id, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.is_active is distinct from old.is_active then
    perform private.audit(case when new.is_active then 'account_unlocked' else 'account_locked' end,
      'profiles', new.id);
  end if;
  return new;
end $$;

-- ------------------------------------------------------------ health --------
create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 12);
$$;
