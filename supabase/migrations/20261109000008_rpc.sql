-- =============================================================================
-- 0008 SERVER-SIDE WORKFLOWS (RPC)
--   Tests      : start_attempt · get_attempt_paper · save_answer · submit_attempt
--                get_attempt_review · grade_answer
--   Teaching   : create_assignment
--   Reports    : create_parent_report · refresh_parent_report
-- All are SECURITY DEFINER with explicit authorization checks, because they
-- write tables that `authenticated` cannot write directly. Grading happens
-- here, inside Postgres, never in the browser.
-- =============================================================================

-- ----------------------------------------------------------- grading --------
create or replace function private.normalize_answer(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(translate(coalesce(p, ''), '’‘“”', $q$''""$q$))), '\s+', ' ', 'g'),
      '\s+([.,!?;:])', '\1', 'g'),
    '[.!?]+$', ''))
$$;

create or replace function private.grade_response(
  p_type public.question_type, p_key jsonb, p_response jsonb, p_max numeric,
  out is_correct boolean, out points numeric, out needs_manual boolean)
language plpgsql immutable set search_path = '' as $$
declare
  v_n integer;
  v_hit integer := 0;
  v_i integer;
  v_k text;
  v_v text;
  v_text text;
begin
  needs_manual := false;

  if p_type = 'written' then
    needs_manual := true; is_correct := null; points := null; return;
  end if;

  if p_response is null or jsonb_typeof(p_response) <> 'object' or p_key is null then
    is_correct := false; points := 0; return;
  end if;

  if p_type in ('multiple_choice', 'true_false', 'picture_choice') then
    if jsonb_typeof(p_response -> 'option_ids') <> 'array' then
      is_correct := false; points := 0; return;
    end if;
    is_correct := coalesce(
      (select array_agg(distinct x order by x) from jsonb_array_elements_text(p_key -> 'option_ids') x)
      = (select array_agg(distinct x order by x) from jsonb_array_elements_text(p_response -> 'option_ids') x),
      false);
    points := case when is_correct then p_max else 0 end;

  elsif p_type = 'fill_blank' then
    v_n := coalesce(jsonb_array_length(p_key -> 'blanks'), 0);
    if v_n = 0 or jsonb_typeof(p_response -> 'blanks') <> 'array' then
      is_correct := false; points := 0; return;
    end if;
    for v_i in 0 .. v_n - 1 loop
      if exists (select 1 from jsonb_array_elements_text(p_key -> 'blanks' -> v_i) a
                 where private.normalize_answer(a) = private.normalize_answer(p_response -> 'blanks' ->> v_i)
                   and private.normalize_answer(p_response -> 'blanks' ->> v_i) <> '') then
        v_hit := v_hit + 1;
      end if;
    end loop;
    is_correct := v_hit = v_n;
    points := round(p_max * v_hit / v_n, 2);

  elsif p_type = 'matching' then
    if jsonb_typeof(p_key -> 'pairs') <> 'object' or jsonb_typeof(p_response -> 'pairs') <> 'object' then
      is_correct := false; points := 0; return;
    end if;
    select count(*) into v_n from jsonb_object_keys(p_key -> 'pairs');
    for v_k, v_v in select key, value from jsonb_each_text(p_key -> 'pairs') loop
      if (p_response -> 'pairs' ->> v_k) = v_v then v_hit := v_hit + 1; end if;
    end loop;
    is_correct := v_n > 0 and v_hit = v_n;
    points := case when v_n = 0 then 0 else round(p_max * v_hit / v_n, 2) end;

  elsif p_type = 'rearrange' then
    if jsonb_typeof(p_response -> 'tokens') <> 'array' then
      is_correct := false; points := 0; return;
    end if;
    v_text := array_to_string(array(select jsonb_array_elements_text(p_response -> 'tokens')), ' ');
    is_correct := exists (select 1 from jsonb_array_elements_text(p_key -> 'accepted') a
                          where private.normalize_answer(a) = private.normalize_answer(v_text));
    points := case when is_correct then p_max else 0 end;

  elsif p_type = 'short_answer' then
    v_text := private.normalize_answer(p_response ->> 'text');
    is_correct := v_text <> '' and exists (select 1 from jsonb_array_elements_text(p_key -> 'accepted') a
                                           where private.normalize_answer(a) = v_text);
    points := case when is_correct then p_max else 0 end;

  else
    is_correct := false; points := 0;
  end if;
