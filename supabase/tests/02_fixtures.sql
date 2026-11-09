-- Test fixtures (TEST DATABASE ONLY). All names are fictional sample data.
-- Layout:
--   Class A (Movers)  : teacher_a · students An, Binh       · parent_an → An
--   Class B (Flyers)  : teacher_b · student Chi            · parent_chi → Chi
--   teacher_old       : formerly taught class A (unassigned)
--   parent_x          : parent account linked to nobody
-- Fixed UUID prefixes: levels 1…, classes c…, students 5…, tests/questions e…/f…

insert into auth.users (email, raw_app_meta_data) values
  ('admin1@test.local',      '{"role":"admin","full_name":"Admin One"}'),
  ('teacher_a@test.local',   '{"role":"teacher","full_name":"Teacher A"}'),
  ('teacher_b@test.local',   '{"role":"teacher","full_name":"Teacher B"}'),
  ('teacher_old@test.local', '{"role":"teacher","full_name":"Teacher Old"}'),
  ('stu_an@test.local',      '{"role":"student","full_name":"Nguyễn Văn An","username":"an.nguyen"}'),
  ('stu_binh@test.local',    '{"role":"student","full_name":"Trần Thị Bình","username":"binh.tran"}'),
  ('stu_chi@test.local',     '{"role":"student","full_name":"Lê Minh Chí","username":"chi.le"}'),
  ('parent_an@test.local',   '{"role":"parent","full_name":"Phụ huynh An"}'),
  ('parent_chi@test.local',  '{"role":"parent","full_name":"Phụ huynh Chí"}'),
  ('parent_x@test.local',    '{"role":"parent","full_name":"Phụ huynh X"}');

insert into public.teachers (id, profile_id) values
  ('7000000a-0000-0000-0000-000000000000', tests.uid('teacher_a')),
  ('7000000b-0000-0000-0000-000000000000', tests.uid('teacher_b')),
  ('70000000-0000-0000-0000-0000000000dd', tests.uid('teacher_old'));

insert into public.students (id, profile_id, student_code, full_name, english_name, school_grade) values
  ('5000000a-0000-0000-0000-000000000000', tests.uid('stu_an'),   'SH001', 'Nguyễn Văn An', 'Andy', 4),
  ('5000000b-0000-0000-0000-000000000000', tests.uid('stu_binh'), 'SH002', 'Trần Thị Bình', 'Bella', 4),
  ('5000000c-0000-0000-0000-000000000000', tests.uid('stu_chi'),  'SH003', 'Lê Minh Chí', 'Charlie', 5);
insert into public.student_notes (student_id, notes) values
  ('5000000a-0000-0000-0000-000000000000', 'STAFF ONLY: needs seat near board');

insert into public.parents (id, profile_id, full_name, phone) values
  ('6000000a-0000-0000-0000-000000000000', tests.uid('parent_an'),  'Phụ huynh An',  '0900000001'),
  ('6000000c-0000-0000-0000-000000000000', tests.uid('parent_chi'), 'Phụ huynh Chí', '0900000003'),
  ('60000000-0000-0000-0000-0000000000ff', tests.uid('parent_x'),   'Phụ huynh X',   '0900000009');
insert into public.student_parents (student_id, parent_id, relationship, is_primary) values
  ('5000000a-0000-0000-0000-000000000000', '6000000a-0000-0000-0000-000000000000', 'mother', true),
  ('5000000c-0000-0000-0000-000000000000', '6000000c-0000-0000-0000-000000000000', 'father', true);

-- Curriculum: Movers (class A) and Flyers (class B)
insert into public.levels (id, code, name, program, status) values
  ('10000000-0000-0000-0000-00000000000a', 'T-MOVERS', '[SAMPLE] Movers', 'cambridge', 'published'),
  ('10000000-0000-0000-0000-00000000000b', 'T-FLYERS', '[SAMPLE] Flyers', 'cambridge', 'published');
insert into public.grades (id, level_id, code, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'M1', 'Movers Book 1', 'published'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'F1', 'Flyers Book 1', 'published');
insert into public.units (id, grade_id, number, title, status) values
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 1, '[SAMPLE] My family', 'published'),
  ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 1, '[SAMPLE] Space', 'published');
insert into public.lessons (id, unit_id, title, status) values
  ('40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a', 'Lesson 1 (published)', 'published'),
  ('40000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-00000000000a', 'Lesson 2 (draft)',     'draft'),
  ('40000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-00000000000b', 'Flyers lesson 1',      'published');
insert into public.vocabulary (level_id, unit_id, word, meaning_vi, status) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'grandmother', 'bà', 'published'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'cousin', 'anh chị em họ', 'draft'),
  ('10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b', 'planet', 'hành tinh', 'published');

