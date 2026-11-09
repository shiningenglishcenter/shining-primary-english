-- Test bank secrecy, attempts, server-side grading, manual grading
begin;

-- Students can't touch the bank directly
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.questions') = 0,            'student cannot read questions table');
select tests.ok(tests.n('select * from public.question_options') = 0,     'student cannot read options table');
select tests.ok(tests.n('select * from public.question_answer_keys') = 0, 'student cannot read answer keys');
select tests.ok(tests.n('select * from public.tests') = 0,                'student cannot see tests not assigned to them');
select tests.throws($$insert into public.test_attempts (assignment_student_id, student_id, test_id, attempt_number) values (gen_random_uuid(), '5000000a-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', 1)$$,
  'student cannot insert attempts directly', '42501');
reset role;

-- Teacher B cannot assign to class A or its students
select tests.login('teacher_b');
set local role authenticated;
select tests.throws($$select public.create_assignment('e0000000-0000-0000-0000-000000000001', 'x', 'c000000a-0000-0000-0000-000000000000')$$,
  'teacher cannot assign to an unassigned class', 'P0002');
select tests.throws($$select public.create_assignment('e0000000-0000-0000-0000-000000000001', 'x', null, array['5000000a-0000-0000-0000-000000000000']::uuid[])$$,
  'teacher cannot assign to another class''s student', '42501');
reset role;

-- Teacher A assigns to class A
select tests.login('teacher_a');
set local role authenticated;
select set_config('t.asg', public.create_assignment('e0000000-0000-0000-0000-000000000001', 'Unit 1 quiz',
  'c000000a-0000-0000-0000-000000000000', null, now() - interval '1 hour', now() + interval '7 days', 20, 1::smallint)::text, true);
select tests.ok(tests.n(format('select * from public.assignment_students where assignment_id = %L', current_setting('t.asg'))) = 2,
  'class assignment reaches both class A students');
reset role;
select set_config('t.ast_an',   (select id::text from public.assignment_students where student_id = '5000000a-0000-0000-0000-000000000000'), true);
select set_config('t.ast_binh', (select id::text from public.assignment_students where student_id = '5000000b-0000-0000-0000-000000000000'), true);

-- Student An takes the test
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.tests') = 1, 'assigned test is visible to student');
select tests.throws(format('select public.start_attempt(%L)', current_setting('t.ast_binh')), 'student cannot start a classmate''s assignment', 'P0002');
select set_config('t.att', public.start_attempt(current_setting('t.ast_an')::uuid)::text, true);
select tests.ok(public.start_attempt(current_setting('t.ast_an')::uuid) = current_setting('t.att')::uuid, 'starting again resumes the same attempt');

select set_config('t.paper', public.get_attempt_paper(current_setting('t.att')::uuid)::text, true);
select tests.ok(jsonb_array_length(current_setting('t.paper')::jsonb -> 'questions') = 7, 'paper has all 7 questions');
select tests.ok(current_setting('t.paper') not like '%option_ids%' and current_setting('t.paper') not like '%accepted%'
             and current_setting('t.paper') not like '%"pairs"%' and current_setting('t.paper') not like '%goes%'
             and current_setting('t.paper') not like '%explanation%',
  'question paper contains no answer keys or explanations');
select tests.throws(format('select public.get_attempt_review(%L)', current_setting('t.att')), 'student cannot view answers before submitting', 'P0001');
select tests.ok(not exists (select 1 from public.student_answers where is_correct is not null), 'no correctness leaks before submit');

select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000001', '{"option_ids":["0a000000-0000-0000-0000-000000000012"]}');  -- right   2/2
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000002', '{"option_ids":["0a000000-0000-0000-0000-000000000021"]}');  -- wrong   0/2
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000003', '{"blanks":["  Goes ","like"]}');                         -- 1 of 2  1/2
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000004', '{"pairs":{"l1":"r1","l2":"r1"}}');                        -- 1 of 2  1/2
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000005', '{"tokens":["I","like","apples","."]}');                   -- right   2/2
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000006', '{"text":"It’s BLACK!"}');                                 -- right   2/2
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000007', '{"text":"I have a sister. My dad is a doctor."}');       -- manual  ?/4
select tests.throws(format('select public.save_answer(%L, %L, %L)', current_setting('t.att'), gen_random_uuid(), '{}'),
  'cannot answer a question outside the attempt', 'P0002');
select tests.throws(format($$select public.save_answer(%L, 'f0000000-0000-0000-0000-000000000001', '[1,2]')$$, current_setting('t.att')),
  'malformed response is rejected', '22023');
select tests.throws($$update public.student_answers set final_points = 2$$, 'student cannot write scores directly', '42501');

select set_config('t.sub', public.submit_attempt(current_setting('t.att')::uuid)::text, true);
select tests.ok((current_setting('t.sub')::jsonb ->> 'total_score')::numeric = 8, 'auto score = 8 (2+0+1+1+2+2) computed on server');
select tests.ok((current_setting('t.sub')::jsonb ->> 'max_score')::numeric = 16, 'max score = 16');
select tests.ok(current_setting('t.sub')::jsonb ->> 'status' = 'submitted' and (current_setting('t.sub')::jsonb ->> 'pending_manual')::int = 1,
  'written answer leaves attempt pending manual grading');
