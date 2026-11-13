-- current_profile(): profile + live-session check in one call (0021)
begin;

insert into auth.sessions (id, user_id) values ('c0000000-0000-4000-8000-000000000001', tests.uid('stu_an'));

-- live session → profile
select set_config('request.jwt.claims', json_build_object('sub', tests.uid('stu_an'), 'role', 'authenticated',
  'session_id', 'c0000000-0000-4000-8000-000000000001')::text, true);
set local role authenticated;
select tests.ok((public.current_profile() ->> 'session')::boolean, 'a live session is accepted');
select tests.ok(public.current_profile() -> 'profile' ->> 'role' = 'student', 'it returns the caller''s profile');
reset role;

-- revoked session (row gone) → session false
delete from auth.sessions where id = 'c0000000-0000-4000-8000-000000000001';
set local role authenticated;
select tests.ok(not (public.current_profile() ->> 'session')::boolean, 'a revoked session is refused');
reset role;

-- token without a session id, or someone else's session → refused
insert into auth.sessions (id, user_id) values ('c0000000-0000-4000-8000-000000000002', tests.uid('teacher_a'));
select set_config('request.jwt.claims', json_build_object('sub', tests.uid('stu_an'), 'role', 'authenticated',
  'session_id', 'c0000000-0000-4000-8000-000000000002')::text, true);
set local role authenticated;
select tests.ok(not (public.current_profile() ->> 'session')::boolean, 'another user''s session id is refused');
reset role;
select tests.login('stu_an');
set local role authenticated;
select tests.ok(not (public.current_profile() ->> 'session')::boolean, 'a token without session id is refused');
reset role;

-- expired session (not_after in the past) → refused
insert into auth.sessions (id, user_id, not_after)
  values ('c0000000-0000-4000-8000-000000000003', tests.uid('stu_an'), now() - interval '1 minute');
select set_config('request.jwt.claims', json_build_object('sub', tests.uid('stu_an'), 'role', 'authenticated',
  'session_id', 'c0000000-0000-4000-8000-000000000003')::text, true);
set local role authenticated;
select tests.ok(not (public.current_profile() ->> 'session')::boolean, 'an expired session is refused');
reset role;

set local role anon;
select tests.throws($$select public.current_profile()$$, 'anon cannot call current_profile', '42501');
reset role;

rollback;
