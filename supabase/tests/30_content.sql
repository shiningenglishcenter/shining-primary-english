-- Curriculum & content visibility
begin;

select tests.login('stu_an');   -- class A → Movers
set local role authenticated;
select tests.ok((select array_agg(code) from public.levels) = array['T-MOVERS'], 'student sees only levels of own class');
select tests.ok(tests.n('select * from public.lessons') = 1, 'student sees only published lessons of own level');
select tests.ok((select array_agg(word) from public.vocabulary) = array['grandmother'], 'student sees published vocabulary of own level only');
select tests.throws($$insert into public.vocabulary (level_id, word, meaning_vi) values ('10000000-0000-0000-0000-00000000000a', 'hack', 'x')$$,
  'student cannot create vocabulary', '42501');
reset role;

select tests.login('stu_chi');  -- class B → Flyers
set local role authenticated;
select tests.ok((select array_agg(word) from public.vocabulary) = array['planet'], 'Flyers student sees Flyers vocabulary only');
reset role;

select tests.login('parent_an');
set local role authenticated;
select tests.ok((select array_agg(code) from public.levels) = array['T-MOVERS'], 'parent sees content of child''s level');
reset role;

select tests.login('teacher_b');
set local role authenticated;
select tests.ok(tests.n('select * from public.lessons') = 3, 'teacher sees all lessons including drafts');
select tests.throws($$insert into public.vocabulary (level_id, word, meaning_vi) values ('10000000-0000-0000-0000-00000000000a', 'teach', 'dạy')$$,
  'teacher cannot edit content (admin-only in MVP)', '42501');
reset role;

select tests.login('admin1');
set local role authenticated;
select tests.lives($$insert into public.vocabulary (level_id, word, meaning_vi, status) values ('10000000-0000-0000-0000-00000000000a', 'uncle', 'chú/bác', 'published')$$,
  'admin can add vocabulary');
select tests.lives($$update public.lessons set status = 'published' where id = '40000000-0000-0000-0000-0000000000a2'$$, 'admin can publish a lesson');
select tests.throws($$insert into public.vocabulary (level_id, word, meaning_vi) values ('10000000-0000-0000-0000-00000000000a', 'Grandmother', 'bà')$$,
  'duplicate word in same level is rejected', '23505');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.lessons') = 2, 'newly published lesson becomes visible to student');
reset role;

rollback;
