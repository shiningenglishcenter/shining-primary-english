-- =============================================================================
-- 0029 MEANING ACTIVITIES (teacher feedback round 3, ARCHITECTURE D47)
--   * match_meaning: match English words with their Vietnamese meanings (no
--     pictures needed); content like other word games ({ words?: [...] }).
--   * translate: read a sentence, choose its meaning (English → Vietnamese or
--     Vietnamese → English); content { direction, items: [...] }, validated by
--     the app (src/features/practice/model.ts).
-- RUN THIS FILE ON ITS OWN (new enum values cannot be used in the same
-- transaction). Safe to re-run.
-- =============================================================================

alter type public.practice_kind add value if not exists 'match_meaning';
alter type public.practice_kind add value if not exists 'translate';
