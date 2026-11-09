-- Student / parent / teacher isolation
begin;

-- student
select tests.login('stu_an');
set local role authenticated;
select tests.ok((select array_agg(student_code) from public.students) = array['SH001'], 'student sees only own student record');
select tests.ok(tests.n('select * from public.class_students') = 1, 'student sees only own enrolment, not classmates');
select tests.ok(tests.n('select * from public.student_notes') = 0, 'student cannot read staff notes');
select tests.ok(tests.n('select * from public.parents') = 0, 'student cannot read parent contact rows');
select tests.ok(tests.n('select * from public.classes') = 1, 'student sees own class only');
select tests.throws($$insert into public.class_students (class_id, student_id) values ('c000000b-0000-0000-0000-000000000000', '5000000a-0000-0000-0000-000000000000')$$,
  'student cannot enrol self in another class', '42501');
update public.students set full_name = 'changed';
reset role;
select tests.ok(not exists (select 1 from public.students where full_name = 'changed'), 'student cannot edit student records');

-- parent of An
select tests.login('parent_an');
set local role authenticated;
select tests.ok((select array_agg(student_code) from public.students) = array['SH001'], 'parent sees only linked child');
select tests.ok(tests.n($$select * from public.students where id = '5000000b-0000-0000-0000-000000000000'$$) = 0, 'parent cannot read a classmate of their child');
select tests.ok(tests.n('select * from public.student_notes') = 0, 'parent cannot read staff notes');
select tests.throws($$insert into public.student_parents (student_id, parent_id) values ('5000000c-0000-0000-0000-000000000000', '6000000a-0000-0000-0000-000000000000')$$,
  'parent cannot link themselves to another child', '42501');
reset role;

-- unlinked parent
select tests.login('parent_x');
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 0, 'unlinked parent sees no children');
select tests.ok(tests.n('select * from public.classes') = 0, 'unlinked parent sees no classes');
reset role;

-- teacher A
select tests.login('teacher_a');
set local role authenticated;
select tests.ok((select array_agg(student_code order by student_code) from public.students) = array['SH001','SH002'], 'teacher A sees exactly class A students');
select tests.ok(tests.n($$select * from public.students where id = '5000000c-0000-0000-0000-000000000000'$$) = 0, 'teacher A cannot see class B student');
select tests.ok(tests.n('select * from public.classes') = 1, 'teacher A sees only assigned class');
select tests.ok(tests.n('select * from public.student_notes') = 1, 'teacher can read notes of own students');
select tests.ok(tests.n('select * from public.parents') = 1, 'teacher sees parent contact for own students only');
select tests.throws($$insert into public.teacher_classes (class_id, teacher_id) values ('c000000b-0000-0000-0000-000000000000', '7000000a-0000-0000-0000-000000000000')$$,
  'teacher cannot assign self to another class', '42501');
select tests.throws($$insert into public.students (student_code, full_name) values ('X1', 'x')$$, 'teacher cannot create students', '42501');
reset role;

-- former teacher (unassigned)
select tests.login('teacher_old');
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 0, 'unassigned teacher loses access to former students');
reset role;

-- a student who leaves the class disappears from the teacher's view
update public.class_students set left_at = now() where student_id = '5000000b-0000-0000-0000-000000000000';
select tests.login('teacher_a');
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 1, 'student who left is no longer visible to teacher');
reset role;

-- admin
select tests.login('admin1');
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 3, 'admin sees all students');
select tests.lives($$insert into public.students (student_code, full_name) values ('SH099', 'Học sinh mới')$$, 'admin can create a student');
select tests.lives($$update public.students set deleted_at = now() where student_code = 'SH099'$$, 'admin can soft-delete a student');
reset role;

-- soft-deleted student hidden from non-admins
update public.students set deleted_at = now() where id = '5000000a-0000-0000-0000-000000000000';
select tests.login('parent_an');
set local role authenticated;
select tests.ok(tests.n('select * from public.students') = 0, 'soft-deleted student hidden from parent');
reset role;

rollback;
