/**
 * Content packs v2 → SQL migrations (ARCHITECTURE D60).
 *
 * Library used by scripts/build-content-v2.mts and the unit test.
 *
 * Each pack in content/v2/<level>.mts becomes one migration that adds the
 * level's topics (with sentence patterns), words and every activity kind,
 * PUBLISHED. Inserts only missing rows (topic code, word, activity title),
 * so re-running never overwrites teachers' edits.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IPA } from "../content/ipa.mts";
import type { Exam, Grammar, Pack, Unit } from "../content/v2/types.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "node_modules", "@lobehub", "fluent-emoji-3d", "assets");


let problems: string[] = [];
const fail = (where: string, msg: string) => problems.push(`${where}: ${msg}`);

function code(emoji: string, where: string): string | null {
  if (!emoji) return null;
  const c = Array.from(emoji)
    .map((ch) => ch.codePointAt(0)!.toString(16).padStart(4, "0"))
    .join("-");
  if (!existsSync(join(assets, `${c}.webp`))) {
    // Many emoji drop the variation selector in the asset name.
    const bare = c.replace(/-fe0f/g, "");
    if (existsSync(join(assets, `${bare}.webp`))) return bare;
    fail(where, `no picture for ${emoji} (${c})`);
  }
  return c;
}
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const split = (line: string) => line.split("|").map((s) => s.trim());

type Act = { kind: string; en: string; vi: string; content: unknown; settings?: unknown };

const MIN = 8;
/** vocabulary.part_of_speech check constraint (migration 0004). */
const POS = ["noun", "verb", "adjective", "adverb", "preposition", "pronoun", "determiner", "conjunction", "interjection", "phrase", "number"];

function words(u: Unit) {
  return u.words.map((line) => {
    const [word = "", vi = "", emoji = "", pos = ""] = split(line);
    if (!word || !vi) fail(`${u.code}/words`, `"${line}" needs word|nghĩa`);
    if (pos && !POS.includes(pos)) fail(`${u.code}/words`, `"${line}": part of speech must be one of ${POS.join(", ")}`);
    return { word, vi, emoji: code(emoji, `${u.code}/${word}`), pos: pos || null };
  });
}

function pairs(lines: string[], where: string) {
  return lines.map((l) => {
    const [en = "", vi = ""] = split(l);
    if (!en || !vi) fail(where, `"${l}" needs English|Tiếng Việt`);
    return { en, vi };
  });
}

function trueFalse(u: Unit) {
  if (u.tf.length < MIN) fail(u.code, `true/false: ${u.tf.length} < ${MIN}`);
  return u.tf.map((l) => {
    const [e = "", sentence = "", tf = ""] = split(l);
    if (tf !== "T" && tf !== "F") fail(`${u.code}/tf`, `"${l}" must end with T or F`);
    return { emoji: code(e, `${u.code}/tf`), sentence, answer: tf === "T" };
  });
}

function fillBlank(u: Unit) {
  if (u.fill.length < MIN) fail(u.code, `fill: ${u.fill.length} < ${MIN}`);
  return u.fill.map((l) => {
    const [e = "", sentence = "", answer = "", w1 = "", w2 = "", explain = ""] = split(l);
    if ((sentence.match(/___/g) ?? []).length !== 1) fail(`${u.code}/fill`, `"${sentence}" needs one ___`);
    const options = [answer, w1, w2].filter(Boolean);
    if (options.length < 3 || new Set(options.map((o) => o.toLowerCase())).size !== options.length)
      fail(`${u.code}/fill`, `"${l}" needs 3 different options`);
    return { emoji: code(e, `${u.code}/fill`), sentence, answer, options, ...(explain ? { explain } : {}) };
  });
}

function sentences(u: Unit) {
  if (u.sentences.length < MIN) fail(u.code, `sentences: ${u.sentences.length} < ${MIN}`);
  return pairs(u.sentences, `${u.code}/sentences`);
}