end $$;

create or replace function private.recompute_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pending boolean;
begin
  select exists (select 1 from public.student_answers
                 where attempt_id = p_attempt_id and needs_manual_grading and not manually_graded)
    into v_pending;
  update public.test_attempts a set
    auto_score  = (select coalesce(sum(auto_points), 0) from public.student_answers where attempt_id = a.id),
    total_score = (select coalesce(sum(final_points), 0) from public.student_answers where attempt_id = a.id),
    status      = case when v_pending then 'submitted'::public.attempt_status else 'graded'::public.attempt_status end,
    graded_at   = case when v_pending then null else coalesce(a.graded_at, now()) end
  where a.id = p_attempt_id and a.status <> 'in_progress';
end $$;

create or replace function private.finalize_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.test_attempts;
  v_due timestamptz;
  r record;
  g record;
begin
  select * into v_attempt from public.test_attempts where id = p_attempt_id for update;
  if not found or v_attempt.status <> 'in_progress' then return; end if;

  for r in
    select sa.id, sa.response, sa.max_points, q.type, k.key
    from public.student_answers sa
    join public.questions q on q.id = sa.question_id
    left join public.question_answer_keys k on k.question_id = sa.question_id
    where sa.attempt_id = p_attempt_id
  loop
    g := private.grade_response(r.type, r.key, r.response, r.max_points);
    update public.student_answers set
      is_correct = g.is_correct,
      auto_points = g.points,
      final_points = case when manually_graded then final_points else g.points end,
      needs_manual_grading = g.needs_manual
    where id = r.id;
  end loop;

  select a.due_at into v_due from public.assignments a
  join public.assignment_students ast on ast.assignment_id = a.id
  where ast.id = v_attempt.assignment_student_id;

  update public.test_attempts set
    status = 'submitted', submitted_at = now(),
    is_late = (v_due is not null and now() > v_due)
  where id = p_attempt_id;

  perform private.recompute_attempt(p_attempt_id);
end $$;

