-- Curriculum & content visibility
begin;

select tests.login('stu_an');   -- class A → Movers
set local role authenticated;
-- D23: every account opens every published level (lessons/units stay class-scoped)
select tests.ok((select array_agg(code order by code) from public.levels) @> array['FLYERS','STARTERS','T-MOVERS'],
  'student sees every published level');
select tests.ok(tests.n('select * from public.lessons') = 1, 'student sees only published lessons of own level');
select tests.ok((select array_agg(word) from public.vocabulary where topic_id is null) = array['grandmother'], 'student sees published curriculum vocabulary of own level only');
select tests.throws($$insert into public.vocabulary (level_id, word, meaning_vi) values ('10000000-0000-0000-0000-00000000000a', 'hack', 'x')$$,
  'student cannot create vocabulary', '42501');
reset role;

select tests.login('stu_chi');  -- class B → Flyers
set local role authenticated;
select tests.ok((select array_agg(word) from public.vocabulary where topic_id is null) = array['planet'], 'Flyers student sees Flyers curriculum vocabulary only');
reset role;

select tests.login('parent_an');
set local role authenticated;
select tests.ok((select array_agg(code) from public.levels) @> array['T-MOVERS'], 'parent sees content of child''s level');
reset role;

select tests.login('teacher_b');
set local role authenticated;
select tests.ok(tests.n('select * from public.lessons') = 3, 'teacher sees all lessons including drafts');
-- D23: teachers edit vocabulary (practice content); curriculum tree stays admin-only
select tests.lives($$insert into public.vocabulary (level_id, word, meaning_vi) values ('10000000-0000-0000-0000-00000000000a', 'teach', 'dạy')$$,
  'teacher can add vocabulary');
select tests.throws($$insert into public.lessons (unit_id, title) values ('30000000-0000-0000-0000-00000000000a', 'x')$$,
  'teacher cannot edit the curriculum tree', '42501');
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
