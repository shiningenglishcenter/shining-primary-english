-- Health check RPC used by /api/health
begin;

set local role anon;
select tests.lives($$select public.health_check()$$, 'anon can call health_check');
select tests.ok((select public.health_check() ->> 'db') = 'ok', 'health_check reports db ok');
select tests.ok(
  (select array(select jsonb_object_keys(public.health_check())) <@ array['db', 'schema_version']),
  'health_check returns only status keys (no data)'
);
-- Granting this one function must not open anything else to anon.
select tests.throws($$select * from public.profiles$$, 'anon still cannot read profiles', '42501');
select tests.throws($$select public.start_attempt(gen_random_uuid())$$, 'anon still cannot call other RPCs', '42501');
reset role;

rollback;
