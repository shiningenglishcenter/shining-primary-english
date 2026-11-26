-- =============================================================================
-- 0044 RECORDED VOICE (ARCHITECTURE D67)
--   * public bucket `voice`: what the app reads aloud, as small audio files.
--       voice/emma/<key>.mp3     made by scripts/voice (Kokoro), service role only
--       voice/custom/<uuid>.<ext> a teacher's own recording (staff may add/remove)
--     <key> is a hash of the text (src/features/practice/voice.ts). Public, so
--     the player needs no signed URL per sentence.
--   * topics.voices / practice_activities.voices: a teacher's recordings for
--     sentences of that topic or activity only (text key → custom path).
-- Safe to re-run.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', true, 2097152,
        array['audio/mpeg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav'])
on conflict (id) do update
set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists voice_custom_staff_insert on storage.objects;
create policy voice_custom_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and private.is_staff() and (storage.foldername(name))[1] = 'custom');

drop policy if exists voice_custom_staff_delete on storage.objects;
create policy voice_custom_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and private.is_staff() and (storage.foldername(name))[1] = 'custom');

alter table public.topics add column if not exists voices jsonb not null default '{}'::jsonb;
alter table public.practice_activities add column if not exists voices jsonb not null default '{}'::jsonb;
alter table public.topics drop constraint if exists topics_voices_object;
alter table public.topics add constraint topics_voices_object check (jsonb_typeof(voices) = 'object');
alter table public.practice_activities drop constraint if exists practice_activities_voices_object;
alter table public.practice_activities add constraint practice_activities_voices_object
  check (jsonb_typeof(voices) = 'object');

create or replace function public.health_check()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('db', 'ok', 'schema_version', 44);
$$;
