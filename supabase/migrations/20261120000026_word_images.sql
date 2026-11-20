-- =============================================================================
-- 0026 WORD PICTURES (teacher feedback A1, ARCHITECTURE D42)
--   * vocabulary.image_path: a picture the teacher uploaded for a word, in the
--     private learning-media bucket under practice/images/<uuid>.webp|jpg (the
--     editor shrinks it to ≤ 512 px WebP — JPEG on Safari — before upload; staff
--     may already write under practice/, migration 0015). Shown instead of
--     the emoji when set. Pupils get short-lived signed URLs.
--   * get_public_activity() also returns image_path, so guest links (D35)
--     show uploaded pictures (signed by the app after the token check).
-- Safe to re-run.
-- =============================================================================

alter table public.vocabulary add column if not exists image_path text;
alter table public.vocabulary drop constraint if exists vocabulary_image_path_check;
alter table public.vocabulary add constraint vocabulary_image_path_check
  check (image_path is null or image_path ~ '^practice/images/[0-9a-f-]{36}\.(webp|jpg)$');

create or replace function public.get_public_activity(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'activity', jsonb_build_object('id', a.id, 'kind', a.kind, 'title_en', a.title_en, 'title_vi', a.title_vi,
                                   'content', a.content, 'settings', a.settings),
    'topic', jsonb_build_object('id', t.id, 'title_en', t.title_en, 'title_vi', t.title_vi, 'emoji', t.emoji,
                                'level', l.code),
    'words', coalesce((
      select jsonb_agg(jsonb_build_object('word', v.word, 'meaning_vi', v.meaning_vi, 'emoji', v.emoji,
                                          'image_path', v.image_path) order by v.word)
      from public.vocabulary v
      where v.topic_id = t.id and v.status = 'published' and v.deleted_at is null
    ), '[]'::jsonb)
  )
  from public.practice_activities a
  join public.topics t on t.id = a.topic_id
  join public.levels l on l.id = t.level_id
  where p_token ~ '^[A-Za-z0-9_-]{16,40}$'
    and a.public_token = p_token
    and a.status = 'published' and a.deleted_at is null
    and private.topic_is_live(a.topic_id)
$$;
revoke all on function public.get_public_activity(text) from public;
grant execute on function public.get_public_activity(text) to anon, authenticated;

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 26);
$$;
