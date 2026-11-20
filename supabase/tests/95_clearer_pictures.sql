-- Clearer pictures (0028): seeded words and sentence items use the composed pictures
begin;

select tests.ok((select v.emoji from public.vocabulary v join public.levels l on l.id = v.level_id
  where l.code = 'STARTERS' and v.word = 'garden') = 'f0001', 'garden shows a garden, not a house');
select tests.ok((select v.emoji from public.vocabulary v join public.levels l on l.id = v.level_id
  where l.code = 'STARTERS' and v.word = 'grandfather') = 'f0003', 'grandfather has a walking stick');
select tests.ok((select p.content -> 'items' @> '[{"sentence": "The frog can jump.", "emoji": "f0005"}]'
  from public.practice_activities p join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code = 'STARTERS' and t.code = 'animals' and p.kind = 'rearrange'), 'the frog is jumping');
select tests.ok((select p.content -> 'items' @> '[{"sentence": "The ___ is in the tree.", "emoji": "f0002"}]'
  from public.practice_activities p join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code = 'STARTERS' and t.code = 'animals' and p.kind = 'fill_blank'), 'the monkey is in the tree');
select tests.ok((select jsonb_array_length(p.content -> 'items')
  from public.practice_activities p join public.topics t on t.id = p.topic_id join public.levels l on l.id = t.level_id
  where l.code = 'STARTERS' and t.code = 'animals' and p.kind = 'fill_blank') = 6, '0025 questions are kept');

rollback;
