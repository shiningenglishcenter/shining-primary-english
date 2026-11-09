-- Parent reports (data accuracy + visibility), progress records, storage
begin;

-- Arrange: An completes a graded quiz this month
select tests.login('teacher_a');
set local role authenticated;
select public.create_assignment('e0000000-0000-0000-0000-000000000001', 'Unit 1 quiz', 'c000000a-0000-0000-0000-000000000000',
  null, now() - interval '1 hour', now() + interval '1 day');
reset role;
select set_config('t.ast_an', (select id::text from public.assignment_students where student_id = '5000000a-0000-0000-0000-000000000000'), true);

select tests.login('stu_an');
set local role authenticated;
select set_config('t.att', public.start_attempt(current_setting('t.ast_an')::uuid)::text, true);
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000001', '{"option_ids":["0a000000-0000-0000-0000-000000000012"]}');
select public.save_answer(current_setting('t.att')::uuid, 'f0000000-0000-0000-0000-000000000006', '{"text":"black"}');
select public.submit_attempt(current_setting('t.att')::uuid);
-- practice records: own only, recent only
select tests.lives($$insert into public.progress_records (student_id, activity, skill, score, max_score, duration_seconds) values ('5000000a-0000-0000-0000-000000000000', 'flashcards', 'vocabulary', 8, 10, 600)$$,
  'student records own practice');
select tests.throws($$insert into public.progress_records (student_id, activity) values ('5000000b-0000-0000-0000-000000000000', 'flashcards')$$,
  'student cannot record practice for someone else', '42501');
select tests.throws($$insert into public.progress_records (student_id, activity, recorded_at) values ('5000000a-0000-0000-0000-000000000000', 'flashcards', now() - interval '30 days')$$,
  'student cannot backdate practice', '42501');
reset role;
select set_config('t.written', (select id::text from public.student_answers where attempt_id = current_setting('t.att')::uuid and question_id = 'f0000000-0000-0000-0000-000000000007'), true);

select tests.login('teacher_a');
set local role authenticated;
select public.grade_answer(current_setting('t.written')::uuid, 2);
insert into public.teacher_comments (student_id, attempt_id, author_id, kind, body, visible_to_parent)
values ('5000000a-0000-0000-0000-000000000000', current_setting('t.att')::uuid, auth.uid(), 'attempt_overall', 'An làm bài rất tốt, cần luyện thêm ngữ pháp.', true),
       ('5000000a-0000-0000-0000-000000000000', current_setting('t.att')::uuid, auth.uid(), 'attempt_overall', 'INTERNAL: check homework habits', false);

