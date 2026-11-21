-- Programmes and levels in the database (0033)
begin;

select tests.ok((select count(*) from public.programs where deleted_at is null) = 2, 'Cambridge and Global Success exist');
select tests.ok((select slug from public.levels where code = 'GS1') = 'g1', 'GS1 has the slug g1');
select tests.ok((select short_name from public.levels where code = 'STARTERS') = 'Starters', 'short names are filled');
select tests.ok(jsonb_array_length(public.practice_levels()) = 2, 'practice_levels lists the published programmes');
select tests.ok(public.practice_levels() -> 1 ->> 'topicNoun' = 'unit', 'Global Success calls topics units');

select tests.login('admin1');
set local role authenticated;
select tests.lives($$insert into public.programs (code, name, topic_noun, sort_order) values ('family_friends', 'Family and Friends', 'unit', 30)$$,
  'an admin adds a programme');
select tests.lives($$insert into public.levels (code, name, program, slug, short_name, program_id, sort_order, status)
  values ('FF1', 'Family and Friends 1', 'other', 'ff1', 'FF1', (select id from public.programs where code = 'family_friends'), 200, 'published')$$,
  'an admin adds a level to it');
reset role;
select tests.ok(public.practice_levels() -> 2 -> 'levels' -> 0 ->> 'slug' = 'ff1', 'the new level is listed');

select tests.login('teacher_a');
set local role authenticated;
select tests.throws($$insert into public.programs (code, name) values ('nope', 'Nope')$$, 'teachers cannot add programmes', '42501');
reset role;

set local role anon;
select tests.ok(jsonb_array_length(public.practice_levels()) >= 2, 'anyone can read the published catalogue');
reset role;
rollback;
