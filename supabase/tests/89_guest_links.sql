-- Guest links (0022): public token, anonymous play, guest attempts for staff only
begin;

select tests.login('teacher_a');
set local role authenticated;
select tests.lives($$insert into public.topics (id, level_id, code, title_en, title_vi, status)
  values ('a2200000-0000-0000-0000-000000000001', (select id from public.levels where code = 'STARTERS'),
          't-guest', 'Guest topic', 'Chủ đề khách', 'published')$$, 'teacher creates a topic');
select tests.lives($$insert into public.practice_activities (id, topic_id, kind, title_en, title_vi, status)
  values ('b2200000-0000-0000-0000-000000000001', 'a2200000-0000-0000-0000-000000000001', 'listen_choose',
          'Listen', 'Nghe', 'published')$$, 'teacher creates an activity (link off by default)');
select tests.ok((select public_token from public.practice_activities where id = 'b2200000-0000-0000-0000-000000000001') is null,
  'guest link is off by default');
select tests.throws($$update public.practice_activities set public_token = 'short' where id = 'b2200000-0000-0000-0000-000000000001'$$,
  'token must be long and url-safe', '23514');
select tests.lives($$update public.practice_activities set public_token = 'GuestToken_0123456789'
  where id = 'b2200000-0000-0000-0000-000000000001'$$, 'teacher turns the guest link on');
reset role;

-- anonymous visitor
set local role anon;
select tests.ok(public.get_public_activity('GuestToken_0123456789') -> 'activity' ->> 'kind' = 'listen_choose',
  'anyone opens a live guest link');
select tests.ok(public.get_public_activity('NoSuchToken_000000000') is null, 'an unknown token gives nothing');
select tests.ok(public.get_public_activity('x'' or 1=1 --') is null, 'malformed tokens give nothing');
select tests.ok(public.record_guest_practice('GuestToken_0123456789', '  Bin  ', 9, 10, 30,
  '[{"t":"listen_choose","q":"cat","p":2,"x":2}]') = 3, 'a guest records a round');
select tests.throws($$select public.record_guest_practice('GuestToken_0123456789', '', 1, 2, 5)$$,
  'a name is required', '22023');
select tests.throws($$select public.record_guest_practice('GuestToken_0123456789', 'Na', 3, 2, 5)$$,
  'score above max is rejected', '22023');
select tests.throws($$select * from public.guest_attempts$$, 'anon cannot read guest attempts', '42501');
select tests.throws($$select * from public.practice_activities$$, 'anon cannot read activities directly', '42501');
reset role;

-- students cannot see guest attempts; staff can
select tests.login('stu_an');
set local role authenticated;
select tests.ok(tests.n($$select * from public.guest_attempts$$) = 0, 'students do not see guest attempts');
select tests.throws($$insert into public.guest_attempts (activity_id, player_name, score, max_score)
  values ('b2200000-0000-0000-0000-000000000001', 'Hack', 1, 1)$$, 'no direct inserts', '42501');
reset role;
select tests.login('teacher_b');
set local role authenticated;
select tests.ok((select player_name from public.guest_attempts) = 'Bin', 'staff read guest attempts (name trimmed)');
reset role;

-- turning the link off (or a draft) stops it at once
select tests.login('teacher_a');
set local role authenticated;
update public.practice_activities set public_token = null where id = 'b2200000-0000-0000-0000-000000000001';
reset role;
set local role anon;
select tests.ok(public.get_public_activity('GuestToken_0123456789') is null, 'a switched-off link stops working');
select tests.throws($$select public.record_guest_practice('GuestToken_0123456789', 'Bin', 1, 2, 5)$$,
  'a switched-off link cannot record', '22023');
reset role;

rollback;
