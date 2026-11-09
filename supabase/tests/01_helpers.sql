-- Test helpers (test database only).
create schema tests;
grant usage on schema tests to anon, authenticated;


-- Switch the simulated JWT to a fixture user (call BEFORE `set local role`).
create function tests.login(p_username text) returns void language plpgsql as $$
declare v uuid;
begin
  select id into v from auth.users where email = p_username || '@test.local';
  if v is null then raise exception 'no fixture user %', p_username; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
end $$;

create function tests.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;

create function tests.uid(p_username text) returns uuid language sql stable security definer as $$
  select id from auth.users where email = p_username || '@test.local'
$$;

create function tests.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if coalesce(p_cond, false) then
    raise notice 'ok - %', p_name;
  else
    raise warning 'FAIL - %', p_name;
  end if;
end $$;

-- Passes when executing p_sql raises an error (optionally a specific SQLSTATE).
create function tests.throws(p_sql text, p_name text, p_errcode text default null) returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    perform tests.ok(p_errcode is null or v_state = p_errcode, p_name || ' [' || v_state || ': ' || v_msg || ']');
    return;
  end;
  perform tests.ok(false, p_name || ' [expected an error, none raised]');
end $$;

create function tests.lives(p_sql text, p_name text) returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    perform tests.ok(false, p_name || ' [' || v_state || ': ' || v_msg || ']');
    return;
  end;
  perform tests.ok(true, p_name);
end $$;

create function tests.n(p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  execute 'select count(*) from (' || p_sql || ') x' into v;
  return v;
end $$;

grant execute on all functions in schema tests to anon, authenticated;
-- Each test file runs inside BEGIN … ROLLBACK, so files are independent.
-- The runner (scripts/test-db.sh) counts `ok -` / `FAIL -` lines and treats
-- any unexpected SQL error as a failure.