select set_config('t.month_start', date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date::text, true);
select set_config('t.month_end', ((date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') + interval '1 month')::date - 1)::text, true);
select set_config('t.rep', public.create_parent_report('5000000a-0000-0000-0000-000000000000', 'monthly',
  current_setting('t.month_start')::date, current_setting('t.month_end')::date, null, 'c000000a-0000-0000-0000-000000000000')::text, true);
select set_config('t.snap', (select data_snapshot::text from public.parent_reports where id = current_setting('t.rep')::uuid), true);
reset role;

-- Assert: every number matches the database
select tests.ok(current_setting('t.snap')::jsonb #>> '{student,full_name}' = 'Nguyễn Văn An', 'report keeps Vietnamese diacritics');
select tests.ok((current_setting('t.snap')::jsonb #>> '{assignments,total}')::int = 1
            and (current_setting('t.snap')::jsonb #>> '{assignments,completed}')::int = 1, 'assignment counts match');
select tests.ok((current_setting('t.snap')::jsonb #>> '{tests,0,total_score}')::numeric
              = (select total_score from public.test_attempts where id = current_setting('t.att')::uuid)
            and (current_setting('t.snap')::jsonb #>> '{tests,0,total_score}')::numeric = 6, 'report score equals stored attempt score (2+2+2=6)');
select tests.ok((select (s ->> 'percent')::numeric from jsonb_array_elements(current_setting('t.snap')::jsonb -> 'skills') s where s ->> 'skill' = 'writing') = 50,
  'writing skill 2/4 = 50%');
select tests.ok((select (s ->> 'percent')::numeric from jsonb_array_elements(current_setting('t.snap')::jsonb -> 'skills') s where s ->> 'skill' = 'vocabulary') = 50,
  'vocabulary skill 2/4 = 50% (one MC right, matching unanswered)');
select tests.ok(jsonb_array_length(current_setting('t.snap')::jsonb -> 'comments') = 1
            and current_setting('t.snap') not like '%INTERNAL%', 'report includes only parent-visible comments');
select tests.ok((current_setting('t.snap')::jsonb #>> '{practice,0,minutes}')::numeric = 10, 'practice minutes from progress records');
select tests.ok(current_setting('t.snap')::jsonb #>> '{class,teachers,0}' = 'Teacher A', 'report lists current class teacher');

-- Visibility & edit rules
select tests.login('parent_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.parent_reports') = 0, 'parent cannot see a draft report');
reset role;

select tests.login('teacher_a');
set local role authenticated;
select tests.throws(format($$update public.parent_reports set data_snapshot = '{"tests":[{"total_score":100}]}' where id = %L$$, current_setting('t.rep')),
  'teacher cannot alter report figures', '42501');
select tests.lives(format($$update public.parent_reports set teacher_comment = 'Con tiến bộ rõ rệt trong tháng này.', strengths = 'Từ vựng', improvements = 'Ngữ pháp' where id = %L$$, current_setting('t.rep')),
  'teacher edits comments before export');
select tests.lives(format($$select public.refresh_parent_report(%L)$$, current_setting('t.rep')), 'draft report can be refreshed from latest data');
select tests.lives(format($$update public.parent_reports set status = 'published', png_path = '5000000a-0000-0000-0000-000000000000/%s.png' where id = %L$$, current_setting('t.rep'), current_setting('t.rep')),
  'teacher publishes report');
select tests.lives(format($$insert into storage.objects (bucket_id, name) values ('reports', '5000000a-0000-0000-0000-000000000000/%s.png')$$, current_setting('t.rep')),
  'teacher uploads report image to own student folder');
select tests.throws(format($$select public.refresh_parent_report(%L)$$, current_setting('t.rep')), 'published report is immutable', 'P0001');
select tests.throws(format($$select public.create_parent_report('5000000a-0000-0000-0000-000000000000', 'test', null, null, %L)$$, gen_random_uuid()),
  'test report needs a real submitted attempt', 'P0002');
select tests.lives(format($$select public.create_parent_report('5000000a-0000-0000-0000-000000000000', 'test', null, null, %L)$$, current_setting('t.att')),
  'teacher creates an individual test report');
reset role;
select tests.ok((select published_at is not null from public.parent_reports where id = current_setting('t.rep')::uuid), 'published_at set by server');

select tests.login('teacher_b');
set local role authenticated;
select tests.throws($$select public.create_parent_report('5000000a-0000-0000-0000-000000000000', 'monthly', '2026-11-01', '2026-11-30')$$,
  'other teacher cannot create a report for An', 'P0002');
select tests.ok(tests.n('select * from public.parent_reports') = 0, 'other teacher cannot see An''s reports');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('reports', '5000000a-0000-0000-0000-000000000000/fake.png')$$,
  'other teacher cannot upload into An''s report folder', '42501');
reset role;

select tests.login('parent_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.parent_reports') = 1, 'parent sees the published report (not the draft test report)');
select tests.ok(tests.n($$select * from storage.objects where bucket_id = 'reports'$$) = 1, 'parent can download published report image');
reset role;

select tests.login('parent_chi');
set local role authenticated;
select tests.ok(tests.n('select * from public.parent_reports') = 0, 'unrelated parent cannot see the report');
select tests.ok(tests.n($$select * from storage.objects where bucket_id = 'reports'$$) = 0, 'unrelated parent cannot download report files');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.teacher_comments') = 2, 'student sees comments marked visible to students');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('learning-media', 'video/x.mp4')$$, 'student cannot upload learning media', '42501');
reset role;

rollback;