-- ------------------------------------------------------- student flow ------
create or replace function public.start_attempt(p_assignment_student_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := private.current_student_id();
  v_ast public.assignment_students;
  v_asg public.assignments;
  v_test public.tests;
  v_existing public.test_attempts;
  v_count integer;
  v_limit integer;
  v_attempt uuid;
begin
  perform private.check_rate_limit('start_attempt', 30, 60);
  if v_student is null then
    raise exception 'only students can start attempts' using errcode = '42501';
  end if;

  select * into v_ast from public.assignment_students where id = p_assignment_student_id and student_id = v_student;
  if not found or v_ast.is_excused then
    raise exception 'assignment not found' using errcode = 'P0002';
  end if;
  select * into v_asg from public.assignments where id = v_ast.assignment_id;
  if v_asg.is_cancelled or v_asg.deleted_at is not null then
    raise exception 'assignment not available' using errcode = 'P0002';
  end if;
  if v_asg.opens_at > now() then
    raise exception 'assignment is not open yet' using errcode = 'P0001';
  end if;
  select * into v_test from public.tests where id = v_asg.test_id and deleted_at is null;
  if not found then
    raise exception 'test not available' using errcode = 'P0002';
  end if;

  -- Resume an open attempt, or auto-submit it if its time ran out.
  select * into v_existing from public.test_attempts
  where assignment_student_id = v_ast.id and status = 'in_progress'
  order by attempt_number desc limit 1 for update;
  if found then
    if v_existing.deadline_at is null or now() <= v_existing.deadline_at + interval '30 seconds' then
      return v_existing.id;
    end if;
    perform private.finalize_attempt(v_existing.id);
  end if;

  select count(*) into v_count from public.test_attempts where assignment_student_id = v_ast.id;
  if v_count >= v_asg.max_attempts then
    -- Don't raise here if we just auto-submitted: raising would roll that back.
    -- Return the finalized attempt; the app shows its result page.
    if v_existing.id is not null then
      return v_existing.id;
    end if;
    raise exception 'no attempts remaining' using errcode = 'P0001';
  end if;

  v_limit := coalesce(v_asg.time_limit_minutes, v_test.time_limit_minutes);
  insert into public.test_attempts (assignment_student_id, student_id, test_id, attempt_number, deadline_at)
  values (v_ast.id, v_student, v_test.id, v_count + 1,
          case when v_limit is null then null else now() + make_interval(mins => v_limit) end)
  returning id into v_attempt;

  insert into public.student_answers (attempt_id, question_id, sort_order, skill, max_points, needs_manual_grading)
  select v_attempt, q.id,
         case when v_test.shuffle_questions
              then ('x' || substr(md5(v_attempt::text || q.id::text), 1, 7))::bit(28)::int
              else tq.sort_order end,
         q.skill, tq.points, q.type = 'written'
  from public.test_questions tq
  join public.questions q on q.id = tq.question_id and q.deleted_at is null
  where tq.test_id = v_test.id;

  if not found then
    raise exception 'test has no questions' using errcode = 'P0001';
  end if;

  update public.test_attempts
  set max_score = (select sum(max_points) from public.student_answers where attempt_id = v_attempt)
  where id = v_attempt;

  return v_attempt;
end $$;

-- Question paper WITHOUT answer keys, for the owning student.
create or replace function public.get_attempt_paper(p_attempt_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_attempt public.test_attempts;
  v_test public.tests;
begin
  select * into v_attempt from public.test_attempts
  where id = p_attempt_id and student_id = private.current_student_id();
  if not found then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  select * into v_test from public.tests where id = v_attempt.test_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', v_attempt.id, 'status', v_attempt.status, 'started_at', v_attempt.started_at,
      'deadline_at', v_attempt.deadline_at, 'server_now', now(), 'max_score', v_attempt.max_score),
    'test', jsonb_build_object('id', v_test.id, 'title', v_test.title, 'description', v_test.description),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'type', q.type, 'skill', q.skill, 'prompt', q.prompt,
        'instructions', q.instructions, 'data', q.data,
        'image_asset_id', q.image_asset_id, 'audio_asset_id', q.audio_asset_id,
        'points', sa.max_points, 'response', sa.response,
        'stimulus', case when st.id is null then null else jsonb_build_object(
            'id', st.id, 'kind', st.kind, 'title', st.title, 'body', st.body, 'media_asset_id', st.media_asset_id) end,
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'image_asset_id', o.image_asset_id)
                                               order by o.sort_order)
                             from public.question_options o where o.question_id = q.id), '[]'::jsonb)
      ) order by sa.sort_order, q.id)
      from public.student_answers sa
      join public.questions q on q.id = sa.question_id
      left join public.question_stimuli st on st.id = q.stimulus_id
      where sa.attempt_id = v_attempt.id), '[]'::jsonb)
  );
end $$;

