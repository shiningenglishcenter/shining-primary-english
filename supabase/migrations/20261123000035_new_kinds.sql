-- =============================================================================
-- 0035 NEW ACTIVITY KINDS (ARCHITECTURE D61, D62)
--   * phonics: "which word has the sound /b/?" ({ sound, letters?, items }).
--   * write_answer: Cambridge-style "look / listen and write" (1–3 words).
--   * listen_colour: Cambridge Listening part 4 "listen and colour".
--   Content is validated by the app (src/features/practice/model.ts).
-- RUN THIS FILE ON ITS OWN, before the content packs 0036+ (new enum values
-- cannot be used in the same transaction). Safe to re-run.
-- =============================================================================

alter type public.practice_kind add value if not exists 'phonics';
alter type public.practice_kind add value if not exists 'write_answer';
alter type public.practice_kind add value if not exists 'listen_colour';
