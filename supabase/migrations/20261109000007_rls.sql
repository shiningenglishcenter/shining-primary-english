-- =============================================================================
-- 0007 AUTHORIZATION: helper functions, grants, Row Level Security policies
-- =============================================================================
-- Model (see SECURITY.md):
--   admin   : everything (except writing attempts/answers, which go via RPCs)
--   teacher : classes they are actively assigned to, and those classes' current
--             students; read-only on content and the question bank
--   student : own records; published content for levels of their classes;
--             tests only through RPCs; never answer keys before submitting
--   parent  : explicitly linked children only; published reports only
--   anon    : nothing
-- Helpers are SECURITY DEFINER so policies don't recurse through RLS, are
-- STABLE so Postgres caches them per statement, and pin search_path.
-- =============================================================================

-- ------------------------------------------------------------- helpers ------
create or replace function private.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active and p.deleted_at is null
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_app_role() = 'admin', false)
$$;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_app_role() in ('admin', 'teacher'), false)
$$;

create or replace function private.current_teacher_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.teachers t
  where t.profile_id = auth.uid() and t.deleted_at is null
    and private.current_app_role() = 'teacher'
$$;

create or replace function private.current_student_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.students s
  where s.profile_id = auth.uid() and s.deleted_at is null
    and private.current_app_role() = 'student'
$$;

create or replace function private.current_parent_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.parents p
  where p.profile_id = auth.uid() and p.deleted_at is null
    and private.current_app_role() = 'parent'
$$;

create or replace function private.teaches_class(p_class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_classes tc
    join public.classes c on c.id = tc.class_id and c.deleted_at is null
    where tc.class_id = p_class_id
      and tc.teacher_id = private.current_teacher_id()
      and tc.unassigned_at is null
  )
$$;

create or replace function private.teaches_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.teacher_classes tc
    join public.class_students cs on cs.class_id = tc.class_id and cs.left_at is null
    join public.classes c on c.id = tc.class_id and c.deleted_at is null
    where tc.teacher_id = private.current_teacher_id()
      and tc.unassigned_at is null
      and cs.student_id = p_student_id
  )
$$;

create or replace function private.is_parent_of(p_student_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_parents sp
    where sp.parent_id = private.current_parent_id() and sp.student_id = p_student_id
  )
$$;

create or replace function private.can_view_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  -- coalesce: never return NULL (PL/pgSQL `if not …` treats NULL as "not false")
  select coalesce(
       private.is_admin()
    or p_student_id = private.current_student_id()
    or private.teaches_student(p_student_id)
    or private.is_parent_of(p_student_id), false)
$$;

-- Students (and their parents) currently enrolled in the class.
create or replace function private.member_of_class(p_class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_students cs
    where cs.class_id = p_class_id and cs.left_at is null
      and (cs.student_id = private.current_student_id()
           or exists (select 1 from public.student_parents sp
                      where sp.student_id = cs.student_id and sp.parent_id = private.current_parent_id()))
  )
$$;

-- Can the caller see content of this curriculum level?
create or replace function private.can_view_level(p_level_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1
    from public.class_students cs
    join public.classes c on c.id = cs.class_id and c.deleted_at is null and c.is_active
    left join public.class_levels cl on cl.class_id = c.id
    where cs.left_at is null
      and (cl.level_id = p_level_id or c.primary_level_id = p_level_id)
      and (cs.student_id = private.current_student_id()
           or exists (select 1 from public.student_parents sp
                      where sp.student_id = cs.student_id and sp.parent_id = private.current_parent_id()))
  )
$$;

