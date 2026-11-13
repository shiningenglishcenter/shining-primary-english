/**
 * Turns the content packs into SQL migrations:
 *
 *   node scripts/build-content.mts
 *
 *   content/starters.mts → 0014 (the 8 original kinds) + 0017 (new kinds, D28)
 *   content/gs1.mts      → 0016 (topics, words and every kind)
 *   content/videos.mts   → 0019 (YouTube listening activities, D31)
 *
 * Checks every picture exists in Fluent Emoji 3D. Migrations only INSERT
 * rows that are missing (matched by topic code, word, activity title), so
 * re-running never overwrites teachers' later edits.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as starters from "../content/starters.mts";
import * as gs1 from "../content/gs1.mts";
import { VIDEOS } from "../content/videos.mts";
import type { Topic } from "../content/starters.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "node_modules", "@lobehub", "fluent-emoji-3d", "assets");
const migrations = join(root, "supabase", "migrations");

const missing: string[] = [];
function code(emoji: string, where: string): string {
  const c = Array.from(emoji)
    .map((ch) => ch.codePointAt(0)!.toString(16).padStart(4, "0"))
    .join("-");
  if (!existsSync(join(assets, `${c}.webp`))) missing.push(`${where}: ${emoji} (${c})`);
  return c;
}
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

type Activity = { kind: string; en: string; vi: string };

const ACTIVITIES: readonly Activity[] = [
  { kind: "flashcards", en: "Flashcards", vi: "Thẻ từ: nhìn, nghe, nhớ" },
  { kind: "listen_choose", en: "Listen and choose", vi: "Nghe và chọn hình" },
  { kind: "look_choose", en: "Look and choose", vi: "Nhìn hình chọn từ" },
  { kind: "match", en: "Match", vi: "Nối từ với hình" },
  { kind: "spell", en: "Look and spell", vi: "Xếp chữ thành từ" },
  { kind: "true_false", en: "Yes or no?", vi: "Đúng hay sai?" },
  { kind: "fill_blank", en: "Complete the sentence", vi: "Chọn từ điền vào câu" },
  { kind: "rearrange", en: "Make a sentence", vi: "Sắp xếp thành câu" },
];

/** Kinds added after Phase 1 feedback (D28); "reading" only where a pack has a passage. */
const SKILL_ACTIVITIES: readonly Activity[] = [
  { kind: "listen_type", en: "Listen and write", vi: "Nghe và viết từ" },
  { kind: "reading", en: "Read and answer", vi: "Đọc hiểu" },
  { kind: "mixed", en: "Skills challenge", vi: "Bài tổng hợp: nghe, đọc, viết" },
];

function sentenceItems(t: Topic, kind: string): unknown[] {
  if (kind === "true_false") {
    return t.trueFalse.map(([e, sentence, answer]) => ({ emoji: code(e, t.code), sentence, answer }));
  }
  if (kind === "fill_blank") {
    return t.fillBlank.map(([e, sentence, answer, w1, w2]) => {
      if (!sentence.includes("___")) throw new Error(`${t.code}: "${sentence}" has no ___`);
      return { emoji: code(e, t.code), sentence, answer, options: [answer, w1, w2] };
    });
  }
  return t.rearrange.map(([e, sentence]) => ({ emoji: code(e, t.code), sentence }));
}

function readingContent(t: Topic): unknown {
  const r = t.reading!;
  for (const i of r.items) {
    if (i.type === "mc" && i.options[0] !== i.answer) throw new Error(`${t.code}: list the answer first`);
  }
  return {
    emoji: code(r.emoji, `${t.code}/reading`),
    title: r.title,
    passage: r.passage,
    items: r.items.map((i) => ({ ...i, emoji: null })),
  };
}