function rearrange(list: { en: string }[], where: string) {
  const items = list
    .filter((s) => {
      const n = s.en.split(/\s+/).length;
      return n >= 3 && n <= 10;
    })
    .map((s) => ({ emoji: null, sentence: s.en }));
  if (items.length < 6) fail(where, `only ${items.length} sentences of 3–10 words for "Make a sentence"`);
  return items;
}

function translate(list: { en: string; vi: string }[], where: string) {
  if (list.length < 3) fail(where, "translate needs 3+ sentences");
  return list.map((s, i) => {
    const others = [list[(i + 1) % list.length]!.vi, list[(i + 2) % list.length]!.vi];
    return { emoji: null, sentence: s.en, answer: s.vi, options: [s.vi, ...others] };
  });
}

function reading(u: Unit) {
  const r = u.reading;
  if (r.items.length < 4) fail(`${u.code}/reading`, "needs 4+ questions");
  if (r.passage.length < 60 || r.passage.length > 1500) fail(`${u.code}/reading`, "passage 60–1500 chars");
  return {
    emoji: code(r.emoji, `${u.code}/reading`),
    title: r.title,
    passage: r.passage,
    items: r.items.map((l) => {
      const [t = "", a = "", b = "", c = "", d = ""] = split(l);
      if (t === "T" || t === "F") return { type: "tf", sentence: a, answer: t === "T", emoji: null };
      if (t !== "Q" || !a || !b || !c) fail(`${u.code}/reading`, `"${l}"`);
      return { type: "mc", question: a, answer: b, options: [b, c, d].filter(Boolean), emoji: null };
    }),
  };
}

function phonics(u: Unit) {
  const p = u.phonics!;
  if (p.items.length < 6) fail(`${u.code}/phonics`, "needs 6+ items");
  return {
    sound: p.sound,
    letters: p.letters,
    items: p.items.map((l) => {
      const [answer = "", w1 = "", w2 = ""] = split(l);
      if (!answer || !w1 || !w2) fail(`${u.code}/phonics`, `"${l}" needs 3 words`);
      return { answer, options: [answer, w1, w2] };
    }),
  };
}

function unitActivities(pack: Pack, u: Unit): Act[] {
  const sent = sentences(u);
  const tf = trueFalse(u);
  const fill = fillBlank(u);
  const re = rearrange(sent, u.code);
  const read = reading(u);
  const acts: Act[] = [
    { kind: "flashcards", en: "Flashcards", vi: "Thẻ từ: nhìn, nghe, nhớ", content: {} },
    { kind: "look_choose", en: "Look and choose", vi: "Nhìn hình chọn từ", content: {} },
    { kind: "listen_choose", en: "Listen and choose", vi: "Nghe và chọn hình", content: {} },
    { kind: "match", en: "Match", vi: "Nối từ với hình", content: {} },
    { kind: "match_meaning", en: "Match the meanings", vi: "Nối từ với nghĩa", content: {} },
    { kind: "spell", en: "Look and spell", vi: "Xếp chữ thành từ", content: {} },
    {
      kind: "listen_type",
      en: "Listen and write",
      vi: "Nghe và viết từ",
      content: {},
      settings: { writeHint: pack.writeHint },
    },
    { kind: "true_false", en: "Yes or no?", vi: "Đúng hay sai?", content: { items: tf } },
    { kind: "fill_blank", en: "Complete the sentence", vi: "Chọn từ điền vào câu", content: { items: fill } },
    { kind: "rearrange", en: "Make a sentence", vi: "Sắp xếp thành câu", content: { items: re } },
    {
      kind: "translate",
      en: "What does it mean?",
      vi: "Chọn nghĩa của câu",
      content: { direction: "en_vi", items: translate(sent, u.code) },
    },
    { kind: "reading", en: "Read and answer", vi: "Đọc hiểu", content: read },
  ];
  if (u.phonics) {
    acts.push({
      kind: "phonics",
      en: `Sounds: ${u.phonics.sound}`,
      vi: `Ngữ âm: âm ${u.phonics.sound}`,
      content: phonics(u),
    });
  }
  acts.push({
    kind: "mixed",
    en: "Skills challenge",
    vi: "Thử thách: nghe, đọc, viết",
    content: {
      steps: [
        { kind: "listen_choose", content: {} },
        { kind: "reading", content: read },
        { kind: "rearrange", content: { items: re } },
        { kind: "listen_type", content: {} },
      ],
    },
  });
  return acts;
}

