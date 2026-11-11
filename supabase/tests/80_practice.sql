-- Phase 1: practice library (open to every level), staff editing, progress
begin;

-- staff create content
select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.topics (id, level_id, code, title_en, title_vi, emoji, status)
  values ('a1000000-0000-0000-0000-000000000001', (select id from public.levels where code = 'STARTERS'),
          't-animals', 'Animals', 'Con vật', '1f408', 'published')$$, 'teacher can create a topic');
select tests.lives($$insert into public.topics (id, level_id, code, title_en, title_vi, status)
  values ('a1000000-0000-0000-0000-000000000002', (select id from public.levels where code = 'STARTERS'),
          't-secret', 'Draft topic', 'Nháp', 'draft')$$, 'teacher can create a draft topic');
select tests.lives($$insert into public.vocabulary (level_id, topic_id, word, meaning_vi, emoji, status)
  values ((select id from public.levels where code = 'STARTERS'), 'a1000000-0000-0000-0000-000000000001', 't-cat', 'con mèo', '1f408', 'published')$$,
  'teacher can add vocabulary');
select tests.lives($$insert into public.practice_activities (id, topic_id, kind, title_en, title_vi, status, content)
  values ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'listen_choose', 'Listen', 'Nghe và chọn', 'published', '{"words":["cat"]}')$$,
  'teacher can add an activity');
select tests.lives($$insert into public.practice_activities (id, topic_id, kind, title_en, title_vi, status)
  values ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'spell', 'Spell', 'Đánh vần', 'draft')$$,
  'teacher can add a draft activity');
select tests.throws($$insert into public.topics (level_id, code, title_en, title_vi, emoji)
  values ((select id from public.levels where code = 'STARTERS'), 'bad', 'Bad', 'Bad', 'not-an-emoji')$$,
  'emoji must be a code point sequence', '23514');
reset role;

-- a student of a Movers class still opens Starters content
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n($$select * from public.topics where code = 't-animals'$$) = 1, 'student reads a published topic of another level');
select tests.ok(tests.n($$select * from public.topics where code = 't-secret'$$) = 0, 'student cannot read a draft topic');
select tests.ok(tests.n($$select * from public.practice_activities where topic_id = 'a1000000-0000-0000-0000-000000000001'$$) = 1, 'student reads only published activities');
select tests.ok(tests.n($$select * from public.vocabulary where word = 't-cat'$$) = 1, 'student reads practice vocabulary');
select tests.ok(tests.n($$select * from public.levels where code in ('STARTERS','MOVERS','FLYERS')$$) = 3, 'student sees every published level');
select tests.throws($$insert into public.topics (level_id, code, title_en, title_vi)
  values ((select id from public.levels where code = 'STARTERS'), 'mine', 'Mine', 'Của em')$$, 'student cannot create topics', '42501');
update public.practice_activities set title_en = 'hacked';
select tests.ok(not exists (select 1 from public.practice_activities where title_en = 'hacked'), 'student cannot edit activities');

select tests.ok(public.record_practice('b1000000-0000-0000-0000-000000000001', 9, 10, 40) = 3, '9/10 earns 3 stars');
select tests.ok(public.record_practice('b1000000-0000-0000-0000-000000000001', 7, 10, 40) = 2, '7/10 earns 2 stars');
select tests.ok(public.record_practice('b1000000-0000-0000-0000-000000000001', 1, 10, 40) = 1, '1/10 earns 1 star');
select tests.throws($$select public.record_practice('b1000000-0000-0000-0000-000000000001', 11, 10, 40)$$, 'score above max is rejected', '22023');
select tests.throws($$select public.record_practice('b1000000-0000-0000-0000-000000000002', 1, 1, 5)$$, 'draft activity cannot be recorded', '22023');
select tests.ok(tests.n($$select * from public.progress_records where practice_activity_id = 'b1000000-0000-0000-0000-000000000001'$$) = 3,
  'student reads own practice progress');
reset role;

-- the Starters pack (migration 0014) is published and open to this student
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n($$select * from public.topics t join public.levels l on l.id = t.level_id where l.code = 'STARTERS' and t.code not like 't-%'$$) = 12,
  'student sees the 12 Starters topics');
select tests.ok(tests.n($$select * from public.practice_activities a join public.topics t on t.id = a.topic_id where t.code = 'animals'$$) = 10,
  'each Starters topic has 10 activities (8 + listen-and-write + skills challenge, 0017)');
select tests.ok(tests.n($$select * from public.topics t join public.levels l on l.id = t.level_id where l.code = 'GS1' and t.code like 'unit-%'$$) = 16,
  'student sees the 16 Global Success 1 units');
select tests.ok(tests.n($$select * from public.practice_activities a join public.topics t on t.id = a.topic_id
  join public.levels l on l.id = t.level_id where l.code = 'GS1' and t.code = 'unit-01'$$) = 11,
  'each GS1 unit has 11 activities, reading and mixed included');
reset role;

-- topic withdrawn: everything under it disappears for students
update public.topics set status = 'draft' where id = 'a1000000-0000-0000-0000-000000000001';
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n($$select * from public.practice_activities where topic_id = 'a1000000-0000-0000-0000-000000000001'$$) = 0, 'activities of an unpublished topic are hidden');
select tests.ok(tests.n($$select * from public.vocabulary where word = 't-cat'$$) = 0, 'vocabulary of an unpublished topic is hidden');
select tests.throws($$select public.record_practice('b1000000-0000-0000-0000-000000000001', 1, 1, 5)$$,
  'activity of an unpublished topic cannot be recorded', '22023');
reset role;

-- other roles
select tests.login('teacher_a');
set local role authenticated;
select tests.throws($$select public.record_practice('b1000000-0000-0000-0000-000000000001', 1, 1, 5)$$,
  'teachers do not record practice', '42501');
select tests.ok(tests.n($$select * from public.topics where code = 't-secret'$$) = 1, 'teacher sees drafts');
reset role;
select tests.login('teacher_b');
set local role authenticated;
select tests.ok(tests.n($$select * from public.progress_records where practice_activity_id is not null$$) = 0,
  'a teacher of another class cannot see the student''s practice');
reset role;
set local role anon;
select tests.throws($$select * from public.topics$$, 'anon cannot read topics', '42501');
reset role;

rollback;
