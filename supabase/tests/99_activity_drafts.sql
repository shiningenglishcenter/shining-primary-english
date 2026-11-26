-- Activity drafts (0034): staff only, removed with the activity
begin;

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.activity_drafts (activity_id, title_en, title_vi, content)
  select id, 'Draft', 'Nháp', '{"items": []}' from public.practice_activities where deleted_at is null order by id limit 1$$,
  'a teacher saves a draft');
select tests.ok(tests.n($$select 1 from public.activity_drafts$$) = 1, 'the teacher reads it back');
select tests.lives($$update public.activity_drafts set title_vi = 'Nháp 2'$$, 'the teacher updates it');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n($$select 1 from public.activity_drafts$$) = 0, 'pupils cannot read drafts');
select tests.throws($$insert into public.activity_drafts (activity_id) select id from public.practice_activities limit 1$$,
  'pupils cannot write drafts', '42501');
reset role;

set local role anon;
select tests.throws($$select 1 from public.activity_drafts$$, 'guests cannot read drafts', '42501');
reset role;

select tests.ok((public.health_check() ->> 'schema_version')::int >= 34, 'schema version 34 or later');
rollback;
