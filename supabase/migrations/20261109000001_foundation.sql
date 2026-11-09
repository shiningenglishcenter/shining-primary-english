-- =============================================================================
-- 0001 FOUNDATION: schemas, enums, shared trigger functions, roles lookup
-- =============================================================================
-- Conventions
--   * snake_case, plural table names, uuid primary keys (gen_random_uuid()).
--   * Every mutable table has created_at / updated_at (trigger-maintained).
--   * Soft delete via deleted_at on user-facing entities; history tables are
--     append-only and never soft-deleted.
--   * `private` schema holds helpers that must NOT be exposed through the
--     Supabase Data API (PostgREST only exposes `public`).
-- =============================================================================

create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Supabase grants table privileges to `anon` by default. This product has no
-- anonymous features, so anon gets nothing in public going forward.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- ---------------------------------------------------------------- enums ------
create type public.app_role        as enum ('admin', 'teacher', 'student', 'parent');
create type public.publish_status  as enum ('draft', 'published', 'archived');
create type public.program_type    as enum ('cambridge', 'global_success', 'other');
create type public.skill           as enum ('vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking');
create type public.question_type   as enum (
  'multiple_choice', 'true_false', 'picture_choice', 'fill_blank',
  'matching', 'rearrange', 'short_answer', 'written'
);
create type public.attempt_status  as enum ('in_progress', 'submitted', 'graded');
create type public.media_kind      as enum ('image', 'audio', 'video', 'subtitle', 'document');
create type public.media_provider  as enum ('supabase_storage', 'youtube', 'bunny_stream', 'cloudflare_stream', 'external_url');
create type public.student_status  as enum ('active', 'paused', 'left');
create type public.report_type     as enum ('monthly', 'test');
create type public.report_status   as enum ('draft', 'published');
create type public.comment_kind    as enum ('question', 'attempt_overall', 'general');

-- ---------------------------------------------------------------- roles ------
create table public.roles (
  code     public.app_role primary key,
  name_en  text not null,
  name_vi  text not null
);
insert into public.roles (code, name_en, name_vi) values
  ('admin',   'Administrator', 'Quản trị viên'),
  ('teacher', 'Teacher',       'Giáo viên'),
  ('student', 'Student',       'Học sinh'),
  ('parent',  'Parent',        'Phụ huynh');

-- ------------------------------------------------------- trigger helpers -----
create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Append-only audit log for sensitive operations (grade changes, role changes,
-- report publication). Stores ids and action names only — never student names,
-- answers or comments (see SECURITY.md "Logging").
create table private.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_entity_idx on private.audit_log (entity, entity_id);

create or replace function private.audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into private.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Fixed-window rate limiter used by sensitive RPCs (Supabase Auth already rate
-- limits sign-in; this covers app-level endpoints without a paid service).
create table private.rate_limits (
  bucket        text not null,
  subject       uuid not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (bucket, subject, window_start)
);

create or replace function private.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into private.rate_limits as r (bucket, subject, window_start, hits)
  values (p_bucket, auth.uid(), v_window, 1)
  on conflict (bucket, subject, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  if v_hits > p_max then
    raise exception 'rate limit exceeded for %', p_bucket using errcode = 'P0429';
  end if;
  -- opportunistic cleanup of old windows (~1% of calls)
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
end $$;
