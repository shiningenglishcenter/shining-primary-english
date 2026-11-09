-- Milestone 2: standard levels, automatic student codes, account audit
begin;

-- levels
select tests.ok(
  (select array_agg(code order by sort_order) from public.levels where deleted_at is null and code not like 'T-%')
    = array['STARTERS','MOVERS','FLYERS','GS1','GS2','GS3','GS4','GS5'],
  'standard levels are seeded in order');
select tests.ok(not exists (select 1 from public.levels where status <> 'published'), 'standard levels are published');

-- student codes
select tests.login('admin1');
set local role authenticated;
select tests.lives($$insert into public.students (full_name) values ('Auto Code One')$$, 'admin can create a student without a code');
select tests.ok((select student_code from public.students where full_name = 'Auto Code One') ~ '^HS[0-9]{4,}$',
  'student code is generated as HSnnnn');
select tests.lives($$insert into public.students (full_name) values ('Auto Code Two')$$, 'second student without a code');
select tests.ok(
  (select count(distinct student_code) from public.students where full_name like 'Auto Code %') = 2,
  'generated codes are unique');
reset role;
-- a hand-typed code that collides with the next generated one is skipped
select tests.lives($$insert into public.students (student_code, full_name)
  values ('HS' || lpad((select last_value + 1 from private.student_code_seq)::text, 4, '0'), 'Manual')$$,
  'manual code taking the next number');
select tests.lives($$insert into public.students (full_name) values ('Auto Code Three')$$,
  'generator skips a code that is already taken');

-- account events
select tests.login('admin1');
set local role authenticated;
select tests.lives($$select public.log_account_event('account_created', tests.uid('stu_an'), '{"login":"an.nguyen","password":"x"}')$$,
  'admin can record an account event');
select tests.throws($$select public.log_account_event('role_changed', tests.uid('stu_an'))$$,
  'unknown event names are rejected', '22023');
select tests.throws($$select public.log_account_event('password_reset', gen_random_uuid())$$,
  'events for a missing profile are rejected', '22023');
select tests.lives($$update public.profiles set is_active = false where id = tests.uid('stu_binh')$$, 'admin can lock an account');
select tests.lives($$update public.profiles set is_active = true where id = tests.uid('stu_binh')$$, 'admin can unlock an account');
reset role;

select tests.ok(exists (select 1 from private.audit_log
    where action = 'account_created' and entity_id = tests.uid('stu_an') and actor_id = tests.uid('admin1')),
  'account creation is audited with the admin as actor');
select tests.ok(not exists (select 1 from private.audit_log where details ? 'password'),
  'passwords are never stored in the audit log');
select tests.ok((select array_agg(action order by id) from private.audit_log where entity_id = tests.uid('stu_binh'))
    = array['account_locked','account_unlocked'],
  'lock and unlock are audited');

-- non-admins
select tests.login('teacher_a');
set local role authenticated;
select tests.throws($$select public.log_account_event('password_reset', tests.uid('stu_an'))$$,
  'teacher cannot write account events', '42501');
update public.profiles set is_active = false where id = tests.uid('stu_an');
reset role;
select tests.ok((select is_active from public.profiles where id = tests.uid('stu_an')), 'teacher cannot lock an account');
select tests.login('stu_an');
set local role authenticated;
select tests.throws($$select public.log_account_event('account_created', auth.uid())$$,
  'student cannot write account events', '42501');
reset role;
set local role anon;
select tests.throws($$select public.log_account_event('account_created', gen_random_uuid())$$,
  'anon cannot write account events', '42501');
reset role;

rollback;
