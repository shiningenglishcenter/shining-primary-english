import { buildRound, toYesNoQuestion, type Question } from "@/features/practice/round";
import type { PracticeKind, VocabWord } from "@/features/practice/model";

/**
 * Recorded voice (D67): what the app reads aloud is played from pre-made mp3
 * files (Kokoro, voice "emma", British English) in the public `voice` bucket,
 * named after the text; a teacher may replace the file of one sentence of one
 * activity or topic with a recording of their own (`voices`, key → path).
 * Without a file the browser's speech synthesis reads it, as before.
 */

export const VOICE_BUCKET = "voice";
export const DEFAULT_VOICE = "emma";
/** A teacher's own recording, uploaded by staff. */
export const CUSTOM_VOICE_PATH = /^custom\/[0-9a-f-]{36}\.(mp3|webm|m4a|ogg|wav)$/;
export const CUSTOM_VOICE_MAX_BYTES = 2 * 1024 * 1024;
export const CUSTOM_VOICE_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};
/** Teacher overrides of one activity or topic: voiceKey(text) → custom path. */
export type Voices = Record<string, string>;

/** Teacher recordings from the database: only well-formed entries are used. */
export function voicesOf(value: unknown): Voices {
  const out: Voices = {};
  if (value && typeof value === "object" && !Array.isArray(value))
    for (const [k, v] of Object.entries(value))
      if (VOICE_KEY.test(k) && typeof v === "string" && CUSTOM_VOICE_PATH.test(v)) out[k] = v;
  return out;
}

export const VOICE_KEY = /^[0-9a-f]{28}$/;

export function normText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 53-bit string hash (cyrb53); synchronous, so a tap can start playing at once (iOS). */
function cyrb53(s: string, seed: number): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

/** File name of a text's voice: the same text always maps to the same file. */
export function voiceKey(text: string): string {
  const t = normText(text);
  return `${cyrb53(t, 1)}${cyrb53(t, 2)}`;
}

/** Path in the voice bucket: a teacher's recording, else the default voice's file. */
export function voicePath(text: string, voices?: Voices | null): string {
  const key = voiceKey(text);
  return voices?.[key] ?? `${DEFAULT_VOICE}/${key}.mp3`;
}

export function voiceUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${VOICE_BUCKET}/${path}`;
}

/** Everything the player may read aloud for one question (mirrors player.tsx). */
export function spokenTexts(q: Question): string[] {
  switch (q.type) {
    case "flash":
      return [q.card.word];
    case "listen_choose":
      return [q.answer.word, ...q.options.map((c) => c.word)];
    case "look_choose":
      return [q.answer.word, ...q.options];
    case "match":
      return q.pairs.map((c) => c.word);
    case "spell":
    case "listen_type":
      return [q.answer.word];
    case "true_false": {
      const yn = toYesNoQuestion(q.sentence);
      return [q.sentence, "Yes", "No", ...(yn ? [yn.question, yn.yes, yn.no] : [])];
    }
    case "fill_blank":
      return [`${q.before}${q.answer}${q.after}`];
    case "rearrange":
      return [q.answer.join(" ")];
    case "choice":
      return q.translate !== "vi_en" && !q.phonics ? [q.prompt] : q.options;
    case "write":
      return [q.answers[0]!, ...(q.say ? [q.say, `${q.say} ${q.prompt}`] : [q.prompt])];
    case "colour":
      return [q.say];
  }
}

/** Small seeded random numbers, so the same content lists the same texts. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROUNDS = 60;

/**
 * Every text an activity may read aloud: rounds pick at random, so many
 * seeded rounds are built and their texts joined (tests check this covers
 * what real rounds say). Topic words are always included.
 */
export function activityTexts(kind: PracticeKind, content: unknown, words: VocabWord[]): string[] {
  const out = new Set<string>(words.map((w) => normText(w.word)));
  for (let seed = 1; seed <= ROUNDS; seed++) {
    const round = buildRound(kind, content, words, seeded(seed));
    for (const q of round.questions) for (const t of spokenTexts(q)) out.add(normText(t));
    for (const c of round.contexts) if (c.type === "reading") out.add(normText(c.passage));
  }
  out.delete("");
  return [...out];
}

/** A topic's own texts: its words and sentence patterns. */
export function topicTexts(words: VocabWord[], patterns: { en: string }[]): string[] {
  return [...new Set([...words.map((w) => w.word), ...patterns.map((p) => p.en)].map(normText))].filter(
    Boolean,
  );
}
