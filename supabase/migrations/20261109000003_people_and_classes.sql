-- =============================================================================
-- 0003 PEOPLE & CLASSES
-- profiles (1:1 auth.users) · teachers · students · parents · student_parents
-- classes · class_levels · class_students · teacher_classes
-- =============================================================================
-- Students and parents may exist WITHOUT a login (profile_id null): the centre
-- can record a child before deciding to give them an account.
-- =============================================================================

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          public.app_role not null references public.roles(code),
  full_name     text not null check (char_length(full_name) between 1 and 120),
  display_name  text check (display_name is null or char_length(display_name) <= 60),
  username      extensions.citext unique check (username is null or username ~ '^[a-z0-9._-]{3,40}$'),
  avatar_path   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table public.teachers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete restrict,
  phone       text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.students (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid unique references public.profiles(id) on delete set null,
  student_code   text not null,
  full_name      text not null check (char_length(full_name) between 1 and 120),
  english_name   text check (english_name is null or char_length(english_name) <= 60),
  school_name    text,
  school_grade   smallint check (school_grade is null or school_grade between 1 and 12),
  status         public.student_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create unique index students_code_uq on public.students (lower(student_code)) where deleted_at is null;

-- Staff-only notes live in their own table so students/parents, who may read
-- their own `students` row, can never see them.
create table public.student_notes (
  student_id  uuid primary key references public.students(id) on delete cascade,
  notes       text not null check (char_length(notes) <= 4000),
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.parents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references public.profiles(id) on delete set null,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  phone       text,
  email       extensions.citext,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.student_parents (
  student_id    uuid not null references public.students(id) on delete cascade,
  parent_id     uuid not null references public.parents(id) on delete cascade,
  relationship  text not null default 'parent' check (relationship in ('mother', 'father', 'guardian', 'parent', 'other')),
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (student_id, parent_id)
);
create index student_parents_parent_idx on public.student_parents (parent_id);

create table public.classes (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  name              text not null check (char_length(name) between 1 and 120),
  primary_level_id  uuid references public.levels(id) on delete restrict,
  academic_year     text,
  schedule_note     text,
  starts_on         date,
  ends_on           date,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index classes_code_uq on public.classes (lower(code)) where deleted_at is null;

-- Which curriculum levels a class can study (e.g. Movers + Global Success 4).
create table public.class_levels (
  class_id  uuid not null references public.classes(id) on delete cascade,
  level_id  uuid not null references public.levels(id) on delete restrict,
  primary key (class_id, level_id)
);
create index class_levels_level_idx on public.class_levels (level_id);

create table public.class_students (
  class_id     uuid not null references public.classes(id) on delete restrict,
  student_id   uuid not null references public.students(id) on delete restrict,
  enrolled_at  timestamptz not null default now(),
  left_at      timestamptz,
  primary key (class_id, student_id),
  check (left_at is null or left_at >= enrolled_at)
);
create index class_students_student_idx on public.class_students (student_id) where left_at is null;

create table public.teacher_classes (
  class_id       uuid not null references public.classes(id) on delete restrict,
  teacher_id     uuid not null references public.teachers(id) on delete restrict,
  role           text not null default 'main' check (role in ('main', 'assistant')),
  assigned_at    timestamptz not null default now(),
  unassigned_at  timestamptz,
  primary key (class_id, teacher_id)
);
create index teacher_classes_teacher_idx on public.teacher_classes (teacher_id) where unassigned_at is null;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger teachers_updated_at before update on public.teachers for each row execute function private.set_updated_at();
create trigger students_updated_at before update on public.students for each row execute function private.set_updated_at();
create trigger parents_updated_at  before update on public.parents  for each row execute function private.set_updated_at();
create trigger classes_updated_at  before update on public.classes  for each row execute function private.set_updated_at();

-- ------------------------------------------------ profile provisioning ------
-- Accounts are created by an admin through a server action using the service
-- role key, with the role in app_metadata (NOT user_metadata, which users can
-- edit themselves). Self-sign-up is disabled in Supabase Auth settings; this
-- trigger refuses to create a profile without a valid app_metadata role.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role;
begin
  begin
    v_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
  exception when invalid_text_representation then
    v_role := null;
  end;
  if v_role is null then
    raise exception 'new users must be created by an admin with app_metadata.role';
  end if;

  insert into public.profiles (id, role, full_name, username)
  values (
    new.id,
    v_role,
    coalesce(nullif(new.raw_app_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    nullif(new.raw_app_meta_data ->> 'username', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Profile update guard (role/name/active changes admin-only) is defined in 0007
-- because it depends on the authorization helpers.