function contentFor(t: Topic, kind: string): unknown {
  if (kind === "spell") return { words: t.words.map((w) => w[0]).filter((w) => /^[a-z]{3,8}$/.test(w)) };
  if (kind === "true_false" || kind === "fill_blank" || kind === "rearrange") {
    return { items: sentenceItems(t, kind) };
  }
  if (kind === "reading") return readingContent(t);
  if (kind === "mixed") {
    // Listen → read → put words in order → write: four skills in one round.
    return {
      steps: [
        { kind: "listen_choose", content: {} },
        t.reading
          ? { kind: "reading", content: readingContent(t) }
          : { kind: "fill_blank", content: { items: sentenceItems(t, "fill_blank") } },
        { kind: "rearrange", content: { items: sentenceItems(t, "rearrange") } },
        { kind: "listen_type", content: {} },
      ],
    };
  }
  return {};
}

function migration(opts: {
  header: string;
  levelCode: string;
  topics: Topic[];
  activities: readonly Activity[];
  /** false: topics already exist (added by an earlier migration); add activities only. */
  withWords: boolean;
  /** Activity sort order starts after the ones already there. */
  sortFrom?: number;
}): string {
  const { levelCode, topics, withWords } = opts;
  const lines: string[] = [opts.header];
  lines.push(`do $$
declare
  v_level uuid := (select id from public.levels where code = ${q(levelCode)} and deleted_at is null);
  v_topic uuid;
begin
  if v_level is null then raise exception 'level ${levelCode} missing (migration 0012)'; end if;
`);

  topics.forEach((t, ti) => {
    lines.push(`  -- ${t.en}`);
    if (withWords) {
      lines.push(`  select id into v_topic from public.topics where level_id = v_level and code = ${q(t.code)} and deleted_at is null;
  if v_topic is null then
    insert into public.topics (level_id, code, title_en, title_vi, emoji, sort_order, status)
    values (v_level, ${q(t.code)}, ${q(t.en)}, ${q(t.vi)}, ${q(code(t.emoji, t.code))}, ${(ti + 1) * 10}, 'published')
    returning id into v_topic;
  end if;`);
      for (const [word, vi, emoji, pos] of t.words) {
        const p = pos ?? "noun";
        lines.push(`  insert into public.vocabulary (level_id, topic_id, word, meaning_vi, part_of_speech, emoji, topic, status)
  select v_level, v_topic, ${q(word)}, ${q(vi)}, ${q(p)}, ${q(code(emoji, `${t.code}/${word}`))}, ${q(t.code)}, 'published'
  where not exists (select 1 from public.vocabulary v where v.level_id = v_level and lower(v.word) = lower(${q(word)})
                    and coalesce(v.part_of_speech, '') = ${q(p)} and v.deleted_at is null);`);
      }
    } else {
      lines.push(`  select id into v_topic from public.topics where level_id = v_level and code = ${q(t.code)} and deleted_at is null;
  if v_topic is not null then`);
    }
    const indent = withWords ? "" : "  ";
    opts.activities
      .filter((a) => a.kind !== "reading" || t.reading)
      .forEach((a, ai) => {
        const sql = `  insert into public.practice_activities (topic_id, kind, title_en, title_vi, sort_order, status, content)
  select v_topic, ${q(a.kind)}, ${q(a.en)}, ${q(a.vi)}, ${(opts.sortFrom ?? 0) + (ai + 1) * 10}, 'published', ${json(contentFor(t, a.kind))}
  where not exists (select 1 from public.practice_activities p where p.topic_id = v_topic and p.kind = ${q(a.kind)}
                    and p.title_en = ${q(a.en)} and p.deleted_at is null);`;
        lines.push(indent ? sql.replace(/^/gm, indent) : sql);
      });
    if (!withWords) lines.push("  end if;");
  });
  lines.push("end $$;\n");
  return lines.join("\n");
}

const outputs: [file: string, sql: string, summary: string][] = [];
const count = (topics: Topic[]) => topics.reduce((n, t) => n + t.words.length, 0);

