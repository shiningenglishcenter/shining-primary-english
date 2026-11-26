/**
 * Recorded voice (ARCHITECTURE D67), step 1 and 3:
 *
 *   node --import ./scripts/voice/alias-hooks.mjs scripts/voice/texts.mts list <out.json>
 *     Every text the app reads aloud (published topics and activities), minus
 *     the ones that already have a file in voice/emma/. Writes [{key, text}].
 *
 *   node --import ./scripts/voice/alias-hooks.mjs scripts/voice/texts.mts upload <folder>
 *     Uploads <folder>/<key>.mp3 (made by generate.py) to voice/emma/<key>.mp3.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { unitsOf } from "@/features/practice/round";
import { activityTexts, DEFAULT_VOICE, topicTexts, VOICE_BUCKET, voiceKey } from "@/features/practice/voice";
import type { PracticeKind, VocabWord } from "@/features/practice/model";

const [mode, arg] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !arg || (mode !== "list" && mode !== "upload")) {
  console.error("Usage: see the comment at the top of scripts/voice/texts.mts.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const bucket = supabase.storage.from(VOICE_BUCKET);

/** All rows of a select, 1000 at a time. */
async function all<T>(table: string, select: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .is("deleted_at", null)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

/** Keys that already have a file in voice/emma/. */
async function existing(): Promise<Set<string>> {
  const out = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(DEFAULT_VOICE, { limit: 1000, offset });
    if (error) throw new Error(`list: ${error.message}`);
    for (const f of data ?? []) out.add(f.name.replace(/\.mp3$/, ""));
    if (!data || data.length < 1000) return out;
  }
}

if (mode === "list") {
  type Topic = { id: string; code: string; status: string; patterns: unknown; level: { code: string } };
  type Word = { word: string; meaning_vi: string; emoji: string | null; topic_id: string; status: string };
  type Activity = { kind: PracticeKind; content: unknown; status: string; topic_id: string };
  const [topics, words, activities, have] = await Promise.all([
    all<Topic>("topics", "id, code, status, patterns, level:levels!inner(code)"),
    all<Word>("vocabulary", "word, meaning_vi, emoji, topic_id, status"),
    all<Activity>("practice_activities", "kind, content, status, topic_id"),
    existing(),
  ]);
  const byTopic = new Map<string, VocabWord[]>();
  for (const w of words) {
    if (w.status !== "published") continue;
    const list = byTopic.get(w.topic_id) ?? [];
    list.push({ word: w.word, meaningVi: w.meaning_vi, emoji: w.emoji });
    byTopic.set(w.topic_id, list);
  }
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const idByCode = new Map(topics.map((t) => [`${t.level.code}/${t.code}`, t.id]));
  const texts = new Set<string>();
  for (const t of topics) {
    if (t.status !== "published") continue;
    const patterns = Array.isArray(t.patterns) ? (t.patterns as { en?: unknown }[]) : [];
    for (const x of topicTexts(
      byTopic.get(t.id) ?? [],
      patterns.filter((p) => typeof p.en === "string") as { en: string }[],
    ))
      texts.add(x);
  }
  for (const a of activities) {
    const topic = topicById.get(a.topic_id);
    if (a.status !== "published" || topic?.status !== "published") continue;
    const units = unitsOf(a.content);
    const list = units.length
      ? units.flatMap((u) => byTopic.get(idByCode.get(`${topic.level.code}/${u}`) ?? "") ?? [])
      : (byTopic.get(a.topic_id) ?? []);
    for (const x of activityTexts(a.kind, a.content, list)) texts.add(x);
  }
  const todo = [...texts].map((text) => ({ key: voiceKey(text), text })).filter((t) => !have.has(t.key));
  writeFileSync(arg, JSON.stringify(todo));
  process.stdout.write(
    `${texts.size} texts, ${have.size} files already there, ${todo.length} to make → ${arg}\n`,
  );
} else {
  // Files already in the bucket are skipped, so a failed run can simply be re-run.
  const have = await existing();
  const files = readdirSync(arg).filter((f) => /^[0-9a-f]{28}\.mp3$/.test(f) && !have.has(f.slice(0, 28)));
  let done = 0;
  // A few uploads at a time.
  const queue = [...files];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        let error: { message: string } | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          ({ error } = await bucket.upload(`${DEFAULT_VOICE}/${f}`, readFileSync(join(arg, f)), {
            contentType: "audio/mpeg",
            upsert: true,
          }));
          if (!error) break;
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
        if (error) {
          console.error(`${f}: ${error.message}`);
          process.exit(1);
        }
        done++;
      }
    }),
  );
  process.stdout.write(`${done} voice files uploaded.\n`);
}
