-- =============================================================================
-- 0030 SENTENCE PATTERNS AND TERM REVIEWS (round 3, ARCHITECTURE D51). Needs 0029.
--   * topics.patterns: the topic's key sentences with their meaning,
--     [{ "en": "...", "vi": "..." }], shown on the topic page.
--   * vocabulary.ipa: British IPA shown on flashcards when the activity asks
--     for it (D53); seeded by 0031 from Britfone (MIT), editable by teachers.
--   * Review topics: word games may name other topics of the same level
--     (content.units = topic codes, also inside "mixed" steps) to draw their
--     words from; get_public_activity() returns those words for guest links.
-- Safe to re-run.
-- =============================================================================

alter table public.topics add column if not exists patterns jsonb not null default '[]'::jsonb;
alter table public.topics drop constraint if exists topics_patterns_check;
alter table public.topics add constraint topics_patterns_check
  check (jsonb_typeof(patterns) = 'array' and jsonb_array_length(patterns) <= 10
         and pg_column_size(patterns) < 8192);

alter table public.vocabulary add column if not exists ipa text;
alter table public.vocabulary drop constraint if exists vocabulary_ipa_check;
alter table public.vocabulary add constraint vocabulary_ipa_check check (ipa is null or char_length(ipa) <= 80);

create or replace function public.get_public_activity(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with act as (
    select a.*, t.level_id,
           coalesce((select jsonb_agg(distinct u) from jsonb_path_query(a.content, 'strict $.**.units[*]') u),
                    '[]'::jsonb) as units
    from public.practice_activities a
    join public.topics t on t.id = a.topic_id
    where p_token ~ '^[A-Za-z0-9_-]{16,40}$'
      and a.public_token = p_token
      and a.status = 'published' and a.deleted_at is null
      and private.topic_is_live(a.topic_id)
  )
  select jsonb_build_object(
    'activity', jsonb_build_object('id', a.id, 'kind', a.kind, 'title_en', a.title_en, 'title_vi', a.title_vi,
                                   'content', a.content, 'settings', a.settings),
    'topic', jsonb_build_object('id', t.id, 'title_en', t.title_en, 'title_vi', t.title_vi, 'emoji', t.emoji,
                                'level', l.code),
    'words', coalesce((
      select jsonb_agg(jsonb_build_object('word', v.word, 'meaning_vi', v.meaning_vi, 'emoji', v.emoji,
                                          'image_path', v.image_path, 'ipa', v.ipa) order by v.word)
      from public.vocabulary v
      join public.topics vt on vt.id = v.topic_id
      where v.status = 'published' and v.deleted_at is null and vt.deleted_at is null
        and (case when jsonb_array_length(a.units) > 0
                  then vt.level_id = a.level_id and a.units ? vt.code
                  else vt.id = t.id end)
    ), '[]'::jsonb)
  )
  from act a
  join public.topics t on t.id = a.topic_id
  join public.levels l on l.id = t.level_id
$$;
revoke all on function public.get_public_activity(text) from public;
grant execute on function public.get_public_activity(text) to anon, authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 30);
$$;
