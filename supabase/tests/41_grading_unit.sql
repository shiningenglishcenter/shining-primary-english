-- Pure grading function checks
begin;
select tests.ok(private.normalize_answer('  It’s   BLACK! ') = 'it''s black', 'normalize: case, spaces, curly quote, trailing punctuation');
select tests.ok(private.normalize_answer('I like apples .') = 'i like apples', 'normalize: space before punctuation');
select tests.ok((private.grade_response('multiple_choice', '{"option_ids":["a","b"]}', '{"option_ids":["b","a"]}', 2)).points = 2, 'multi-select order-insensitive');
select tests.ok((private.grade_response('multiple_choice', '{"option_ids":["a","b"]}', '{"option_ids":["a"]}', 2)).points = 0, 'multi-select needs all options');
select tests.ok((private.grade_response('multiple_choice', '{"option_ids":["a"]}', null, 2)).points = 0, 'unanswered scores 0');
select tests.ok((private.grade_response('fill_blank', '{"blanks":[["a","an"],["b"],["c"]]}', '{"blanks":["an","x","C"]}', 3)).points = 2, 'fill_blank partial credit');
select tests.ok((private.grade_response('fill_blank', '{"blanks":[["a"]]}', '{"blanks":[""]}', 1)).points = 0, 'empty blank is wrong');
select tests.ok((private.grade_response('matching', '{"pairs":{"x":"1","y":"2","z":"3"}}', '{"pairs":{"x":"1","y":"3","z":"2"}}', 3)).points = 1, 'matching partial credit');
select tests.ok((private.grade_response('rearrange', '{"accepted":["Where do you live?"]}', '{"tokens":["where","do","you","live","?"]}', 1)).is_correct, 'rearrange with punctuation token');
select tests.ok((private.grade_response('short_answer', '{"accepted":["red"]}', '{"text":""}', 1)).points = 0, 'blank short answer is wrong');
select tests.ok((private.grade_response('written', '{}', '{"text":"x"}', 4)).needs_manual, 'written needs manual grading');
select tests.ok((private.grade_response('true_false', '{"option_ids":["t"]}', '{"option_ids":"t"}', 1)).points = 0, 'malformed response scores 0 without error');
rollback;