create or replace function public.save_answer(p_attempt_id uuid, p_question_id uuid, p_response jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.test_attempts;
begin
  perform private.check_rate_limit('save_answer', 300, 60);
  select * into v_attempt from public.test_attempts
  where id = p_attempt_id and student_id = private.current_student_id();
  if not found then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'attempt already submitted' using errcode = 'P0001';
  end if;
  if v_attempt.deadline_at is not null and now() > v_attempt.deadline_at + interval '30 seconds' then
    raise exception 'time is up' using errcode = 'P0001';
  end if;
  if p_response is not null and (jsonb_typeof(p_response) <> 'object' or pg_column_size(p_response) > 16384) then
    raise exception 'invalid response' using errcode = '22023';
  end if;

  update public.student_answers set response = p_response, answered_at = now()
  where attempt_id = p_attempt_id and question_id = p_question_id;
  if not found then
    raise exception 'question not in this attempt' using errcode = 'P0002';
  end if;
end $$;

create or replace function public.submit_attempt(p_attempt_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.test_attempts;
begin
  perform private.check_rate_limit('submit_attempt', 20, 60);
  if not exists (select 1 from public.test_attempts
                 where id = p_attempt_id and student_id = private.current_student_id()) then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  perform private.finalize_attempt(p_attempt_id);
  select * into v_attempt from public.test_attempts where id = p_attempt_id;
  return jsonb_build_object(
    'status', v_attempt.status, 'total_score', v_attempt.total_score, 'max_score', v_attempt.max_score,
    'pending_manual', (select count(*) from public.student_answers
                       where attempt_id = p_attempt_id and needs_manual_grading and not manually_graded));
end $$;

-- Review WITH correct answers: owner after submission (if the test allows),
-- linked parent after submission, teacher of the student, or admin.
create or replace function public.get_attempt_review(p_attempt_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_attempt public.test_attempts;
  v_test public.tests;
  v_staff boolean;
begin
  select * into v_attempt from public.test_attempts where id = p_attempt_id;
  if not found or not private.can_view_student(v_attempt.student_id) then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  select * into v_test from public.tests where id = v_attempt.test_id;
  v_staff := private.is_admin() or private.teaches_student(v_attempt.student_id);

  if not v_staff then
    if v_attempt.status = 'in_progress' then
      raise exception 'attempt not submitted yet' using errcode = 'P0001';
    end if;
    if not v_test.show_answers_after_submit then
      raise exception 'answers are not released for this test' using errcode = '42501';
    end if;
  end if;

  return jsonb_build_object(
    'attempt', to_jsonb(v_attempt) - 'assignment_student_id',
    'test', jsonb_build_object('id', v_test.id, 'title', v_test.title),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'answer_id', sa.id, 'question_id', q.id, 'type', q.type, 'skill', q.skill,
        'prompt', q.prompt, 'data', q.data, 'response', sa.response,
        'is_correct', sa.is_correct, 'auto_points', sa.auto_points, 'final_points', sa.final_points,
        'max_points', sa.max_points, 'needs_manual_grading', sa.needs_manual_grading,
        'manually_graded', sa.manually_graded,
        'correct_answer', case when v_attempt.status = 'in_progress' and not v_staff then null else k.key end,
        'explanation', k.explanation,
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'image_asset_id', o.image_asset_id)
                                               order by o.sort_order)
                             from public.question_options o where o.question_id = q.id), '[]'::jsonb),
        'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'body', c.body, 'created_at', c.created_at)
                                               order by c.created_at)
                              from public.teacher_comments c
                              where c.student_answer_id = sa.id and c.deleted_at is null
                                and (v_staff
                                     or (c.visible_to_student and v_attempt.student_id = private.current_student_id())
                                     or (c.visible_to_parent and private.is_parent_of(v_attempt.student_id)))), '[]'::jsonb)
      ) order by sa.sort_order, q.id)
      from public.student_answers sa
      join public.questions q on q.id = sa.question_id
      left join public.question_answer_keys k on k.question_id = q.id
      where sa.attempt_id = v_attempt.id), '[]'::jsonb)
  );
end $$;

