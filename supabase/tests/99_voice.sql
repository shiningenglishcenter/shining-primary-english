-- Recorded voice (0044, D67): public bucket; staff add their own recordings under custom/ only
begin;

select tests.ok((select public from storage.buckets where id = 'voice'), 'the voice bucket is public');
select tests.ok((public.health_check() ->> 'schema_version')::int >= 44, 'schema version 44 or later');

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into storage.objects (bucket_id, name) values ('voice', 'custom/0b6f3d2e-6a49-4c1e-9a43-1f1e7c3a9d10.webm')$$,
  'a teacher uploads a recording');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('voice', 'emma/abc.mp3')$$,
  'teachers cannot replace the default voice', '42501');
select tests.lives($$update public.topics set voices = '{"0000000000000000000000000000": "custom/0b6f3d2e-6a49-4c1e-9a43-1f1e7c3a9d10.webm"}'
  where id = (select id from public.topics where deleted_at is null order by id limit 1)$$, 'a teacher sets a topic voice');
select tests.throws($$update public.topics set voices = '[]' where id = (select id from public.topics order by id limit 1)$$,
  'voices must be an object', '23514');
reset role;

select tests.login('stu_an');
set local role authenticated;
select tests.throws($$insert into storage.objects (bucket_id, name) values ('voice', 'custom/1b6f3d2e-6a49-4c1e-9a43-1f1e7c3a9d10.webm')$$,
  'pupils cannot upload voices', '42501');
reset role;

rollback;
