-- =============================================================================
-- 0015 PRACTICE SKILLS (Phase 1 feedback, ARCHITECTURE D28)
--   * four more activity kinds: listen_type (listen and write a word),
--     listening (YouTube link or uploaded audio + questions), reading (short
--     passage + questions) and mixed (2–6 steps combining other kinds).
--     Content shapes are validated by the app (src/features/practice/model.ts).
--   * staff (admins AND teachers) may upload listening audio to the private
--     learning-media bucket, under practice/ only. Students read it through
--     short-lived signed URLs (existing learning_media_read policy).
-- Safe to re-run.
-- =============================================================================

alter type public.practice_kind add value if not exists 'listen_type';
alter type public.practice_kind add value if not exists 'listening';
alter type public.practice_kind add value if not exists 'reading';
alter type public.practice_kind add value if not exists 'mixed';

-- Some browsers label .m4a files audio/x-m4a.
update storage.buckets
set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml','audio/mpeg','audio/mp4',
                               'audio/x-m4a','audio/wav','application/pdf']
where id = 'learning-media';

drop policy if exists learning_media_practice_staff_insert on storage.objects;
create policy learning_media_practice_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'learning-media' and private.is_staff()
              and (storage.foldername(name))[1] = 'practice');

drop policy if exists learning_media_practice_staff_delete on storage.objects;
create policy learning_media_practice_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'learning-media' and private.is_staff()
         and (storage.foldername(name))[1] = 'practice');

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 15);
$$;