-- ------------------------------------------------------- teacher flow ------
create or replace function public.grade_answer(p_answer_id uuid, p_points numeric, p_comment text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_answer public.student_answers;
  v_attempt public.test_attempts;
begin
  perform private.check_rate_limit('grade_answer', 600, 60);
  select * into v_answer from public.student_answers where id = p_answer_id for update;
  if not found then
    raise exception 'answer not found' using errcode = 'P0002';
  end if;
  select * into v_attempt from public.test_attempts where id = v_answer.attempt_id for update;
  if not (private.is_admin() or private.teaches_student(v_attempt.student_id)) then
    raise exception 'answer not found' using errcode = 'P0002';
  end if;
  if v_attempt.status = 'in_progress' then
    raise exception 'cannot grade an attempt that is still in progress' using errcode = 'P0001';
  end if;
  if p_points is null or p_points < 0 or p_points > v_answer.max_points then
    raise exception 'points must be between 0 and %', v_answer.max_points using errcode = '22023';
  end if;

  insert into public.manual_grades (student_answer_id, graded_by, points) values (p_answer_id, auth.uid(), p_points);
  update public.student_answers set
    final_points = p_points, manually_graded = true, is_correct = (p_points = max_points)
  where id = p_answer_id;

  if nullif(btrim(coalesce(p_comment, '')), '') is not null then
    insert into public.teacher_comments (student_id, attempt_id, student_answer_id, author_id, kind, body)
    values (v_attempt.student_id, v_attempt.id, p_answer_id, auth.uid(), 'question', btrim(p_comment));
  end if;

  perform private.recompute_attempt(v_attempt.id);
  perform private.audit('answer_graded', 'student_answers', p_answer_id,
    jsonb_build_object('from', v_answer.final_points, 'to', p_points));

  select * into v_attempt from public.test_attempts where id = v_attempt.id;
  return jsonb_build_object('status', v_attempt.status, 'total_score', v_attempt.total_score, 'max_score', v_attempt.max_score);
end $$;

create or replace function public.create_assignment(
  p_test_id uuid,
  p_title text,
  p_class_id uuid default null,
  p_student_ids uuid[] default null,
  p_opens_at timestamptz default null,
  p_due_at timestamptz default null,
  p_time_limit_minutes integer default null,
  p_max_attempts smallint default 1,
  p_instructions text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_targets uuid[];
  v_bad integer;
begin
  perform private.check_rate_limit('create_assignment', 60, 600);
  if not private.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tests where id = p_test_id and deleted_at is null and status = 'published') then
    raise exception 'test not found or not published' using errcode = 'P0002';
  end if;

  if p_class_id is not null then
    if not (private.is_admin() or private.teaches_class(p_class_id)) then
      raise exception 'class not found' using errcode = 'P0002';
    end if;
    select array_agg(cs.student_id) into v_targets
    from public.class_students cs
    join public.students s on s.id = cs.student_id and s.deleted_at is null and s.status = 'active'
    where cs.class_id = p_class_id and cs.left_at is null
      and (p_student_ids is null or cs.student_id = any (p_student_ids));
    if p_student_ids is not null and coalesce(cardinality(v_targets), 0) <> cardinality(array(select distinct unnest(p_student_ids))) then
      raise exception 'some students are not in this class' using errcode = '22023';
    end if;
  else
    if p_student_ids is null or cardinality(p_student_ids) = 0 then
      raise exception 'choose a class or at least one student' using errcode = '22023';
    end if;
    select count(*) into v_bad from (select distinct unnest(p_student_ids) sid) x
    where not (private.is_admin() or private.teaches_student(x.sid))
       or not exists (select 1 from public.students s where s.id = x.sid and s.deleted_at is null);
    if v_bad > 0 then
      raise exception 'some students are not available to you' using errcode = '42501';
    end if;
    v_targets := array(select distinct unnest(p_student_ids));
  end if;

  if coalesce(cardinality(v_targets), 0) = 0 then
    raise exception 'no active students to assign' using errcode = 'P0001';
  end if;

  insert into public.assignments (test_id, class_id, title, instructions, assigned_by, opens_at, due_at,
                                  time_limit_minutes, max_attempts)
  values (p_test_id, p_class_id, btrim(p_title), p_instructions, auth.uid(), coalesce(p_opens_at, now()), p_due_at,
          p_time_limit_minutes, coalesce(p_max_attempts, 1))
  returning id into v_id;

  insert into public.assignment_students (assignment_id, student_id)
  select v_id, unnest(v_targets);

  return v_id;
end $$;

-- ------------------------------------------------------------ reports ------
-- Every number in a report comes from this function; the client cannot supply
-- or edit data_snapshot. Periods are interpreted in Vietnam time.
create or replace function private.build_report_snapshot(
  p_student_id uuid, p_type public.report_type, p_start date, p_end date, p_attempt_id uuid, p_class_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz constant text := 'Asia/Ho_Chi_Minh';
  v_from timestamptz;
  v_to timestamptz;
  v_class uuid := p_class_id;
  v_student jsonb;
  v_class_json jsonb;
  v_result jsonb;
begin
  select jsonb_build_object('id', s.id, 'full_name', s.full_name, 'english_name', s.english_name,
                            'student_code', s.student_code, 'school_name', s.school_name, 'school_grade', s.school_grade)
    into v_student from public.students s where s.id = p_student_id;

  if v_class is null then
    select cs.class_id into v_class from public.class_students cs
    join public.classes c on c.id = cs.class_id and c.deleted_at is null
    where cs.student_id = p_student_id and cs.left_at is null
    order by cs.enrolled_at desc limit 1;
  end if;

  select jsonb_build_object(
           'id', c.id, 'name', c.name, 'code', c.code,
           'level', (select l.name from public.levels l where l.id = c.primary_level_id),
           'teachers', coalesce((select jsonb_agg(p.full_name order by tc.role, p.full_name)
                                 from public.teacher_classes tc
                                 join public.teachers t on t.id = tc.teacher_id
                                 join public.profiles p on p.id = t.profile_id
                                 where tc.class_id = c.id and tc.unassigned_at is null), '[]'::jsonb))
    into v_class_json from public.classes c where c.id = v_class;

  if p_type = 'test' then
    select jsonb_build_object(
      'test_title', t.title,
      'submitted_at', a.submitted_at,
      'status', a.status,
      'total_score', a.total_score,
      'max_score', a.max_score,
      'percent', case when a.max_score > 0 then round(100 * a.total_score / a.max_score, 1) end,
      'is_late', a.is_late,
      'skills', coalesce((select jsonb_agg(jsonb_build_object('skill', x.skill, 'points', x.pts, 'max', x.mx,
                                                              'percent', round(100 * x.pts / x.mx, 1)) order by x.skill)
                          from (select sa.skill, sum(coalesce(sa.final_points, 0)) pts, sum(sa.max_points) mx
                                from public.student_answers sa where sa.attempt_id = a.id group by sa.skill) x), '[]'::jsonb),
      'questions', coalesce((select jsonb_agg(jsonb_build_object('n', rn, 'skill', skill, 'type', type,
                                                                 'is_correct', is_correct, 'points', final_points, 'max', max_points)
                                               order by rn)
                             from (select row_number() over (order by sa.sort_order, sa.question_id) rn,
                                          sa.skill, q.type, sa.is_correct, sa.final_points, sa.max_points
                                   from public.student_answers sa join public.questions q on q.id = sa.question_id
                                   where sa.attempt_id = a.id) y), '[]'::jsonb),
      'comments', coalesce((select jsonb_agg(jsonb_build_object('body', c.body, 'created_at', c.created_at) order by c.created_at)
                            from public.teacher_comments c
                            where c.attempt_id = a.id and c.kind = 'attempt_overall'
                              and c.visible_to_parent and c.deleted_at is null), '[]'::jsonb))
      into v_result
    from public.test_attempts a join public.tests t on t.id = a.test_id
    where a.id = p_attempt_id;

    return jsonb_build_object('version', 1, 'type', 'test', 'generated_at', now(),
                              'student', v_student, 'class', v_class_json, 'test', v_result);
  end if;

  v_from := (p_start::timestamp) at time zone v_tz;
  v_to   := ((p_end + 1)::timestamp) at time zone v_tz;

  with asg as (
    select ast.id, a.title, a.due_at,
           exists (select 1 from public.test_attempts ta
                   where ta.assignment_student_id = ast.id and ta.status <> 'in_progress') as completed
    from public.assignment_students ast
    join public.assignments a on a.id = ast.assignment_id
    where ast.student_id = p_student_id and not ast.is_excused
      and not a.is_cancelled and a.deleted_at is null
      and coalesce(a.due_at, ast.assigned_at) >= v_from and coalesce(a.due_at, ast.assigned_at) < v_to
  ),
  att as (
    select ta.*, t.title from public.test_attempts ta join public.tests t on t.id = ta.test_id
    where ta.student_id = p_student_id and ta.status <> 'in_progress'
      and ta.submitted_at >= v_from and ta.submitted_at < v_to
  )
  select jsonb_build_object(
    'assignments', jsonb_build_object(
      'total', (select count(*) from asg),
      'completed', (select count(*) from asg where completed),
      'incomplete', (select count(*) from asg where not completed),
      'completion_percent', (select case when count(*) = 0 then null
                                         else round(100.0 * count(*) filter (where completed) / count(*), 1) end from asg)),
    'tests', coalesce((select jsonb_agg(jsonb_build_object(
                         'attempt_id', id, 'title', title, 'attempt_number', attempt_number, 'submitted_at', submitted_at,
                         'status', status, 'total_score', total_score, 'max_score', max_score,
                         'percent', case when max_score > 0 then round(100 * total_score / max_score, 1) end)
                       order by submitted_at) from att), '[]'::jsonb),
    'average_percent', (select round(avg(100 * total_score / max_score), 1) from att where status = 'graded' and max_score > 0),
    'skills', coalesce((select jsonb_agg(jsonb_build_object('skill', x.skill, 'points', x.pts, 'max', x.mx,
                                                            'percent', round(100 * x.pts / x.mx, 1), 'questions', x.n)
                                         order by x.skill)
                        from (select sa.skill, sum(sa.final_points) pts, sum(sa.max_points) mx, count(*) n
                              from public.student_answers sa join att on att.id = sa.attempt_id
                              where sa.final_points is not null group by sa.skill) x), '[]'::jsonb),
    'practice', coalesce((select jsonb_agg(jsonb_build_object('activity', activity, 'sessions', n, 'minutes', mins) order by activity)
                          from (select activity, count(*) n, round(coalesce(sum(duration_seconds), 0) / 60.0) mins
                                from public.progress_records
                                where student_id = p_student_id and recorded_at >= v_from and recorded_at < v_to
                                group by activity) p), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('body', c.body, 'created_at', c.created_at, 'kind', c.kind)
                                           order by c.created_at)
                          from public.teacher_comments c
                          where c.student_id = p_student_id and c.visible_to_parent and c.deleted_at is null
                            and c.kind in ('attempt_overall', 'general')
                            and c.created_at >= v_from and c.created_at < v_to), '[]'::jsonb)
  ) into v_result;

  return jsonb_build_object('version', 1, 'type', 'monthly', 'generated_at', now(),
                            'period', jsonb_build_object('start', p_start, 'end', p_end, 'timezone', v_tz),
                            'student', v_student, 'class', v_class_json) || v_result;