select tests.ok((public.submit_attempt(current_setting('t.att')::uuid) ->> 'total_score')::numeric = 8, 'submit is idempotent');
select tests.throws(format($$select public.save_answer(%L, 'f0000000-0000-0000-0000-000000000001', '{"option_ids":[]}')$$, current_setting('t.att')),
  'answers cannot change after submission', 'P0001');
select tests.ok(public.get_attempt_review(current_setting('t.att')::uuid) -> 'questions' -> 0 -> 'correct_answer' is not null,
  'student sees correct answers after submitting');
select tests.throws(format('select public.start_attempt(%L)', current_setting('t.ast_an')), 'max attempts enforced', 'P0001');
reset role;
select set_config('t.written', (select id::text from public.student_answers where attempt_id = current_setting('t.att')::uuid and question_id = 'f0000000-0000-0000-0000-000000000007'), true);
select set_config('t.q2',      (select id::text from public.student_answers where attempt_id = current_setting('t.att')::uuid and question_id = 'f0000000-0000-0000-0000-000000000002'), true);

-- Other students / parents / teachers
select tests.login('stu_binh');
set local role authenticated;
select tests.ok(tests.n('select * from public.test_attempts') = 0, 'classmate cannot see An''s attempt');
select tests.throws(format('select public.get_attempt_review(%L)', current_setting('t.att')), 'classmate cannot review An''s attempt', 'P0002');
reset role;

select tests.login('parent_chi');
set local role authenticated;
select tests.throws(format('select public.get_attempt_review(%L)', current_setting('t.att')), 'unrelated parent cannot review attempt', 'P0002');
reset role;

select tests.login('teacher_b');
set local role authenticated;
select tests.ok(tests.n('select * from public.test_attempts') = 0, 'other teacher cannot see attempt');
select tests.throws(format('select public.grade_answer(%L, 3)', current_setting('t.written')), 'other teacher cannot grade', 'P0002');
reset role;

-- Teacher A grades
select tests.login('teacher_a');
set local role authenticated;
select tests.throws(format('select public.grade_answer(%L, 5)', current_setting('t.written')), 'manual points cannot exceed max', '22023');
select tests.ok((public.grade_answer(current_setting('t.written')::uuid, 3, 'Good sentences! Check capital letters.') ->> 'total_score')::numeric = 11,
  'manual grade 3/4 → total 11');
select tests.ok((select status from public.test_attempts where id = current_setting('t.att')::uuid) = 'graded', 'attempt becomes graded');
select tests.ok((public.grade_answer(current_setting('t.q2')::uuid, 2) ->> 'total_score')::numeric = 13, 'teacher can override an auto-graded answer');
select tests.lives(format($$insert into public.teacher_comments (student_id, attempt_id, author_id, kind, body) values ('5000000a-0000-0000-0000-000000000000', %L, auth.uid(), 'attempt_overall', 'Great progress this week!')$$, current_setting('t.att')),
  'teacher adds overall feedback');
select tests.throws(format($$insert into public.teacher_comments (student_id, attempt_id, author_id, kind, body) values ('5000000b-0000-0000-0000-000000000000', %L, auth.uid(), 'attempt_overall', 'x')$$, current_setting('t.att')),
  'comment must belong to the attempt''s student', '42501');
select tests.throws($$insert into public.teacher_comments (student_id, author_id, kind, body) values ('5000000a-0000-0000-0000-000000000000', tests.uid('admin1'), 'general', 'x')$$,
  'teacher cannot post as someone else', '42501');
reset role;
select tests.ok(exists (select 1 from private.audit_log where action = 'answer_graded' and entity_id = current_setting('t.written')::uuid), 'grading is audited');

select tests.login('parent_an');
set local role authenticated;
select tests.ok((select total_score from public.test_attempts where id = current_setting('t.att')::uuid) = 13, 'parent sees child''s final score');
select tests.ok(jsonb_array_length(public.get_attempt_review(current_setting('t.att')::uuid) -> 'questions' -> 6 -> 'comments') = 1,
  'parent sees teacher''s question comment');
reset role;

-- Historical integrity: attempted tests are frozen
select tests.login('admin1');
set local role authenticated;
select tests.throws($$update public.test_questions set points = 10 where test_id = 'e0000000-0000-0000-0000-000000000001'$$, 'attempted test questions are frozen', '55000');
select tests.throws($$update public.question_answer_keys set key = '{"option_ids":[]}' where question_id = 'f0000000-0000-0000-0000-000000000001'$$, 'answered question keys are frozen', '55000');
reset role;

-- Time limit enforced on the server
select tests.login('stu_binh');
set local role authenticated;
select set_config('t.att_b', public.start_attempt(current_setting('t.ast_binh')::uuid)::text, true);
reset role;
update public.test_attempts set deadline_at = now() - interval '5 minutes' where id = current_setting('t.att_b')::uuid;
select tests.login('stu_binh');
set local role authenticated;
select tests.throws(format($$select public.save_answer(%L, 'f0000000-0000-0000-0000-000000000001', '{"option_ids":[]}')$$, current_setting('t.att_b')),
  'answers rejected after time limit', 'P0001');
select tests.ok(public.start_attempt(current_setting('t.ast_binh')::uuid) = current_setting('t.att_b')::uuid, 'expired attempt is auto-submitted, no extra attempt created');
select tests.ok((select status from public.test_attempts where id = current_setting('t.att_b')::uuid) <> 'in_progress', 'expired attempt was finalized');
reset role;

rollback;
