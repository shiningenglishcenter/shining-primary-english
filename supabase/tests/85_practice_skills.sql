-- Phase 1 feedback: new activity kinds and listening-audio uploads (0015)
begin;

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.topics (id, level_id, code, title_en, title_vi, status)
  values ('a1500000-0000-0000-0000-000000000001', (select id from public.levels where code = 'GS1'),
          't-gs1-unit', 'Unit 1', 'Bài 1', 'published')$$, 'teacher can create a Global Success unit');
select tests.lives($$insert into public.practice_activities (topic_id, kind, title_en, title_vi, status, content)
  values ('a1500000-0000-0000-0000-000000000001', 'listening', 'Listen', 'Nghe', 'draft',
          '{"media":{"source":"youtube","videoId":"dQw4w9WgXcQ"},"items":[]}')$$, 'listening activity');
select tests.lives($$insert into public.practice_activities (topic_id, kind, title_en, title_vi, status)
  values ('a1500000-0000-0000-0000-000000000001', 'reading', 'Read', 'Đọc', 'draft')$$, 'reading activity');
select tests.lives($$insert into public.practice_activities (topic_id, kind, title_en, title_vi, status)
  values ('a1500000-0000-0000-0000-000000000001', 'listen_type', 'Write', 'Viết', 'draft')$$, 'listen_type activity');
select tests.lives($$insert into public.practice_activities (topic_id, kind, title_en, title_vi, status)
  values ('a1500000-0000-0000-0000-000000000001', 'mixed', 'Mix', 'Tổng hợp', 'draft')$$, 'mixed activity');
select tests.lives($$insert into public.practice_activities (id, topic_id, kind, title_en, title_vi, status, settings)
  values ('b1500000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'listen_type', 'Write 2',
          'Viết 2', 'published', '{"hints": false, "maxTries": 2}')$$, 'published activity with settings');
select tests.throws($$update public.practice_activities set settings = '[]' where id = 'b1500000-0000-0000-0000-000000000001'$$,
  'settings must be an object', '23514');
select tests.lives($$insert into storage.objects (bucket_id, name)
  values ('learning-media', 'practice/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.mp3')$$, 'teacher can upload listening audio');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('learning-media', 'video/x.mp4')$$,
  'teacher cannot upload outside practice/', '42501');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.throws($$insert into storage.objects (bucket_id, name)
  values ('learning-media', 'practice/0b7e1c8e-2222-4a3b-9c1d-2e3f4a5b6c7d.mp3')$$,
  'student cannot upload listening audio', '42501');
select tests.ok(tests.n($$select * from storage.objects where bucket_id = 'learning-media' and name like 'practice/%'$$) = 1,
  'student can read listening audio');
select tests.ok(public.record_practice('b1500000-0000-0000-0000-000000000001', 3, 4, 20,
  '[{"t":"listen_type","q":"cat","p":2},{"t":"listen_type","q":"dog","p":1}]') = 2, 'record with per-question details');
select tests.ok((select jsonb_array_length(details) from public.progress_records
  where practice_activity_id = 'b1500000-0000-0000-0000-000000000001') = 2, 'details are stored');
select tests.ok(public.record_practice('b1500000-0000-0000-0000-000000000001', 1, 4, 20, '{"bad":1}') = 1,
  'malformed details do not block the score');
select tests.ok(tests.n($$select * from public.progress_records where practice_activity_id = 'b1500000-0000-0000-0000-000000000001'
  and details is null$$) = 1, 'malformed details are dropped');
select tests.ok(public.record_practice('b1500000-0000-0000-0000-000000000001', 4, 4, 20) = 3, 'four-argument call still works');
reset role;

select tests.ok((public.health_check() ->> 'schema_version')::int >= 15, 'schema version is current');

rollback;