function reviewActivities(pack: Pack, units: Unit[], codes: string[], where: string): Act[] {
  const picked = codes.map((c) => {
    const u = units.find((x) => x.code === c);
    if (!u) fail(where, `unknown unit ${c}`);
    return u;
  });
  const from = picked.filter((u): u is Unit => Boolean(u));
  // A few of each unit's sentences: every unit appears in each review game.
  const take = <T,>(f: (u: Unit) => T[], n: number) => from.flatMap((u) => f(u).slice(0, n)).slice(0, 30);
  const tf = take(trueFalse, 3);
  const fill = take(fillBlank, 3);
  const sent = take(sentences, 3);
  const w = { units: codes };
  return [
    { kind: "flashcards", en: "Flashcards", vi: "Thẻ từ: ôn lại", content: w },
    { kind: "look_choose", en: "Look and choose", vi: "Nhìn hình chọn từ", content: w },
    { kind: "listen_choose", en: "Listen and choose", vi: "Nghe và chọn hình", content: w },
    { kind: "match_meaning", en: "Match the meanings", vi: "Nối từ với nghĩa", content: w },
    {
      kind: "listen_type",
      en: "Listen and write",
      vi: "Nghe và viết từ",
      content: w,
      settings: { writeHint: pack.writeHint },
    },
    { kind: "true_false", en: "Yes or no?", vi: "Đúng hay sai?", content: { items: tf } },
    { kind: "fill_blank", en: "Complete the sentence", vi: "Chọn từ điền vào câu", content: { items: fill } },
    { kind: "rearrange", en: "Make a sentence", vi: "Sắp xếp thành câu", content: { items: rearrange(sent, where) } },
    {
      kind: "translate",
      en: "What does it mean?",
      vi: "Chọn nghĩa của câu",
      content: { direction: "vi_en", items: translate(sent.map((s) => ({ en: s.vi, vi: s.en })), where) },
    },
    {
      kind: "mixed",
      en: "Review challenge",
      vi: "Thử thách ôn tập",
      content: {
        steps: [
          { kind: "listen_choose", content: w },
          { kind: "fill_blank", content: { items: fill } },
          { kind: "rearrange", content: { items: rearrange(sent, where) } },
          { kind: "listen_type", content: w },
        ],
      },
    },
  ];
}

function grammarActivities(g: Grammar): Act[] {
  const u = g as unknown as Unit;
  const sent = sentences(u);
  const tf = trueFalse(u);
  const fill = fillBlank(u);
  const re = rearrange(sent, g.code);
  return [
    { kind: "true_false", en: "Right or wrong?", vi: "Câu đúng hay sai?", content: { items: tf } },
    { kind: "fill_blank", en: "Choose the right word", vi: "Chọn từ đúng", content: { items: fill } },
    { kind: "rearrange", en: "Make a sentence", vi: "Sắp xếp thành câu", content: { items: re } },
    {
      kind: "translate",
      en: "What does it mean?",
      vi: "Chọn nghĩa của câu",
      content: { direction: "en_vi", items: translate(sent, g.code) },
    },
    {
      kind: "translate",
      en: "Say it in English",
      vi: "Chọn câu tiếng Anh đúng",
      content: { direction: "vi_en", items: translate(sent.map((x) => ({ en: x.vi, vi: x.en })), g.code) },
    },
    {
      kind: "mixed",
      en: "Grammar challenge",
      vi: "Thử thách ngữ pháp",
      content: {
        steps: [
          { kind: "fill_blank", content: { items: fill } },
          { kind: "true_false", content: { items: tf } },
          { kind: "rearrange", content: { items: re } },
        ],
      },
    },
  ];
}

