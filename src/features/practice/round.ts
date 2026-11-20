import {
  isSentenceKind,
  itemsSchemaByKind,
  listeningContentSchema,
  mixedContentSchema,
  readingContentSchema,
  wordContentSchema,
  POINTS,
  type Media,
  type PracticeKind,
  type QuizItem,
  type VocabWord,
} from "@/features/practice/model";

/**
 * Builds one playable round from an activity's content and its topic's
 * words. Pure (randomness injected) so it is unit-tested; runs on the server
 * and the result is passed to the client player.
 */

export type Card = {
  word: string;
  meaningVi: string;
  emoji: string | null;
  image?: string | null;
  ipa?: string | null;
};

type QuestionBody =
  | { type: "flash"; card: Card }
  | { type: "listen_choose"; answer: Card; options: Card[] }
  | { type: "look_choose"; answer: Card; options: string[] }
  | { type: "match"; pairs: Card[]; /** Vietnamese meanings instead of pictures (D47). */ meaning?: boolean }
  | { type: "spell"; answer: Card; letters: string[] }
  | { type: "true_false"; emoji: string | null; sentence: string; answer: boolean }
  | {
      type: "fill_blank";
      emoji: string | null;
      before: string;
      after: string;
      options: string[];
      answer: string;
    }
  | { type: "rearrange"; emoji: string | null; words: string[]; answer: string[] }
  | { type: "listen_type"; answer: Card }
  | {
      type: "choice";
      emoji: string | null;
      prompt: string;
      options: string[];
      answer: string;
      /** "Choose the meaning" (D47): which language the prompt is in. */
      translate?: "en_vi" | "vi_en";
    };

/**
 * A question; `ctx` points into `Round.contexts` when it is about a passage
 * or a recording, which the player keeps on screen above the question.
 */
/** `at`: a listening question opens when the recording reaches this second (D50). */
export type Question = QuestionBody & { ctx?: number; hint?: string; explain?: string; at?: number };

/** Server-side context: an audio file is still a storage path here. */
export type RoundContext =
  | { type: "listening"; media: Media; gate: boolean }
  | { type: "reading"; emoji: string | null; title: string | null; passage: string };

/** What the player receives: files resolved to short-lived URLs. */
export type PlayerContext =
  | {
      type: "listening";
      youtube: { videoId: string; start: number } | null;
      audioUrl: string | null;
      /** Questions wait until the pupil has watched/listened (D50). */
      gate: boolean;
    }
  | { type: "reading"; emoji: string | null; title: string | null; passage: string };

export type Round = { questions: Question[]; maxScore: number; contexts: RoundContext[] };

export const ROUND_SIZE = 8;
/** Questions taken from each step of a "mixed" activity. */
export const MIXED_STEP_SIZE = 3;
/** Match pairs per screen: phones (the default) and wide screens (C5, D40). */
export const MATCH_PAIRS = 4;
export const MATCH_PAIRS_WIDE = 6;
/** Words a match activity uses in all (3 phone screens or 2 wide ones). */
const MATCH_WORDS = 12;
/** Word games repeat words when a topic has fewer (C8, D40). */
export const MIN_QUESTIONS = 6;

type Rand = () => number;

