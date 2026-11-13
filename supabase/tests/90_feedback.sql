-- Pilot feedback (0023): anyone submits; only admins read and triage
begin;

set local role anon;
select tests.ok(public.submit_feedback($${
  "name": "Cô Hoa", "role": "teacher", "contact": "0912 345 678",
  "ratings": {"ease": 4, "kids": 5, "results": "3", "ready": 9, "bogus": 2},
  "liked": "Trẻ thích âm thanh", "change": "Thêm bài viết câu",
  "items": [
    {"kind": "bug", "area": "play", "severity": "blocker", "description": "Nút Next không bấm được",
     "steps": "Mở bài 3", "screenshots": ["incoming/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.png", "incoming/bad name.png"]},
    {"kind": "idea", "area": "results", "severity": "blocker", "description": "Xuất kết quả ra Excel"},
    {"kind": "nope", "area": "nope", "description": "   "}
  ]
}$$::jsonb) is not null, 'anyone can send feedback');
select tests.throws($$select public.submit_feedback('{}'::jsonb)$$, 'empty feedback is refused', '22023');
select tests.throws($$select public.submit_feedback('{"name": "Cô Hoa", "contact": "123", "items": [{"kind": "idea", "area": "play", "description": "x"}]}'::jsonb)$$,
  'a Zalo phone number is required', '22023');
select tests.throws($$select public.submit_feedback('{"contact": "0912345678", "items": [{"kind": "idea", "area": "play", "description": "x"}]}'::jsonb)$$,
  'a name is required', '22023');
select tests.throws($$select public.submit_feedback('{"name": "Cô Hoa", "contact": "0912345678", "ratings": {"ease": 5}}'::jsonb)$$,
  'at least one idea or bug is required', '22023');
select tests.ok(jsonb_array_length(public.practice_catalog()) >= 8, 'anyone reads the published catalogue');
select tests.throws($$select * from public.feedback$$, 'anon cannot read feedback', '42501');
select tests.throws($$insert into public.feedback (name) values ('x')$$, 'anon cannot insert directly', '42501');
select tests.lives($$insert into storage.objects (bucket_id, name) values ('feedback', 'incoming/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.png')$$,
  'anyone can upload a screenshot under incoming/');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('feedback', 'other/x.png')$$,
  'uploads only under incoming/', '42501');
reset role;

select tests.login('teacher_a');
set local role authenticated;
select tests.ok(tests.n($$select * from public.feedback$$) = 0, 'teachers do not read feedback');
select tests.ok(tests.n($$select * from storage.objects where bucket_id = 'feedback'$$) = 0, 'teachers do not read screenshots');
reset role;

select tests.login('admin1');
set local role authenticated;
select tests.ok(tests.n($$select * from public.feedback$$) = 1, 'admin reads feedback');
select tests.ok((select contact from public.feedback) = '0912345678', 'the phone number is stored without spaces');
select tests.ok((select ratings from public.feedback) = '{"ease": 4, "kids": 5, "results": 3}'::jsonb,
  'ratings keep only 1-5 values of known questions');
select tests.ok(tests.n($$select * from public.feedback_items$$) = 2, 'blank items are dropped');
select tests.ok((select screenshots from public.feedback_items where kind = 'bug')
  = array['incoming/0b7e1c8e-1111-4a3b-9c1d-2e3f4a5b6c7d.png'], 'only well-formed screenshot paths are kept');
select tests.ok((select severity from public.feedback_items where kind = 'idea') is null, 'severity only for bugs');
select tests.lives($$update public.feedback set status = 'in_progress', admin_note = 'Đã xem'$$, 'admin triages');
select tests.ok(tests.n($$select * from storage.objects where bucket_id = 'feedback'$$) = 1, 'admin reads screenshots');
reset role;

rollback;
