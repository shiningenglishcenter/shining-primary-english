-- =============================================================================
-- 0009 STORAGE: private buckets + object policies
-- Paths
--   learning-media/<kind>/<yyyy>/<uuid>.<ext>     (admin uploads, any signed-in user may read via signed URL)
--   reports/<student_id>/<report_id>.<pdf|png>    (teacher of student / admin write; parent reads published only)
-- Both buckets are PRIVATE. The app serves files through short-lived signed URLs.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  -- MVP: images, audio and PDFs only (20 MB max). Video is out of MVP scope; enabling it later is a new
  -- migration that widens this list (or uses an external provider via media_assets.provider).
  ('learning-media', 'learning-media', false, 20971520,
   array['image/png','image/jpeg','image/webp','image/svg+xml','audio/mpeg','audio/mp4','audio/wav',
         'application/pdf']),
  ('reports', 'reports', false, 10485760, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;

create or replace function private.try_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;
grant execute on function private.try_uuid(text) to authenticated;

create policy learning_media_read on storage.objects for select to authenticated
  using (bucket_id = 'learning-media');
create policy learning_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'learning-media' and private.is_admin());
create policy learning_media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'learning-media' and private.is_admin())
  with check (bucket_id = 'learning-media' and private.is_admin());
create policy learning_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'learning-media' and private.is_admin());

create policy reports_read on storage.objects for select to authenticated
  using (bucket_id = 'reports' and (
    private.is_admin()
    or private.teaches_student(private.try_uuid((storage.foldername(name))[1]))
    or exists (select 1 from public.parent_reports pr
               where pr.status = 'published' and pr.deleted_at is null
                 and (pr.pdf_path = objects.name or pr.png_path = objects.name)
                 and private.is_parent_of(pr.student_id))));
create policy reports_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and (
    private.is_admin() or private.teaches_student(private.try_uuid((storage.foldername(name))[1]))));
create policy reports_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'reports' and (
    private.is_admin() or private.teaches_student(private.try_uuid((storage.foldername(name))[1]))))
  with check (bucket_id = 'reports' and (
    private.is_admin() or private.teaches_student(private.try_uuid((storage.foldername(name))[1]))));
create policy reports_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and private.is_admin());
