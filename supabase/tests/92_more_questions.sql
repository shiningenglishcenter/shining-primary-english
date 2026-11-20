-- Teacher feedback C8 (0025): seeded sentence activities have at least 6 questions
begin;

select tests.ok(tests.n($$select 1 from public.practice_activities p
  join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code in ('STARTERS', 'GS1') and p.created_by is null and p.deleted_at is null and t.code not like 'review-%'
    and p.kind in ('true_false', 'fill_blank', 'rearrange', 'reading')$$) = 12 * 3 + 16 * 4,
  'every seeded Starters/GS1 sentence activity is there');
select tests.ok(tests.n($$select 1 from public.practice_activities p
  join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code in ('STARTERS', 'GS1') and p.created_by is null and p.deleted_at is null
    and p.kind in ('true_false', 'fill_blank', 'rearrange', 'reading')
    and jsonb_array_length(p.content -> 'items') < 6$$) = 0,
  'no seeded sentence activity has fewer than 6 questions');
select tests.ok((select jsonb_array_length(p.content -> 'items') from public.practice_activities p
  join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code = 'GS1' and t.code = 'unit-01' and p.kind = 'rearrange') = 6,
  'GS1 unit 1 "Make a sentence" has 3 + 3 sentences');
select tests.ok((select p.content -> 'items' -> 0 ->> 'sentence' from public.practice_activities p
  join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code = 'STARTERS' and t.code = 'animals' and p.kind = 'rearrange') = 'I have got a cat.',
  'original questions keep their place');

rollback;
