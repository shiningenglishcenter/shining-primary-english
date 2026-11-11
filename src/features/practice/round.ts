import {
  isSentenceKind,
  itemsSchemaByKind,
  listeningContentSchema,
  mixedContentSchema,
  readingContentSchema,
  wordContentSchema,
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

export type Card = { word: string; meaningVi: string; emoji: string | null };

type QuestionBody =
  | { type: "flash"; card: Card }
  | { type: "listen_choose"; answer: Card; options: Card[] }
  | { type: "look_choose"; answer: Card; options: string[] }
  | { type: "match"; pairs: Card[] }
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
  | { type: "choice"; emoji: string | null; prompt: string; options: string[]; answer: string };

/**
 * A question; `ctx` points into `Round.contexts` when it is about a passage
 * or a recording, which the player keeps on screen above the question.
 */
export type Question = QuestionBody & { ctx?: number };

/** Server-side context: an audio file is still a storage path here. */
export type RoundContext =
  | { type: "listening"; media: Media }
  | { type: "reading"; emoji: string | null; title: string | null; passage: string };

/** What the player receives: files resolved to short-lived URLs. */
export type PlayerContext =
  | { type: "listening"; youtube: { videoId: string; start: number } | null; audioUrl: string | null }
  | { type: "reading"; emoji: string | null; title: string | null; passage: string };

export type Round = { questions: Question[]; maxScore: number; contexts: RoundContext[] };

export const ROUND_SIZE = 8;
/** Questions taken from each step of a "mixed" activity. */
export const MIXED_STEP_SIZE = 3;
const MATCH_PAIRS = 4;

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

function scoreOf(questions: Question[]): number {
  return questions.reduce((n, q) => n + (q.type === "match" ? q.pairs.length : 1), 0);
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
      emoji?: string | null;
      title?: string;
      passage?: string;
      items: QuizItem[];
    };
    const context: RoundContext =
      kind === "listening"
        ? { type: "listening", media: data.media! }
        : { type: "reading", emoji: data.emoji ?? null, title: data.title || null, passage: data.passage! };
    // Questions follow the recording / passage, so keep the teacher's order.
    const questions: Question[] = data.items.map((item) => ({ ...quizQuestion(item, rand), ctx: 0 }));
    return { questions, maxScore: questions.length, contexts: [context] };
  }
  return { ...buildSimple(kind, content, topicWords, rand), contexts: [] };
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
    const items = shuffle(parsed.data.items, rand).slice(0, ROUND_SIZE);
    const questions: Question[] = items.map((item) => {
      if (kind === "true_false") {
        const i = item as { emoji?: string | null; sentence: string; answer: boolean };
        return { type: "true_false", emoji: i.emoji ?? null, sentence: i.sentence, answer: i.answer };
      }
      if (kind === "fill_blank") {
        const i = item as { emoji?: string | null; sentence: string; answer: string; options: string[] };
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
      const i = item as { emoji?: string | null; sentence: string };
      const answer = i.sentence.trim().split(/\s+/);
      return { type: "rearrange", emoji: i.emoji ?? null, words: scramble(answer, rand), answer };
    });
    return { questions, maxScore: questions.length };
  }

  // Word games: the activity may list words; otherwise use the whole topic.
  const parsed = wordContentSchema.safeParse(content);
  const wanted =
    parsed.success && parsed.data.words?.length ? parsed.data.words.map((w) => w.toLowerCase()) : null;
  const all: Card[] = topicWords.filter((w) => w.emoji);
  const pool = wanted ? all.filter((w) => wanted.includes(w.word.toLowerCase())) : all;
  if (pool.length === 0) return { questions: [], maxScore: 0 };

  if (kind === "flashcards") {
    const questions: Question[] = shuffle(pool, rand)
      .slice(0, 12)
      .map((card) => ({ type: "flash", card }));
    return { questions, maxScore: questions.length };
  }
  if (kind === "match") {
    const chosen = shuffle(pool, rand).slice(0, MATCH_PAIRS * 2);
    // Split evenly (5 words → 3 + 2, never a lonely single pair).
    const groups = Math.ceil(chosen.length / MATCH_PAIRS);
    const size = Math.ceil(chosen.length / groups);
    const questions: Question[] = [];
    for (let i = 0; i < chosen.length; i += size) {
      const pairs = chosen.slice(i, i + size);
      if (pairs.length >= 2) questions.push({ type: "match", pairs });
    }
    return { questions, maxScore: scoreOf(questions) };
  }
  if (kind === "listen_type") {
    const writable = pool.filter((w) => /^[a-z]{2,12}$/i.test(w.word));
    const questions: Question[] = shuffle(writable, rand)
      .slice(0, ROUND_SIZE)
      .map((answer) => ({ type: "listen_type", answer }));
    return { questions, maxScore: questions.length };
  }
  if (kind === "spell") {
    const spellable = pool.filter((w) => /^[a-z]{2,10}$/i.test(w.word));
    const questions: Question[] = shuffle(spellable, rand)
      .slice(0, ROUND_SIZE)
      .map((answer) => ({
        type: "spell",
        answer,
        letters: scramble(answer.word.toLowerCase().split(""), rand),
      }));
    return { questions, maxScore: questions.length };
  }
  const answers = shuffle(pool, rand).slice(0, ROUND_SIZE);
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