export function shuffle<T>(items: readonly T[], rand: Rand = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Shuffles, but never returns the original order when that is possible. */
function scramble<T>(items: readonly T[], rand: Rand): T[] {
  if (items.length < 2) return [...items];
  for (let i = 0; i < 10; i++) {
    const s = shuffle(items, rand);
    if (s.some((x, k) => x !== items[k])) return s;
  }
  return [...items.slice(1), items[0]!];
}

function pickOthers(all: Card[], answer: Card, n: number, rand: Rand): Card[] {
  return shuffle(
    all.filter((c) => c.word.toLowerCase() !== answer.word.toLowerCase()),
    rand,
  ).slice(0, n);
}

const EMPTY: Round = { questions: [], maxScore: 0, contexts: [] };

/** Best possible score: every question (every match pair) is worth POINTS.first. */
export function scoreOf(questions: Question[]): number {
  return questions.reduce((n, q) => n + (q.type === "match" ? q.pairs.length : 1), 0) * POINTS.first;
}

export function buildRound(
  kind: PracticeKind,
  content: unknown,
  topicWords: VocabWord[],
  rand: Rand = Math.random,
): Round {
  if (kind === "mixed") {
    const parsed = mixedContentSchema.safeParse(content);
    if (!parsed.success) return EMPTY;
    const questions: Question[] = [];
    const contexts: RoundContext[] = [];
    for (const step of parsed.data.steps) {
      const r = buildRound(step.kind, step.content, topicWords, rand);
      // Keep a step's questions in order for passages; others are already shuffled.
      const take = step.kind === "match" ? 1 : MIXED_STEP_SIZE;
      const offset = contexts.length;
      contexts.push(...r.contexts);
      for (const q of r.questions.slice(0, take)) {
        questions.push(q.ctx === undefined ? q : { ...q, ctx: q.ctx + offset });
      }
    }
    return { questions, maxScore: scoreOf(questions), contexts };
  }
  if (kind === "listening" || kind === "reading") {
    const parsed = (kind === "listening" ? listeningContentSchema : readingContentSchema).safeParse(content);
    if (!parsed.success) return EMPTY;
    const data = parsed.data as {
      media?: Media;
      gate?: boolean;
      emoji?: string | null;
      title?: string;
      passage?: string;
      items: QuizItem[];
    };
    const context: RoundContext =
      kind === "listening"
        ? { type: "listening", media: data.media!, gate: data.gate === true }
        : { type: "reading", emoji: data.emoji ?? null, title: data.title || null, passage: data.passage! };
    // Questions follow the recording / passage, so keep the teacher's order.
    const questions: Question[] = data.items.map((item) => ({
      ...quizQuestion(item, rand),
      ctx: 0,
      ...(item.hint ? { hint: item.hint } : {}),
      ...(item.explain ? { explain: item.explain } : {}),
      ...(kind === "listening" && item.at !== undefined ? { at: item.at } : {}),
    }));
    return { questions, maxScore: scoreOf(questions), contexts: [context] };
  }
  const { questions } = buildSimple(kind, content, topicWords, rand);
  return { questions, maxScore: scoreOf(questions), contexts: [] };
}

function quizQuestion(item: QuizItem, rand: Rand): QuestionBody {
  if (item.type === "tf") {
    return { type: "true_false", emoji: item.emoji ?? null, sentence: item.sentence, answer: item.answer };
  }
  return {
    type: "choice",
    emoji: item.emoji ?? null,
    prompt: item.question,
    options: shuffle(item.options, rand),
    answer: item.answer,
  };
}

function buildSimple(
  kind: PracticeKind,
  content: unknown,
  topicWords: VocabWord[],
  rand: Rand,
): Omit<Round, "contexts"> {
  if (isSentenceKind(kind)) {
    const parsed = itemsSchemaByKind[kind].safeParse(content);
    if (!parsed.success) return { questions: [], maxScore: 0 };
    const items = shuffle(parsed.data.items as unknown[], rand).slice(0, ROUND_SIZE);
    const direction = (parsed.data as { direction?: "en_vi" | "vi_en" }).direction ?? "en_vi";
    const questions: Question[] = items.map((item): Question => {
      const { hint: h, explain: e } = item as { hint?: string; explain?: string };
      return { ...sentenceQuestion(item), ...(h ? { hint: h } : {}), ...(e ? { explain: e } : {}) };
    });
    return { questions, maxScore: questions.length };
    function sentenceQuestion(item: (typeof items)[number]): QuestionBody {
      if (kind === "translate") {
        const i = item as { emoji?: string | null; sentence: string; answer: string; options: string[] };
        return {
          type: "choice",
          emoji: i.emoji ?? null,
          prompt: i.sentence,
          options: shuffle(i.options, rand),
          answer: i.answer,
          translate: direction,
        };
      }
      if (kind === "true_false") {
        const i = item as unknown as { emoji?: string | null; sentence: string; answer: boolean };
        return { type: "true_false", emoji: i.emoji ?? null, sentence: i.sentence, answer: i.answer };
      }
      if (kind === "fill_blank") {
        const i = item as unknown as {
          emoji?: string | null;
          sentence: string;
          answer: string;
          options: string[];
        };
        const [before, after] = splitBlank(i.sentence);
        return {
          type: "fill_blank",
          emoji: i.emoji ?? null,
          before,
          after,
          options: shuffle(i.options, rand),
          answer: i.answer,
        };
      }
      const i = item as unknown as { emoji?: string | null; sentence: string };
      const answer = i.sentence.trim().split(/\s+/);
      return { type: "rearrange", emoji: i.emoji ?? null, words: scramble(answer, rand), answer };
    }
  }

  // Word games: the activity may list words; otherwise use the whole topic.
  const parsed = wordContentSchema.safeParse(content);
  const wanted =
    parsed.success && parsed.data.words?.length ? parsed.data.words.map((w) => w.toLowerCase()) : null;
  // Meanings need no picture (D47): every word with a Vietnamese meaning can be matched.
  const all: Card[] = topicWords.filter((w) =>
    kind === "match_meaning" ? w.meaningVi.trim() : w.emoji || w.image,
  );
  const pool = wanted ? all.filter((w) => wanted.includes(w.word.toLowerCase())) : all;
  if (pool.length === 0) return { questions: [], maxScore: 0 };

  if (kind === "flashcards") {
    const questions: Question[] = shuffle(pool, rand)
      .slice(0, 12)
      .map((card) => ({ type: "flash", card }));
    return { questions, maxScore: questions.length };
  }
  if (kind === "match" || kind === "match_meaning") {
    const chosen = shuffle(pool, rand).slice(0, MATCH_WORDS);
    const questions: Question[] = groupPairs(chosen, MATCH_PAIRS).map((pairs) =>
      kind === "match_meaning" ? { type: "match", pairs, meaning: true } : { type: "match", pairs },
    );
    return { questions, maxScore: scoreOf(questions) };
  }
  if (kind === "listen_type") {
    const writable = pool.filter((w) => /^[a-z]{2,12}$/i.test(w.word));
    const questions: Question[] = atLeast(writable, rand).map((answer) => ({ type: "listen_type", answer }));
    return { questions, maxScore: questions.length };
  }
  if (kind === "spell") {
    const spellable = pool.filter((w) => /^[a-z]{2,10}$/i.test(w.word));
    const questions: Question[] = atLeast(spellable, rand).map((answer) => ({
      type: "spell",
      answer,
      letters: scramble(answer.word.toLowerCase().split(""), rand),
    }));
    return { questions, maxScore: questions.length };
  }
  const answers = atLeast(pool, rand);
  const questions: Question[] = answers.map((answer) => {
    const others = pickOthers(all, answer, 2, rand);
    if (kind === "listen_choose") {
      return { type: "listen_choose", answer, options: shuffle([answer, ...others], rand) };
    }
    return {
      type: "look_choose",
      answer,
      options: shuffle(
        [answer, ...others].map((c) => c.word),
        rand,
      ),
    };
  });
  return { questions, maxScore: questions.length };
}

/**
 * Up to ROUND_SIZE cards in random order; a short list (2–5 words) is
 * repeated to reach MIN_QUESTIONS, never the same word twice in a row.
 */
export function atLeast<T>(cards: readonly T[], rand: Rand = Math.random): T[] {
  const first = shuffle(cards, rand).slice(0, ROUND_SIZE);
  if (first.length >= MIN_QUESTIONS || first.length < 2) return first;
  const out = [...first];
  while (out.length < MIN_QUESTIONS) {
    let next = shuffle(first, rand);
    if (next[0] === out[out.length - 1]) next = [...next.slice(1), next[0]!];
    out.push(...next.slice(0, MIN_QUESTIONS - out.length));
  }
  return out;
}

/** Splits cards into screens of at most `size` pairs, as evenly as possible (10 → 4 + 3 + 3). */
export function groupPairs(cards: readonly Card[], size: number): Card[][] {
  if (cards.length < 2) return [];
  const groups = Math.ceil(cards.length / size);
  const base = Math.floor(cards.length / groups);
  const extra = cards.length % groups;
  const out: Card[][] = [];
  let at = 0;
  for (let g = 0; g < groups; g++) {
    const n = base + (g < extra ? 1 : 0);
    out.push(cards.slice(at, at + n));
    at += n;
  }
  return out;
}

/**
 * Wide screens show up to 6 pairs at once (C5): consecutive match questions
 * are merged and split again. The number of pairs, and so the score, stays.
 */
export function regroupMatches(questions: Question[], size: number): Question[] {
  const out: Question[] = [];
  let run: Extract<Question, { type: "match" }>[] = [];
  const flush = () => {
    if (run.length > 1) {
      for (const pairs of groupPairs(
        run.flatMap((q) => q.pairs),
        size,
      )) {
        out.push({
          type: "match",
          pairs,
          ...(run[0]!.meaning ? { meaning: true } : {}),
          ...(run[0]!.ctx !== undefined ? { ctx: run[0]!.ctx } : {}),
        });
      }
    } else out.push(...run);
    run = [];
  };
  for (const q of questions) {
    if (q.type === "match") {
      // Picture and meaning matches never share a screen.
      if (run.length && Boolean(run[0]!.meaning) !== Boolean(q.meaning)) flush();
      run.push(q);
    } else {
      flush();
      out.push(q);
    }
  }
  flush();
  return out;
}

export function splitBlank(sentence: string): [string, string] {
  const i = sentence.indexOf("___");
  if (i < 0) return [sentence, ""];
  return [sentence.slice(0, i), sentence.slice(i + 3)];
}

/** Compare a rearranged sentence ignoring case of the first word. */
export function sameSentence(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((w, i) => w.toLowerCase() === b[i]!.toLowerCase());
}

/** Typed answers: ignore case, surrounding spaces and doubled spaces. */
export function sameWord(typed: string, answer: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(typed) === norm(answer);
}

// ---------------------------------------------------- listen-and-write hints (D46) ---

/** Small deterministic hash so a word always gets the same tiles (same on server and browser). */
function seedOf(word: string): Rand {
  let h = 2166136261;
  for (const ch of word) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = (h >>> 0) % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * "c _ t": which letters are shown — the first, the last (from 3 letters)
 * and every third letter in between for long words. Spaces/hyphens always show.
 */
export function revealPattern(word: string): (string | null)[] {
  const chars = [...word];
  const last = chars.length - 1;
  return chars.map((ch, i) =>
    !/[a-z]/i.test(ch) || i === 0 || (i === last && chars.length >= 3) || (chars.length >= 7 && i % 3 === 0)
      ? ch
      : null,
  );
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Letter tiles for a word: its letters plus `extra` letters not in it, in a stable shuffled order. */
export function letterTiles(word: string, extra = 3): string[] {
  const letters = [...word.toLowerCase()].filter((c) => /[a-z]/.test(c));
  const rand = seedOf(word.toLowerCase());
  const others = shuffle(
    [...ALPHABET].filter((c) => !letters.includes(c)),
    rand,
  ).slice(0, extra);
  return shuffle([...letters, ...others], rand);
}

// ------------------------------------------------- full Yes/No answers (D48) ---

export type YesNoForm = { question: string; yes: string; no: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** The child answers about themselves: "my nose" → "your nose". */
const toYou = (s: string) =>
  s
    .replace(/\bmy\b/gi, "your")
    .replace(/\bI\b/g, "you")
    .replace(/\bme\b/gi, "you");

/**
 * Turns a picture statement into a question with full short answers:
 * "This is a dog." → "Is this a dog?" / "Yes, it is." / "No, it isn't.".
 * Covers the Starters/GS1 patterns; null when the sentence doesn't fit one
 * (the plain Yes/No buttons are used then).
 */
export function toYesNoQuestion(sentence: string): YesNoForm | null {
  const s = sentence.trim().replace(/\s+/g, " ").replace(/[.!]$/, "");
  if (!s || /\?$/.test(s) || /\b(not|n't)\b/i.test(s)) return null;
  const rules: [RegExp, (m: RegExpMatchArray) => YesNoForm][] = [
    [
      /^(this|that) is (.+)$/i,
      (m) => ({
        question: `Is ${m[1]!.toLowerCase()} ${toYou(m[2]!)}?`,
        yes: "Yes, it is.",
        no: "No, it isn't.",
      }),
    ],
    [
      /^it(?: is|'s) (.+)$/i,
      (m) => ({ question: `Is it ${toYou(m[1]!)}?`, yes: "Yes, it is.", no: "No, it isn't." }),
    ],
    [
      /^(these|those) are (.+)$/i,
      (m) => ({
        question: `Are ${m[1]!.toLowerCase()} ${toYou(m[2]!)}?`,
        yes: "Yes, they are.",
        no: "No, they aren't.",
      }),
    ],
    [
      /^(he|she) is (.+)$/i,
      (m) => {
        const p = m[1]!.toLowerCase();
        return { question: `Is ${p} ${toYou(m[2]!)}?`, yes: `Yes, ${p} is.`, no: `No, ${p} isn't.` };
      },
    ],
    [
      /^there is (.+)$/i,
      (m) => ({ question: `Is there ${m[1]}?`, yes: "Yes, there is.", no: "No, there isn't." }),
    ],
    [
      /^there are (.+)$/i,
      (m) => ({ question: `Are there ${m[1]}?`, yes: "Yes, there are.", no: "No, there aren't." }),
    ],
    [
      /^i can (.+)$/i,
      (m) => ({ question: `Can you ${toYou(m[1]!)}?`, yes: "Yes, I can.", no: "No, I can't." }),
    ],
    [
      /^i(?: have|'ve) got (.+)$/i,
      (m) => ({ question: `Have you got ${toYou(m[1]!)}?`, yes: "Yes, I have.", no: "No, I haven't." }),
    ],
    [
      /^i (?!am\b|was\b)([a-z]+) (.+)$/i,
      (m) => ({
        question: `Do you ${m[1]!.toLowerCase()} ${toYou(m[2]!)}?`,
        yes: "Yes, I do.",
        no: "No, I don't.",
      }),
    ],
    [
      /^((?:the|a|an|this|my|your) [a-z]+(?: [a-z]+)?) has got (.+)$/i,
      (m) => ({
        question: `Has ${toYou(m[1]!).replace(/^./, (c) => c.toLowerCase())} got ${m[2]}?`,
        yes: "Yes, it has.",
        no: "No, it hasn't.",
      }),
    ],
    [
      /^((?:the|my|your|a|an) [a-z]+(?: [a-z]+)?) can (.+)$/i,
      (m) => ({
        question: `Can ${toYou(m[1]!).replace(/^./, (c) => c.toLowerCase())} ${m[2]}?`,
        yes: "Yes, it can.",
        no: "No, it can't.",
      }),
    ],
    [
      /^((?:the|my|your) [a-z]+(?: [a-z]+)?) are (.+)$/i,
      (m) => ({
        question: `Are ${toYou(m[1]!).replace(/^./, (c) => c.toLowerCase())} ${m[2]}?`,
        yes: "Yes, they are.",
        no: "No, they aren't.",
      }),
    ],
    [
      /^((?:the|my|your) [a-z]+) is (.+)$/i,
      (m) => ({
        question: `Is ${toYou(m[1]!).replace(/^./, (c) => c.toLowerCase())} ${toYou(m[2]!)}?`,
        yes: "Yes, it is.",
        no: "No, it isn't.",
      }),
    ],
  ];
  for (const [re, make] of rules) {
    const m = s.match(re);
    if (m) {
      const f = make(m);
      return { ...f, question: cap(f.question) };
    }
  }
  return null;
}