end $$;

create or replace function public.create_parent_report(
  p_student_id uuid,
  p_report_type public.report_type,
  p_period_start date default null,
  p_period_end date default null,
  p_attempt_id uuid default null,
  p_class_id uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform private.check_rate_limit('create_parent_report', 60, 600);
  if not (private.is_admin() or private.teaches_student(p_student_id)) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;
  if p_report_type = 'monthly' then
    if p_period_start is null or p_period_end is null or p_period_end < p_period_start
       or p_period_end - p_period_start > 366 then
      raise exception 'invalid reporting period' using errcode = '22023';
    end if;
  else
    if not exists (select 1 from public.test_attempts
                   where id = p_attempt_id and student_id = p_student_id and status <> 'in_progress') then
      raise exception 'submitted attempt not found for this student' using errcode = 'P0002';
    end if;
  end if;
  if p_class_id is not null and not exists (select 1 from public.class_students
                                            where class_id = p_class_id and student_id = p_student_id) then
    raise exception 'student is not in this class' using errcode = '22023';
  end if;

  insert into public.parent_reports (student_id, class_id, report_type, period_start, period_end, attempt_id,
                                     data_snapshot, created_by)
  values (p_student_id, p_class_id, p_report_type, p_period_start, p_period_end, p_attempt_id,
          private.build_report_snapshot(p_student_id, p_report_type, p_period_start, p_period_end, p_attempt_id, p_class_id),
          auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.refresh_parent_report(p_report_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.parent_reports;
begin
  select * into r from public.parent_reports where id = p_report_id and deleted_at is null for update;
  if not found or not (private.is_admin() or private.teaches_student(r.student_id)) then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  if r.status <> 'draft' then
    raise exception 'only draft reports can be refreshed' using errcode = 'P0001';
  end if;
  update public.parent_reports
  set data_snapshot = private.build_report_snapshot(r.student_id, r.report_type, r.period_start, r.period_end, r.attempt_id, r.class_id)
  where id = p_report_id;
end $$;

-- ------------------------------------------------------------ exposure -----
revoke all on function
  public.start_attempt(uuid), public.get_attempt_paper(uuid), public.save_answer(uuid, uuid, jsonb),
  public.submit_attempt(uuid), public.get_attempt_review(uuid), public.grade_answer(uuid, numeric, text),
  public.create_assignment(uuid, text, uuid, uuid[], timestamptz, timestamptz, integer, smallint, text),
  public.create_parent_report(uuid, public.report_type, date, date, uuid, uuid),
  public.refresh_parent_report(uuid)
from public, anon;
grant execute on function
  public.start_attempt(uuid), public.get_attempt_paper(uuid), public.save_answer(uuid, uuid, jsonb),
  public.submit_attempt(uuid), public.get_attempt_review(uuid), public.grade_answer(uuid, numeric, text),
  public.create_assignment(uuid, text, uuid, uuid[], timestamptz, timestamptz, integer, smallint, text),
  public.create_parent_report(uuid, public.report_type, date, date, uuid, uuid),
  public.refresh_parent_report(uuid)
to authenticated;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- Internal workers are only reachable through the RPCs above.
revoke execute on function
  private.finalize_attempt(uuid), private.recompute_attempt(uuid),
  private.build_report_snapshot(uuid, public.report_type, date, date, uuid, uuid),
  private.audit(text, text, uuid, jsonb), private.check_rate_limit(text, integer, integer)
from authenticated;
