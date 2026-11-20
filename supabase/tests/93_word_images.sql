-- Word pictures (0026): uploaded image per word, visible through guest links
begin;

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.topics (id, level_id, code, title_en, title_vi, status)
  values ('a2600000-0000-0000-0000-000000000001', (select id from public.levels where code = 'MOVERS'),
          't-images', 'Images', 'Ảnh', 'published')$$, 'teacher creates a topic');
select tests.lives($$insert into public.vocabulary (level_id, topic_id, word, meaning_vi, image_path, status)
  values ((select id from public.levels where code = 'MOVERS'), 'a2600000-0000-0000-0000-000000000001',
          'garden26', 'khu vườn', 'practice/images/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.webp', 'published')$$,
  'teacher saves a word with an uploaded picture');
select tests.throws($$insert into public.vocabulary (level_id, topic_id, word, meaning_vi, image_path, status)
  values ((select id from public.levels where code = 'MOVERS'), 'a2600000-0000-0000-0000-000000000001',
          'bad26', 'x', 'reports/secret.png', 'published')$$, 'pictures must live under practice/images/', '23514');
select tests.lives($$insert into storage.objects (bucket_id, name)
  values ('learning-media', 'practice/images/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.webp')$$,
  'teacher uploads the picture');
select tests.lives($$insert into public.practice_activities (id, topic_id, kind, title_en, title_vi, status, public_token)
  values ('b2600000-0000-0000-0000-000000000001', 'a2600000-0000-0000-0000-000000000001', 'look_choose',
          'Look', 'Nhìn', 'published', 'ImageToken_0123456789')$$, 'activity with a guest link');
reset role;

set local role anon;
select tests.ok(public.get_public_activity('ImageToken_0123456789') -> 'words' -> 0 ->> 'image_path'
  = 'practice/images/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.webp', 'guest links include the picture path');
reset role;

select tests.ok((public.health_check() ->> 'schema_version')::int >= 26, 'schema version is current');
rollback;