create or replace function private.level_of_grade(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.level_id from public.grades g where g.id = p_id
$$;
create or replace function private.level_of_unit(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.level_id from public.units u join public.grades g on g.id = u.grade_id where u.id = p_id
$$;
create or replace function private.level_of_lesson(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.level_id from public.lessons l
  join public.units u on u.id = l.unit_id join public.grades g on g.id = u.grade_id
  where l.id = p_id
$$;
create or replace function private.level_of_story(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.level_id from public.stories s where s.id = p_id
$$;

-- Is the caller (student or parent) attached to an active assignment of this test?
create or replace function private.assigned_test(p_test_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments a
    join public.assignment_students ast on ast.assignment_id = a.id
    where a.test_id = p_test_id and not a.is_cancelled and a.deleted_at is null
      and (ast.student_id = private.current_student_id() or private.is_parent_of(ast.student_id))
  )
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- profile guard trigger (function defined in 0003; needs is_admin from here)
create or replace function private.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- current_user is the function owner inside SECURITY DEFINER; the `role`
  -- setting still holds the API caller's role (authenticated / anon).
  v_privileged boolean := coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon')
                          or private.is_admin();
begin
  if not v_privileged and (
       new.role is distinct from old.role
    or new.full_name is distinct from old.full_name
    or new.username is distinct from old.username
    or new.is_active is distinct from old.is_active
    or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'only admins can change these profile fields' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    perform private.audit('role_changed', 'profiles', new.id, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profile_update();

-- --------------------------------------------------------------- grants -----
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Results are written ONLY by validated RPCs (security definer, 0008).
revoke insert, update, delete on public.test_attempts, public.student_answers,
  public.manual_grades, public.assignment_students from authenticated;
revoke insert, delete on public.parent_reports from authenticated;
revoke update on public.parent_reports from authenticated;
grant update (strengths, improvements, teacher_comment, status, pdf_path, png_path, deleted_at)
  on public.parent_reports to authenticated;
revoke update on public.teacher_comments from authenticated;
grant update (body, visible_to_student, visible_to_parent, deleted_at) on public.teacher_comments to authenticated;
revoke insert on public.assignments from authenticated;  -- created via create_assignment()
revoke update on public.assignments from authenticated;
grant update (title, instructions, opens_at, due_at, is_cancelled, deleted_at) on public.assignments to authenticated;
revoke delete on public.assignments, public.test_attempts, public.parent_reports, public.progress_records from authenticated;
revoke update on public.progress_records from authenticated;

-- ------------------------------------------------------------- enable RLS ---
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
  end loop;
end $$;

-- Admin full access on management tables (results tables excluded: RPC only).
do $$
declare t text;
begin
  foreach t in array array[
    'levels','grades','units','lessons','media_assets','learning_materials',
    'vocabulary','lesson_vocabulary','grammar_topics','lesson_grammar_topics','unit_grammar_topics',
    'stories','story_vocabulary','story_grammar_topics',
    'question_stimuli','questions','question_options','question_answer_keys','tests','test_questions',
    'profiles','teachers','students','student_notes','parents','student_parents',
    'classes','class_levels','class_students','teacher_classes'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.is_admin()) with check (private.is_admin())',
      t || '_admin_all', t);
  end loop;
end $$;

-- ------------------------------------------------------- reference data -----
create policy roles_read on public.roles for select to authenticated using (true);

-- ------------------------------------------------------------- curriculum ---
create policy levels_read on public.levels for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(id))));
create policy grades_read on public.grades for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(level_id))));
create policy units_read on public.units for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(private.level_of_unit(id)))));
create policy lessons_read on public.lessons for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(private.level_of_lesson(id)))));
create policy learning_materials_read on public.learning_materials for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(private.level_of_lesson(lesson_id)))));
-- Media metadata is non-sensitive learning content; bytes are served via
-- short-lived signed URLs issued by the server after an access check.
create policy media_assets_read on public.media_assets for select to authenticated
  using (deleted_at is null);

create policy vocabulary_read on public.vocabulary for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(level_id))));
create policy lesson_vocabulary_read on public.lesson_vocabulary for select to authenticated
  using (private.is_staff() or private.can_view_level(private.level_of_lesson(lesson_id)));
create policy grammar_topics_read on public.grammar_topics for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(level_id))));
create policy lesson_grammar_read on public.lesson_grammar_topics for select to authenticated
  using (private.is_staff() or private.can_view_level(private.level_of_lesson(lesson_id)));
create policy unit_grammar_read on public.unit_grammar_topics for select to authenticated
  using (private.is_staff() or private.can_view_level(private.level_of_unit(unit_id)));
create policy stories_read on public.stories for select to authenticated
  using (deleted_at is null and (private.is_staff() or (status = 'published' and private.can_view_level(level_id))));
create policy story_vocabulary_read on public.story_vocabulary for select to authenticated
  using (private.is_staff() or private.can_view_level(private.level_of_story(story_id)));
create policy story_grammar_read on public.story_grammar_topics for select to authenticated
  using (private.is_staff() or private.can_view_level(private.level_of_story(story_id)));

-- --------------------------------------------------- question bank & tests --
-- Staff only. Students never read these tables directly.
create policy question_stimuli_staff_read on public.question_stimuli for select to authenticated using (private.is_staff());
create policy questions_staff_read        on public.questions        for select to authenticated using (private.is_staff());
create policy question_options_staff_read on public.question_options for select to authenticated using (private.is_staff());
create policy answer_keys_staff_read      on public.question_answer_keys for select to authenticated using (private.is_staff());
create policy test_questions_staff_read   on public.test_questions   for select to authenticated using (private.is_staff());
create policy tests_read on public.tests for select to authenticated
  using (deleted_at is null and (private.is_staff() or private.assigned_test(id)));

-- -------------------------------------------------------- people & classes --
create policy profiles_self_read   on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy teachers_self_read on public.teachers for select to authenticated using (profile_id = auth.uid());

create policy students_read on public.students for select to authenticated
  using (deleted_at is null and private.can_view_student(id));

create policy student_notes_teacher_read on public.student_notes for select to authenticated
  using (private.teaches_student(student_id));
create policy student_notes_teacher_write on public.student_notes for insert to authenticated
  with check (private.teaches_student(student_id) and updated_by = auth.uid());
create policy student_notes_teacher_update on public.student_notes for update to authenticated
  using (private.teaches_student(student_id)) with check (private.teaches_student(student_id) and updated_by = auth.uid());

