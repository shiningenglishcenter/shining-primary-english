-- Round 3 (0029–0031): meaning games, sentence patterns, GS1 term reviews
begin;

select tests.ok((select jsonb_array_length(t.patterns) from public.topics t join public.levels l on l.id = t.level_id
  where l.code = 'STARTERS' and t.code = 'animals') = 4, 'Starters topics have sentence patterns');
select tests.ok((select count(*) from public.practice_activities p join public.topics t on t.id = p.topic_id
  join public.levels l on l.id = t.level_id where l.code in ('STARTERS', 'GS1') and p.kind = 'match_meaning') = 30,
  'every topic has a meaning game (plus the 2 reviews)');
select tests.ok((select count(*) from public.topics t join public.levels l on l.id = t.level_id
  where l.code = 'GS1' and t.code like 'review-%') = 2, 'two GS1 term reviews');
select tests.throws($$update public.topics set patterns = '{"en":"x"}' where code = 'animals'$$,
  'patterns must be a list', '23514');

-- a guest link on a review word game gets the words of its units
update public.practice_activities p set public_token = 'ReviewToken_0123456789'
from public.topics t where t.id = p.topic_id and t.code = 'review-1' and p.kind = 'look_choose';
set local role anon;
select tests.ok(jsonb_array_length(public.get_public_activity('ReviewToken_0123456789') -> 'words') >= 30,
  'guest review games get the words of units 1–8');
select tests.ok(public.get_public_activity('ReviewToken_0123456789') -> 'words' @> '[{"word": "ball"}]',
  'including Unit 1 words');
reset role;

select tests.ok((public.health_check() ->> 'schema_version')::int >= 30, 'schema version is current');
rollback;
