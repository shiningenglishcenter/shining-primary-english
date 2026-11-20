-- Teacher comments per topic (0032): teachers of the student and admins only
begin;

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.topic_comments (student_id, topic_id, body)
  values ('5000000a-0000-0000-0000-000000000000',
          (select t.id from public.topics t join public.levels l on l.id = t.level_id
           where l.code = 'STARTERS' and t.code = 'animals'), 'Con nhớ từ tốt, cần ôn câu dài.')$$,
  'a teacher of the student writes a comment');
select tests.throws($$insert into public.topic_comments (student_id, topic_id, body)
  values ('5000000a-0000-0000-0000-000000000000',
          (select t.id from public.topics t join public.levels l on l.id = t.level_id
           where l.code = 'STARTERS' and t.code = 'animals'), 'again')$$,
  'one comment per student and topic', '23505');
reset role;

select tests.login('teacher_b');
set local role authenticated;
select tests.ok(tests.n($$select * from public.topic_comments$$) = 0, 'other teachers see nothing');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n($$select * from public.topic_comments$$) = 0, 'pupils see nothing');
reset role;

rollback;