create policy parents_read on public.parents for select to authenticated
  using (deleted_at is null and (
    profile_id = auth.uid()
    or exists (select 1 from public.student_parents sp where sp.parent_id = parents.id and private.teaches_student(sp.student_id))
  ));

create policy student_parents_read on public.student_parents for select to authenticated
  using (parent_id = private.current_parent_id()
      or student_id = private.current_student_id()
      or private.teaches_student(student_id));

create policy classes_read on public.classes for select to authenticated
  using (deleted_at is null and (private.teaches_class(id) or private.member_of_class(id)));
create policy class_levels_read on public.class_levels for select to authenticated
  using (private.teaches_class(class_id) or private.member_of_class(class_id));
create policy class_students_read on public.class_students for select to authenticated
  using (private.teaches_class(class_id)
      or student_id = private.current_student_id()
      or private.is_parent_of(student_id));
create policy teacher_classes_read on public.teacher_classes for select to authenticated
  using (teacher_id = private.current_teacher_id());

-- --------------------------------------------------- assignments & results --
create policy assignments_read on public.assignments for select to authenticated
  using (private.is_admin()
      or (deleted_at is null and (
            assigned_by = auth.uid()
         or (class_id is not null and private.teaches_class(class_id))
         or exists (select 1 from public.assignment_students ast
                    where ast.assignment_id = assignments.id and private.can_view_student(ast.student_id)))));
create policy assignments_update on public.assignments for update to authenticated
  using (private.is_admin() or (assigned_by = auth.uid() and private.is_staff()))
  with check (private.is_admin() or (assigned_by = auth.uid() and private.is_staff()));

create policy assignment_students_read on public.assignment_students for select to authenticated
  using (private.can_view_student(student_id));
create policy test_attempts_read on public.test_attempts for select to authenticated
  using (private.can_view_student(student_id));
create policy student_answers_read on public.student_answers for select to authenticated
  using (exists (select 1 from public.test_attempts a
                 where a.id = student_answers.attempt_id and private.can_view_student(a.student_id)));
create policy manual_grades_read on public.manual_grades for select to authenticated
  using (exists (select 1 from public.student_answers sa join public.test_attempts a on a.id = sa.attempt_id
                 where sa.id = manual_grades.student_answer_id and private.can_view_student(a.student_id)));

-- ------------------------------------------------------------- feedback -----
create policy teacher_comments_read on public.teacher_comments for select to authenticated
  using (private.is_admin()
      or (deleted_at is null and (
            private.teaches_student(student_id)
         or (visible_to_student and student_id = private.current_student_id())
         or (visible_to_parent and private.is_parent_of(student_id)))));
create policy teacher_comments_insert on public.teacher_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and (private.is_admin() or private.teaches_student(student_id))
    and (attempt_id is null or exists (select 1 from public.test_attempts a
                                       where a.id = attempt_id and a.student_id = teacher_comments.student_id))
    and (student_answer_id is null or exists (select 1 from public.student_answers sa
                                              join public.test_attempts a on a.id = sa.attempt_id
                                              where sa.id = student_answer_id and a.student_id = teacher_comments.student_id
                                                and (teacher_comments.attempt_id is null or sa.attempt_id = teacher_comments.attempt_id))));
create policy teacher_comments_update on public.teacher_comments for update to authenticated
  using (private.is_admin() or (author_id = auth.uid() and private.teaches_student(student_id)))
  with check (private.is_admin() or (author_id = auth.uid() and private.teaches_student(student_id)));

create policy feedback_templates_read on public.feedback_templates for select to authenticated
  using (private.is_staff() and deleted_at is null and (is_shared or created_by = auth.uid() or private.is_admin()));
create policy feedback_templates_insert on public.feedback_templates for insert to authenticated
  with check (private.is_staff() and created_by = auth.uid());
create policy feedback_templates_update on public.feedback_templates for update to authenticated
  using (private.is_admin() or (private.is_staff() and created_by = auth.uid()))
  with check (private.is_admin() or (private.is_staff() and created_by = auth.uid()));
create policy feedback_templates_delete on public.feedback_templates for delete to authenticated
  using (private.is_admin() or (private.is_staff() and created_by = auth.uid()));

-- ------------------------------------------------------------- progress -----
create policy progress_records_read on public.progress_records for select to authenticated
  using (private.can_view_student(student_id));
create policy progress_records_student_insert on public.progress_records for insert to authenticated
  with check (student_id = private.current_student_id() and recorded_at > now() - interval '5 minutes');

-- --------------------------------------------------------------- reports ----
create policy parent_reports_read on public.parent_reports for select to authenticated
  using (private.is_admin()
      or (deleted_at is null and (
            private.teaches_student(student_id)
         or (status = 'published' and private.is_parent_of(student_id)))));
create policy parent_reports_update on public.parent_reports for update to authenticated
  using (private.is_admin() or private.teaches_student(student_id))
  with check (private.is_admin() or private.teaches_student(student_id));

create or replace function private.on_report_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
    perform private.audit('report_published', 'parent_reports', new.id);
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;
  return new;
end $$;
create trigger parent_reports_status before update of status on public.parent_reports
  for each row execute function private.on_report_status_change();
