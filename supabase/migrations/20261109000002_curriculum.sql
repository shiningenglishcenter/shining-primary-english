-- =============================================================================
-- 0002 CURRICULUM: levels → grades → units → lessons → learning materials
-- plus media assets (provider-agnostic so video can move to a video host later)
-- =============================================================================

create table public.levels (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  name         text not null check (char_length(name) between 1 and 120),
  program      public.program_type not null,
  description  text,
  sort_order   integer not null default 0,
  status       public.publish_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create unique index levels_code_uq on public.levels (lower(code)) where deleted_at is null;

create table public.grades (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.levels(id) on delete restrict,
  code        text not null,
  name        text not null check (char_length(name) between 1 and 120),
  sort_order  integer not null default 0,
  status      public.publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index grades_level_code_uq on public.grades (level_id, lower(code)) where deleted_at is null;
create index grades_level_idx on public.grades (level_id, sort_order);

create table public.units (
  id           uuid primary key default gen_random_uuid(),
  grade_id     uuid not null references public.grades(id) on delete restrict,
  number       integer not null check (number > 0),
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  sort_order   integer not null default 0,
  status       public.publish_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create unique index units_grade_number_uq on public.units (grade_id, number) where deleted_at is null;
create index units_grade_idx on public.units (grade_id, sort_order);

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.units(id) on delete restrict,
  title       text not null check (char_length(title) between 1 and 200),
  objectives  text,
  sort_order  integer not null default 0,
  status      public.publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index lessons_unit_idx on public.lessons (unit_id, sort_order);

-- Media is referenced by id everywhere; the row says WHERE the bytes live.
-- Moving videos from Supabase Storage to Bunny/Cloudflare/YouTube later is a
-- data migration of this table only — no schema or UI redesign.
create table public.media_assets (
  id                uuid primary key default gen_random_uuid(),
  kind              public.media_kind not null,
  provider          public.media_provider not null default 'supabase_storage',
  bucket            text,
  storage_path      text,
  external_id       text,
  external_url      text,
  mime_type         text,
  size_bytes        bigint check (size_bytes is null or size_bytes >= 0),
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  title             text,
  alt_text          text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  constraint media_location_ck check (
    (provider = 'supabase_storage' and bucket is not null and storage_path is not null)
    or (provider in ('youtube', 'bunny_stream', 'cloudflare_stream') and external_id is not null)
    or (provider = 'external_url' and external_url ~ '^https://')
  )
);
create unique index media_storage_path_uq on public.media_assets (bucket, storage_path)
  where provider = 'supabase_storage' and deleted_at is null;

create table public.learning_materials (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons(id) on delete restrict,
  kind            text not null check (kind in ('video', 'audio', 'document', 'link', 'story', 'exercise')),
  title           text not null check (char_length(title) between 1 and 200),
  description     text,
  media_asset_id  uuid references public.media_assets(id) on delete restrict,
  story_id        uuid,   -- FK added in 0004
  test_id         uuid,   -- FK added in 0005
  sort_order      integer not null default 0,
  status          public.publish_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index learning_materials_lesson_idx on public.learning_materials (lesson_id, sort_order);

create trigger levels_updated_at             before update on public.levels             for each row execute function private.set_updated_at();
create trigger grades_updated_at             before update on public.grades             for each row execute function private.set_updated_at();
create trigger units_updated_at              before update on public.units              for each row execute function private.set_updated_at();
create trigger lessons_updated_at            before update on public.lessons            for each row execute function private.set_updated_at();
create trigger media_assets_updated_at       before update on public.media_assets       for each row execute function private.set_updated_at();
create trigger learning_materials_updated_at before update on public.learning_materials for each row execute function private.set_updated_at();
