-- Retry rounds (0027): stored for teachers, never stars
begin;

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.topics (id, level_id, code, title_en, title_vi, status)
  values ('a2700000-0000-0000-0000-000000000001', (select id from public.levels where code = 'MOVERS'),
          't-retry', 'Retry', 'Luyện lại', 'published')$$, 'teacher creates a topic');
select tests.lives($$insert into public.practice_activities (id, topic_id, kind, title_en, title_vi, status)
  values ('b2700000-0000-0000-0000-000000000001', 'a2700000-0000-0000-0000-000000000001', 'look_choose',
          'Look', 'Nhìn', 'published')$$, 'published activity');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.ok(public.record_practice('b2700000-0000-0000-0000-000000000001', 6, 12, 40) = 1, 'a full round earns stars');
select tests.ok(public.record_practice('b2700000-0000-0000-0000-000000000001', 6, 6, 20,
  '[{"t":"look_choose","q":"cat","p":2,"x":2}]', true) = 0, 'a retry round earns no stars');
select tests.ok((select count(*) from public.progress_records
  where practice_activity_id = 'b2700000-0000-0000-0000-000000000001' and is_retry) = 1, 'the retry round is stored');
select tests.ok((select count(*) from public.progress_records
  where practice_activity_id = 'b2700000-0000-0000-0000-000000000001' and not is_retry) = 1, 'full rounds are not retries');
select tests.ok(public.record_practice('b2700000-0000-0000-0000-000000000001', 3, 4, 20,
  '[{"t":"look_choose","q":"cat","p":2,"x":2}]') = 2, 'five-argument call still works');
reset role;

select tests.ok((public.health_check() ->> 'schema_version')::int >= 27, 'schema version is current');
rollback;