insert into public.classes (id, code, name, primary_level_id) values
  ('c000000a-0000-0000-0000-000000000000', 'MOV-A', 'Movers A', '10000000-0000-0000-0000-00000000000a'),
  ('c000000b-0000-0000-0000-000000000000', 'FLY-B', 'Flyers B', '10000000-0000-0000-0000-00000000000b');
insert into public.class_levels (class_id, level_id) values
  ('c000000a-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000a'),
  ('c000000b-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000b');
insert into public.class_students (class_id, student_id) values
  ('c000000a-0000-0000-0000-000000000000', '5000000a-0000-0000-0000-000000000000'),
  ('c000000a-0000-0000-0000-000000000000', '5000000b-0000-0000-0000-000000000000'),
  ('c000000b-0000-0000-0000-000000000000', '5000000c-0000-0000-0000-000000000000');
insert into public.teacher_classes (class_id, teacher_id, role, unassigned_at) values
  ('c000000a-0000-0000-0000-000000000000', '7000000a-0000-0000-0000-000000000000', 'main', null),
  ('c000000b-0000-0000-0000-000000000000', '7000000b-0000-0000-0000-000000000000', 'main', null),
  ('c000000a-0000-0000-0000-000000000000', '70000000-0000-0000-0000-0000000000dd', 'assistant', now() - interval '30 days');

-- A test with one question of every auto-gradable type plus one written answer.
insert into public.tests (id, title, kind, level_id, unit_id, status, show_answers_after_submit) values
  ('e0000000-0000-0000-0000-000000000001', '[SAMPLE] Movers Unit 1 quiz', 'quiz',
   '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'published', true);

insert into public.questions (id, type, skill, prompt, data, level_id, status) values
  ('f0000000-0000-0000-0000-000000000001', 'multiple_choice', 'vocabulary', 'Your mother''s mother is your …', '{}', '10000000-0000-0000-0000-00000000000a', 'published'),
  ('f0000000-0000-0000-0000-000000000002', 'true_false',      'reading',    'Tom has two sisters.', '{}', '10000000-0000-0000-0000-00000000000a', 'published'),
  ('f0000000-0000-0000-0000-000000000003', 'fill_blank',      'grammar',    'She ___ (go) to school and ___ (like) it.', '{"blanks":2}', '10000000-0000-0000-0000-00000000000a', 'published'),
  ('f0000000-0000-0000-0000-000000000004', 'matching',        'vocabulary', 'Match the words.', '{"left":[{"id":"l1","label":"cat"},{"id":"l2","label":"dog"}],"right":[{"id":"r1","label":"mèo"},{"id":"r2","label":"chó"}]}', '10000000-0000-0000-0000-00000000000a', 'published'),
  ('f0000000-0000-0000-0000-000000000005', 'rearrange',       'grammar',    'Put the words in order.', '{"tokens":["apples","like","I","."]}', '10000000-0000-0000-0000-00000000000a', 'published'),
  ('f0000000-0000-0000-0000-000000000006', 'short_answer',    'listening',  'What colour is the cat?', '{}', '10000000-0000-0000-0000-00000000000a', 'published'),
  ('f0000000-0000-0000-0000-000000000007', 'written',         'writing',    'Write 2 sentences about your family.', '{}', '10000000-0000-0000-0000-00000000000a', 'published');

insert into public.question_options (id, question_id, label, sort_order) values
  ('0a000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000001', 'aunt', 1),
  ('0a000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000001', 'grandmother', 2),
  ('0a000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000001', 'sister', 3),
  ('0a000000-0000-0000-0000-000000000021', 'f0000000-0000-0000-0000-000000000002', 'True', 1),
  ('0a000000-0000-0000-0000-000000000022', 'f0000000-0000-0000-0000-000000000002', 'False', 2);

insert into public.question_answer_keys (question_id, key, explanation) values
  ('f0000000-0000-0000-0000-000000000001', '{"option_ids":["0a000000-0000-0000-0000-000000000012"]}', 'Mother''s mother = grandmother'),
  ('f0000000-0000-0000-0000-000000000002', '{"option_ids":["0a000000-0000-0000-0000-000000000022"]}', null),
  ('f0000000-0000-0000-0000-000000000003', '{"blanks":[["goes"],["likes"]]}', 'Present simple, 3rd person -s'),
  ('f0000000-0000-0000-0000-000000000004', '{"pairs":{"l1":"r1","l2":"r2"}}', null),
  ('f0000000-0000-0000-0000-000000000005', '{"accepted":["I like apples."]}', null),
  ('f0000000-0000-0000-0000-000000000006', '{"accepted":["black","it is black","it''s black"]}', null),
  ('f0000000-0000-0000-0000-000000000007', '{"rubric":"2 correct sentences"}', null);

insert into public.test_questions (test_id, question_id, sort_order, points)
select 'e0000000-0000-0000-0000-000000000001', id, row_number() over (order by id),
       case when type = 'written' then 4 else 2 end
from public.questions where id::text like 'f0000000-%';
-- max score = 6 × 2 + 4 = 16
