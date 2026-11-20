-- -----------------------------------------------------------------------------
-- LOCAL TEST SHIM — NOT a migration. Never run against a real Supabase project.
-- Recreates the minimal pieces of a Supabase database (roles, auth.uid(),
-- auth.users, storage schema, default grants) so the real migrations and RLS
-- policies can be tested on a plain PostgreSQL 15/16 server in CI.
-- On a Supabase project (or `supabase start`) these already exist.
-- -----------------------------------------------------------------------------
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create schema extensions;
create schema storage;
grant usage on schema auth, extensions, storage, public to anon, authenticated, service_role;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_app_meta_data   jsonb not null default '{}'::jsonb,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Minimal auth.sessions (only what current_profile() reads).
create table auth.sessions (
  id uuid primary key, user_id uuid not null, not_after timestamptz
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to authenticated;
grant execute on function storage.foldername(text) to authenticated;

-- Supabase's default privileges on the public schema
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
