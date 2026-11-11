import { z } from "zod";
import { EMOJI_CODE_PATTERN } from "@/features/practice/emoji";

/**
 * Practice is organised Programme → Level → Topic/Unit → Activity (D26).
 * One shared theme for every level (D27); codes match `public.levels.code`.
 */
export const PROGRAMS = [
  { code: "cambridge", name: "Cambridge" },
  { code: "global_success", name: "Global Success" },
] as const;
export type Program = (typeof PROGRAMS)[number];
export type ProgramCode = Program["code"];

export const PRACTICE_LEVELS = [
  { code: "STARTERS", slug: "starters", name: "Starters", short: "Starters", program: "cambridge" },
  { code: "MOVERS", slug: "movers", name: "Movers", short: "Movers", program: "cambridge" },
  { code: "FLYERS", slug: "flyers", name: "Flyers", short: "Flyers", program: "cambridge" },
  { code: "GS1", slug: "g1", name: "Global Success 1", short: "G1", program: "global_success" },
  { code: "GS2", slug: "g2", name: "Global Success 2", short: "G2", program: "global_success" },
  { code: "GS3", slug: "g3", name: "Global Success 3", short: "G3", program: "global_success" },
  { code: "GS4", slug: "g4", name: "Global Success 4", short: "G4", program: "global_success" },
  { code: "GS5", slug: "g5", name: "Global Success 5", short: "G5", program: "global_success" },
] as const satisfies readonly {
  code: string;
  slug: string;
  name: string;
  short: string;
  program: ProgramCode;
}[];
export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];

export function levelsOf(program: ProgramCode): PracticeLevel[] {
  return PRACTICE_LEVELS.filter((l) => l.program === program);
}
export function programOf(level: PracticeLevel): Program {
  return PROGRAMS.find((p) => p.code === level.program) ?? PROGRAMS[0];
}
/** Global Success groups its topics as textbook units. */
export function topicNoun(level: PracticeLevel): string {
  return level.program === "global_success" ? "Unit" : "Chủ đề";
}

export function levelBySlug(slug: string | null | undefined): PracticeLevel {
  return PRACTICE_LEVELS.find((l) => l.slug === slug) ?? PRACTICE_LEVELS[0];
}
export function levelByCode(code: string | null | undefined): PracticeLevel | null {
  return PRACTICE_LEVELS.find((l) => l.code === code) ?? null;
}

export const PRACTICE_KINDS = [
  "flashcards",
  "listen_choose",
  "look_choose",
  "match",
  "spell",
  "true_false",
  "fill_blank",
  "rearrange",
  "listen_type",
  "listening",
  "reading",
  "mixed",
] as const;
export type PracticeKind = (typeof PRACTICE_KINDS)[number];

export const KIND_LABEL_VI: Record<PracticeKind, string> = {
  flashcards: "Thẻ từ",
  listen_choose: "Nghe và chọn hình",
  look_choose: "Nhìn hình chọn từ",
  match: "Nối từ với hình",
  spell: "Xếp chữ thành từ",
  true_false: "Đúng hay sai?",
  fill_blank: "Chọn từ điền vào câu",
  rearrange: "Sắp xếp thành câu",
  listen_type: "Nghe và viết từ",
  listening: "Nghe (video / audio)",
  reading: "Đọc hiểu",
  mixed: "Bài tổng hợp",
};

/** Kinds that carry a list of sentence items (`{ items: [...] }`). */
export const SENTENCE_KINDS = ["true_false", "fill_blank", "rearrange"] as const;
export type SentenceKind = (typeof SENTENCE_KINDS)[number];
export function isSentenceKind(kind: PracticeKind): kind is SentenceKind {
  return (SENTENCE_KINDS as readonly PracticeKind[]).includes(kind);
}

/** What a step of a "mixed" activity may be: anything but another mixed activity. */
export const STEP_KINDS = PRACTICE_KINDS.filter((k): k is Exclude<PracticeKind, "mixed"> => k !== "mixed");
export type StepKind = (typeof STEP_KINDS)[number];

/** Word games draw from the topic's vocabulary; sentence games carry items. */
export const WORD_KINDS: readonly PracticeKind[] = [
  "flashcards",
  "listen_choose",
  "look_choose",
  "match",
  "spell",
  "listen_type",
];

const emoji = z.string().regex(EMOJI_CODE_PATTERN).nullable().optional();
const sentence = z.string().trim().min(1).max(200);

export const wordContentSchema = z.object({
  words: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
});
export const trueFalseItemSchema = z.object({ emoji, sentence, answer: z.boolean() });
export const fillBlankItemSchema = z
  .object({
    emoji,
    sentence: sentence.refine((s) => s.includes("___"), "Câu phải có chỗ trống ___"),
    answer: z.string().trim().min(1).max(60),
    options: z.array(z.string().trim().min(1).max(60)).min(2).max(4),
  })
  .refine((i) => i.options.includes(i.answer), "Đáp án đúng phải nằm trong các lựa chọn");
