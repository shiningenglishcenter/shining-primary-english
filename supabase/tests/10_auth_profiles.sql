-- Authentication & profile protections
begin;

-- anon sees nothing anywhere
set local role anon;
select tests.throws($$select * from public.students$$, 'anon cannot read students', '42501');
select tests.throws($$select * from public.profiles$$, 'anon cannot read profiles', '42501');
select tests.throws($$select public.start_attempt(gen_random_uuid())$$, 'anon cannot call RPCs', '42501');
reset role;

-- authenticated but no JWT subject behaves as nobody
select tests.logout();
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 0, 'no session: zero student rows');
reset role;

-- profile self-service
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.profiles') = 1, 'student sees only own profile');
select tests.lives($$update public.profiles set display_name = 'Andy' where id = auth.uid()$$, 'user can change own display name');
select tests.throws($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'student cannot promote self to admin', '42501');
select tests.throws($$update public.profiles set full_name = 'Hacker' where id = auth.uid()$$, 'student cannot rename self', '42501');
select tests.throws($$update public.profiles set is_active = true, role = 'teacher' where id = auth.uid()$$, 'student cannot become teacher', '42501');
update public.profiles set display_name = 'x' where id <> auth.uid();
reset role;
select tests.ok((select count(*) from public.profiles where display_name = 'x') = 0, 'updates to other profiles silently affect nothing');

-- user metadata cannot grant a role; app_metadata must be set by an admin/service
-- (0011) A user row without app_metadata.role gets no profile, hence no role
-- and no access; the Auth Admin API adds app_metadata in a second statement.
insert into auth.users (email, raw_user_meta_data) values ('evil@test.local', '{"role":"admin"}');
select tests.ok(not exists (select 1 from public.profiles p join auth.users u on u.id = p.id where u.email = 'evil@test.local'),
  'role in user_metadata creates no profile');
update auth.users set raw_user_meta_data = '{"role":"admin","full_name":"x"}' where email = 'evil@test.local';
select tests.ok(not exists (select 1 from public.profiles p join auth.users u on u.id = p.id where u.email = 'evil@test.local'),
  'editing user_metadata later still creates no profile');
update auth.users set raw_app_meta_data = '{"role":"bogus"}' where email = 'evil@test.local';
select tests.ok(not exists (select 1 from public.profiles p join auth.users u on u.id = p.id where u.email = 'evil@test.local'),
  'invalid app_metadata role creates no profile');

-- Admin API flow: insert first, then app_metadata with the role
insert into auth.users (email) values ('two.step@test.local');
update auth.users set raw_app_meta_data = '{"provider":"email","role":"student","full_name":"Two Step","username":"two.step"}'
  where email = 'two.step@test.local';
select tests.ok((select p.role = 'student' and p.username = 'two.step' and p.full_name = 'Two Step'
                 from public.profiles p join auth.users u on u.id = p.id where u.email = 'two.step@test.local'),
  'app_metadata role added after insert provisions the profile');
update auth.users set raw_app_meta_data = '{"role":"admin"}' where email = 'two.step@test.local';
select tests.ok((select p.role = 'student' from public.profiles p join auth.users u on u.id = p.id where u.email = 'two.step@test.local'),
  'later app_metadata edits do not change an existing profile role');

-- admin can change roles, and it is audited
select tests.login('admin1');
set local role authenticated;
select tests.lives($$update public.profiles set role = 'teacher' where id = tests.uid('parent_x')$$, 'admin can change a role');
reset role;
select tests.ok(exists (select 1 from private.audit_log where action = 'role_changed' and entity_id = tests.uid('parent_x')), 'role change is audited');

-- deactivated users lose all access immediately
update public.profiles set is_active = false where id = tests.uid('teacher_a');
select tests.login('teacher_a');
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 0, 'deactivated teacher sees no students');
select tests.ok(tests.n('select * from public.levels') = 0, 'deactivated teacher sees no content');
reset role;

rollback;