outputs.push([
  "20261110000014_starters_content.sql",
  migration({
    header: `-- =============================================================================
-- 0014 STARTERS PRACTICE PACK (generated by scripts/build-content.mts from
-- content/starters.mts — edit that file and re-run, do not edit this file).
-- Original content; pictures are Fluent Emoji codes. Inserts only missing rows,
-- so re-running never overwrites teachers' edits.
-- =============================================================================
`,
    levelCode: starters.LEVEL_CODE,
    topics: starters.TOPICS,
    activities: ACTIVITIES,
    withWords: true,
  }),
  `${starters.TOPICS.length} topics, ${count(starters.TOPICS)} words, ${starters.TOPICS.length * ACTIVITIES.length} activities`,
]);

outputs.push([
  "20261111000016_gs1_content.sql",
  migration({
    header: `-- =============================================================================
-- 0016 GLOBAL SUCCESS 1 PRACTICE PACK (generated by scripts/build-content.mts
-- from content/gs1.mts — edit that file and re-run, do not edit this file).
-- Units follow the textbook syllabus; sentences and passages are original.
-- Needs 0015 (new activity kinds). Inserts only missing rows.
-- =============================================================================
`,
    levelCode: gs1.LEVEL_CODE,
    topics: gs1.TOPICS,
    activities: [...ACTIVITIES, ...SKILL_ACTIVITIES],
    withWords: true,
  }),
  `${gs1.TOPICS.length} units, ${count(gs1.TOPICS)} words`,
]);

outputs.push([
  "20261111000017_starters_skills.sql",
  migration({
    header: `-- =============================================================================
-- 0017 STARTERS: NEW ACTIVITY KINDS (generated by scripts/build-content.mts).
-- Adds "Listen and write" and a "Skills challenge" (mixed) to every Starters
-- topic from 0014. Needs 0015. Inserts only missing rows.
-- =============================================================================
`,
    levelCode: starters.LEVEL_CODE,
    topics: starters.TOPICS,
    activities: SKILL_ACTIVITIES,
    withWords: false,
    sortFrom: ACTIVITIES.length * 10,
  }),
  `${starters.TOPICS.length * 2} activities`,
]);

if (missing.length > 0) {
  console.error(`Missing Fluent Emoji images:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
{
  const lines = [
    `-- =============================================================================
-- 0019 VIDEO LISTENING ACTIVITIES (generated by scripts/build-content.mts from
-- content/videos.mts). YouTube songs embedded via youtube-nocookie, with
-- questions. Needs 0015, 0016. Inserts only missing rows.
-- =============================================================================
do $$
declare
  v_topic uuid;
begin`,
  ];
  VIDEOS.forEach((v, i) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(v.videoId)) throw new Error(`bad video id ${v.videoId}`);
    for (const it of v.items) {
      if (it.type === "mc" && it.options[0] !== it.answer)
        throw new Error(`${v.topic}: list the answer first`);
    }
    const content = {
      media: { source: "youtube", videoId: v.videoId },
      items: v.items.map((it) => ({ ...it, emoji: null })),
    };
    lines.push(`  -- ${v.level} / ${v.topic}
  select t.id into v_topic from public.topics t join public.levels l on l.id = t.level_id
  where l.code = ${q(v.level)} and t.code = ${q(v.topic)} and t.deleted_at is null;
  if v_topic is not null then
    insert into public.practice_activities (topic_id, kind, title_en, title_vi, sort_order, status, content)
    select v_topic, 'listening', ${q(v.en)}, ${q(v.vi)}, ${200 + i}, 'published', ${json(content)}
    where not exists (select 1 from public.practice_activities p where p.topic_id = v_topic and p.kind = 'listening'
                      and p.title_en = ${q(v.en)} and p.deleted_at is null);
  end if;`);
  });
  lines.push("end $$;\n");
  outputs.push([
    "20261112000019_video_activities.sql",
    lines.join("\n"),
    `${VIDEOS.length} video activities`,
  ]);
}

for (const [file, sql, summary] of outputs) {
  writeFileSync(join(migrations, file), sql);
  console.warn(`Wrote ${file}: ${summary}`);
}