export const rearrangeItemSchema = z.object({
  emoji,
  sentence: sentence.refine(
    (s) => s.trim().split(/\s+/).length >= 2 && s.trim().split(/\s+/).length <= 10,
    "Câu từ 2 đến 10 từ",
  ),
});

export const itemsSchemaByKind = {
  true_false: z.object({ items: z.array(trueFalseItemSchema).min(1).max(30) }),
  fill_blank: z.object({ items: z.array(fillBlankItemSchema).min(1).max(30) }),
  rearrange: z.object({ items: z.array(rearrangeItemSchema).min(1).max(30) }),
} as const;

// ------------------------------------------- listening / reading / mixed ---

/** A question about a passage or a recording: Yes/No, or pick one answer. */
export const quizItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tf"), emoji, sentence, answer: z.boolean() }),
  z
    .object({
      type: z.literal("mc"),
      emoji,
      question: sentence,
      answer: z.string().trim().min(1).max(80),
      options: z.array(z.string().trim().min(1).max(80)).min(2).max(4),
    })
    .refine((i) => i.options.includes(i.answer), "Đáp án đúng phải nằm trong các lựa chọn"),
]);
export type QuizItem = z.infer<typeof quizItemSchema>;
const quizItems = z.array(quizItemSchema).min(1, "Thêm ít nhất 1 câu hỏi").max(20);

export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
/** Teacher-uploaded audio lives in the private `learning-media` bucket. */
export const AUDIO_PATH = /^practice\/[0-9a-f-]{36}\.(mp3|m4a|wav)$/;
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const AUDIO_TYPES = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
} as const;

export const mediaSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("youtube"),
    videoId: z.string().regex(YOUTUBE_ID, "Link YouTube không hợp lệ"),
    start: z.number().int().min(0).max(36_000).optional(),
  }),
  z.object({
    source: z.literal("file"),
    path: z.string().regex(AUDIO_PATH),
    name: z.string().max(120).optional(),
  }),
]);
export type Media = z.infer<typeof mediaSchema>;

export const listeningContentSchema = z.object({
  media: mediaSchema,
  items: quizItems,
});
export const readingContentSchema = z.object({
  emoji,
  title: z.string().trim().max(80).optional(),
  passage: z.string().trim().min(20, "Đoạn văn quá ngắn").max(1500),
  items: quizItems,
});

/** Reads a YouTube video id (and start time) from a pasted link or a bare id. */
export function parseYouTube(input: string): { videoId: string; start?: number } | null {
  const raw = input.trim();
  if (YOUTUBE_ID.test(raw)) return { videoId: raw };
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    if (!id && m) id = m[1] ?? null;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  const t = url.searchParams.get("t") ?? url.searchParams.get("start");
  const start = t ? parseStart(t) : undefined;
  return start ? { videoId: id, start } : { videoId: id };
}

function parseStart(t: string): number | undefined {
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return undefined;
  const sec = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return sec > 0 ? Math.min(sec, 36_000) : undefined;
}

export const MIXED_MAX_STEPS = 6;

/**
 * Validates one activity's content for its kind. Used by the editor's save
 * action and (for each step) by "mixed". Word kinds accept an optional word list.
 */
export function contentSchemaFor(kind: PracticeKind): z.ZodType {
  if (WORD_KINDS.includes(kind)) return wordContentSchema;
  if (isSentenceKind(kind)) return itemsSchemaByKind[kind];
  if (kind === "listening") return listeningContentSchema;
  if (kind === "reading") return readingContentSchema;
  return mixedContentSchema;
}

const stepSchema = z
  .object({ kind: z.enum(STEP_KINDS), content: z.record(z.string(), z.unknown()) })
  .transform((step, ctx) => {
    const r = contentSchemaFor(step.kind).safeParse(step.content);
    if (!r.success) {
      const issue = r.error.issues[0];
      ctx.addIssue({ code: "custom", message: issue?.message ?? "Nội dung chưa đúng", path: issue?.path });
      return z.NEVER;
    }
    return { kind: step.kind, content: r.data as Record<string, unknown> };
  });

export const mixedContentSchema = z.object({
  steps: z.array(stepSchema).min(2, "Bài tổng hợp cần ít nhất 2 chặng").max(MIXED_MAX_STEPS),
});
export type MixedStep = { kind: StepKind; content: Record<string, unknown> };

/** Fresh content for a new activity of this kind. */
export function emptyContentFor(kind: PracticeKind): Record<string, unknown> {
  if (WORD_KINDS.includes(kind)) return {};
  if (kind === "mixed") return { steps: [] };
  return { items: [] };
}

export type TrueFalseItem = z.infer<typeof trueFalseItemSchema>;
export type FillBlankItem = z.infer<typeof fillBlankItemSchema>;
export type RearrangeItem = z.infer<typeof rearrangeItemSchema>;

export type VocabWord = { word: string; meaningVi: string; emoji: string | null };

/** Stars for one round: same thresholds as record_practice() in the database. */
export function starsFor(score: number, max: number): 0 | 1 | 2 | 3 {
  if (max <= 0) return 0;
  const r = score / max;
  if (r >= 0.9) return 3;
  if (r >= 0.7) return 2;
  if (r > 0) return 1;
  return 0;
}