/** Exam content: emoji written as characters become picture codes. */
function examContent(value: unknown, where: string): unknown {
  if (Array.isArray(value)) return value.map((v) => examContent(v, where));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "emoji" && typeof v === "string") out[k] = code(v, where);
      else if (k === "objects" && Array.isArray(v)) out[k] = v.map((o) => code(String(o), where));
      else out[k] = examContent(v, where);
    }
    return out;
  }
  return value;
}

function examActivities(e: Exam): Act[] {
  return e.acts.map((a) => ({ kind: a.kind, en: a.en, vi: a.vi, content: examContent(a.content, e.code) }));
}

/** Every activity built, for the schema check in tests/unit/content-packs.test.ts. */
export type BuiltActivity = { where: string; kind: string; content: unknown };

export function buildPack(
  file: string,
  pack: Pack,
): { sql: string; acts: BuiltActivity[]; problems: string[] } {
  problems = [];
  const acts: BuiltActivity[] = [];
  let current = "";
  const seen = new Map<string, string>();
  const codes = new Set<string>();
  const out: string[] = [
    `-- =============================================================================
-- ${file.slice(10, 14)} ${pack.level} PRACTICE PACK (ARCHITECTURE D60) — generated by
-- scripts/build-content-v2.mts from content/v2; edit the pack and re-run.
-- Original sentences and passages; topics/words follow the Cambridge YLE lists
-- or the Tiếng Anh Global Success syllabus. Everything is PUBLISHED.
-- Inserts only missing rows, so re-running never overwrites teachers' edits.
-- =============================================================================
do $$
declare
  v_level uuid := (select id from public.levels where code = ${q(pack.level)} and deleted_at is null);
  v_topic uuid;
begin
  if v_level is null then raise exception 'level ${pack.level} missing'; end if;
`,
  ];
  const topic = (c: string, en: string, vi: string, emoji: string, sort: number, patterns: unknown[]) =>
    `  select id into v_topic from public.topics where level_id = v_level and code = ${q(c)} and deleted_at is null;
  if v_topic is null then
    insert into public.topics (level_id, code, title_en, title_vi, emoji, sort_order, status, patterns)
    values (v_level, ${q(c)}, ${q(en)}, ${q(vi)}, ${q(code(emoji, c) ?? "")}, ${sort}, 'published', ${json(patterns)})
    returning id into v_topic;
  end if;`;
  const activity = (a: Act, sort: number) => {
    acts.push({ where: `${pack.level}/${current}/${a.en}`, kind: a.kind, content: a.content });
    return sqlOf(a, sort);
  };
  const sqlOf = (a: Act, sort: number) =>
    `  insert into public.practice_activities (topic_id, kind, title_en, title_vi, sort_order, status, content, settings)
  select v_topic, ${q(a.kind)}, ${q(a.en)}, ${q(a.vi)}, ${sort}, 'published', ${json(a.content)}, ${json(a.settings ?? {})}
  where not exists (select 1 from public.practice_activities p where p.topic_id = v_topic and p.kind = ${q(a.kind)}
                    and p.title_en = ${q(a.en)} and p.deleted_at is null);`;

  // Reviews sit right after their last unit.
  const reviewAfter = new Map<string, Pack["reviews"]>();
  for (const r of pack.reviews) {
    const last = r.units.at(-1)!;
    reviewAfter.set(last, [...(reviewAfter.get(last) ?? []), r]);
  }
  // Extra topics for older packs go after the topics already there.
  let sort = pack.units.length ? 0 : 1000;
  for (const u of pack.units) {
    if (codes.has(u.code)) fail(u.code, "duplicate topic code");
    codes.add(u.code);
    if (!/^[a-z0-9-]{1,40}$/.test(u.code)) fail(u.code, "bad code");
    const ws = words(u);
    if (ws.length < 8) fail(u.code, `only ${ws.length} words`);
    if (ws.filter((w) => w.emoji).length < 6) fail(u.code, "fewer than 6 words with pictures");
    const patterns = pairs(u.patterns, `${u.code}/patterns`);
    if (patterns.length < 3 || patterns.length > 10) fail(u.code, "3–10 patterns");
    sort += 10;
    current = u.code;
    out.push(`  -- ${u.en}`);
    out.push(topic(u.code, u.en, u.vi, u.emoji, sort, patterns));
    for (const w of ws) {
      const key = `${w.word.toLowerCase()}|${w.pos ?? "noun"}`;
      if (seen.has(key)) fail(u.code, `"${w.word}" already in ${seen.get(key)} (one per level)`);
      seen.set(key, u.code);
      const ipa = IPA[w.word.toLowerCase()] ?? null;
      out.push(`  insert into public.vocabulary (level_id, topic_id, word, meaning_vi, part_of_speech, emoji, ipa, topic, status)
  select v_level, v_topic, ${q(w.word)}, ${q(w.vi)}, ${q(w.pos ?? "noun")}, ${w.emoji ? q(w.emoji) : "null"}, ${ipa ? q(ipa) : "null"}, ${q(u.code)}, 'published'
  where not exists (select 1 from public.vocabulary v where v.level_id = v_level and lower(v.word) = lower(${q(w.word)})
                    and coalesce(v.part_of_speech, '') = ${q(w.pos ?? "noun")} and v.deleted_at is null);`);
    }
    unitActivities(pack, u).forEach((a, i) => out.push(activity(a, (i + 1) * 10)));
    for (const r of reviewAfter.get(u.code) ?? []) {
      sort += 10;
      current = r.code;
      out.push(`  -- ${r.en}`);
      out.push(topic(r.code, r.en, r.vi, r.emoji, sort, []));
      reviewActivities(pack, pack.units, r.units, r.code).forEach((a, i) => out.push(activity(a, (i + 1) * 10)));
    }
  }
  for (const x of pack.phonicsFor ?? []) {
    current = x.code;
    const u = { code: x.code, phonics: x.phonics } as Unit;
    const act: Act = {
      kind: "phonics",
      en: `Sounds: ${x.phonics.sound}`,
      vi: `Ngữ âm: âm ${x.phonics.sound}`,
      content: phonics(u),
    };
    out.push(`  -- phonics for ${x.code}
  select id into v_topic from public.topics where level_id = v_level and code = ${q(x.code)} and deleted_at is null;
  if v_topic is not null then
${activity(act, 900).replace(/^/gm, "  ")}
  end if;`);
  }
  for (const g of pack.grammar ?? []) {
    if (codes.has(g.code)) fail(g.code, "duplicate topic code");
    codes.add(g.code);
    sort += 10;
    current = g.code;
    out.push(`  -- ${g.en}`);
    out.push(topic(g.code, g.en, g.vi, g.emoji, sort, pairs(g.patterns, `${g.code}/patterns`)));
    grammarActivities(g).forEach((a, i) => out.push(activity(a, (i + 1) * 10)));
  }
  for (const e of pack.exams ?? []) {
    if (codes.has(e.code)) fail(e.code, "duplicate topic code");
    codes.add(e.code);
    sort += 10;
    current = e.code;
    out.push(`  -- ${e.en}`);
    out.push(topic(e.code, e.en, e.vi, e.emoji, sort, []));
    examActivities(e).forEach((a, i) => out.push(activity(a, (i + 1) * 10)));
  }
  out.push("end $$;\n");
  return { sql: out.join("\n"), acts, problems };
}


/** [migration file, pack module] — the order migrations run in. */
export const PACKS: [file: string, module: string][] = [
  // Additions to the packs written before v2 (content/starters.mts, content/gs1.mts) are below.
  ["20261123000036_movers_content.sql", "../content/v2/movers.mts"],
  ["20261123000037_flyers_content.sql", "../content/v2/flyers.mts"],
  ["20261123000038_gs2_content.sql", "../content/v2/gs2.mts"],
  ["20261123000039_gs3_content.sql", "../content/v2/gs3.mts"],
  ["20261123000040_gs4_content.sql", "../content/v2/gs4.mts"],
  ["20261123000041_gs5_content.sql", "../content/v2/gs5.mts"],
  ["20261123000042_starters_extra.sql", "../content/v2/starters-extra.mts"],
  ["20261123000043_gs1_extra.sql", "../content/v2/gs1-extra.mts"],
];
