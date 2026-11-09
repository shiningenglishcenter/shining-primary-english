-- =============================================================================
-- 0004 LEARNING CONTENT: vocabulary · grammar · stories
-- =============================================================================

create table public.vocabulary (
  id                   uuid primary key default gen_random_uuid(),
  word                 text not null check (char_length(word) between 1 and 80),
  ipa                  text,
  part_of_speech       text check (part_of_speech is null or part_of_speech in
                         ('noun','verb','adjective','adverb','preposition','pronoun','determiner','conjunction','interjection','phrase','number')),
  meaning_vi           text not null check (char_length(meaning_vi) between 1 and 300),
  example_sentence     text,
  example_translation  text,
  word_family          text[] not null default '{}',
  collocations         text[] not null default '{}',
  topic                text,
  level_id             uuid not null references public.levels(id) on delete restrict,
  unit_id              uuid references public.units(id) on delete set null,
  image_asset_id       uuid references public.media_assets(id) on delete set null,
  audio_asset_id       uuid references public.media_assets(id) on delete set null,
  status               public.publish_status not null default 'draft',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);
create unique index vocabulary_word_uq on public.vocabulary (level_id, lower(word), coalesce(part_of_speech, ''))
  where deleted_at is null;
create index vocabulary_unit_idx  on public.vocabulary (unit_id);
create index vocabulary_topic_idx on public.vocabulary (level_id, topic);

create table public.lesson_vocabulary (
  lesson_id      uuid not null references public.lessons(id) on delete cascade,
  vocabulary_id  uuid not null references public.vocabulary(id) on delete cascade,
  sort_order     integer not null default 0,
  primary key (lesson_id, vocabulary_id)
);
create index lesson_vocabulary_vocab_idx on public.lesson_vocabulary (vocabulary_id);

create table public.grammar_topics (
  id               uuid primary key default gen_random_uuid(),
  level_id         uuid not null references public.levels(id) on delete restrict,
  title            text not null check (char_length(title) between 1 and 200),
  slug             text not null check (slug ~ '^[a-z0-9-]{1,80}$'),
  explanation      text,          -- markdown, Vietnamese and/or English
  formula          text,
  examples         jsonb not null default '[]'::jsonb check (jsonb_typeof(examples) = 'array'),        -- [{en, vi}]
  common_mistakes  jsonb not null default '[]'::jsonb check (jsonb_typeof(common_mistakes) = 'array'), -- [{wrong, right, note}]
  sort_order       integer not null default 0,
  status           public.publish_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create unique index grammar_topics_slug_uq on public.grammar_topics (level_id, slug) where deleted_at is null;

create table public.lesson_grammar_topics (
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  grammar_topic_id  uuid not null references public.grammar_topics(id) on delete cascade,
  primary key (lesson_id, grammar_topic_id)
);
create index lesson_grammar_topic_idx on public.lesson_grammar_topics (grammar_topic_id);

create table public.unit_grammar_topics (
  unit_id           uuid not null references public.units(id) on delete cascade,
  grammar_topic_id  uuid not null references public.grammar_topics(id) on delete cascade,
  primary key (unit_id, grammar_topic_id)
);

create table public.stories (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null check (char_length(title) between 1 and 200),
  level_id              uuid not null references public.levels(id) on delete restrict,
  unit_id               uuid references public.units(id) on delete set null,
  summary               text,
  transcript            text,
  video_asset_id        uuid references public.media_assets(id) on delete set null,
  audio_asset_id        uuid references public.media_assets(id) on delete set null,
  subtitle_asset_id     uuid references public.media_assets(id) on delete set null,  -- WebVTT
  cover_asset_id        uuid references public.media_assets(id) on delete set null,
  comprehension_test_id uuid,  -- FK added in 0005
  sort_order            integer not null default 0,
  status                public.publish_status not null default 'draft',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create index stories_level_idx on public.stories (level_id, sort_order);

create table public.story_vocabulary (
  story_id       uuid not null references public.stories(id) on delete cascade,
  vocabulary_id  uuid not null references public.vocabulary(id) on delete cascade,
  primary key (story_id, vocabulary_id)
);
create table public.story_grammar_topics (
  story_id          uuid not null references public.stories(id) on delete cascade,
  grammar_topic_id  uuid not null references public.grammar_topics(id) on delete cascade,
  primary key (story_id, grammar_topic_id)
);

alter table public.learning_materials
  add constraint learning_materials_story_fk foreign key (story_id) references public.stories(id) on delete restrict;

create trigger vocabulary_updated_at     before update on public.vocabulary     for each row execute function private.set_updated_at();
create trigger grammar_topics_updated_at before update on public.grammar_topics for each row execute function private.set_updated_at();
create trigger stories_updated_at        before update on public.stories        for each row execute function private.set_updated_at();
