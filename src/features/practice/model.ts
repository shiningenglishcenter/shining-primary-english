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
};

/** Word games draw from the topic's vocabulary; sentence games carry items. */
export const WORD_KINDS: readonly PracticeKind[] = [
  "flashcards",
  "listen_choose",
  "look_choose",
  "match",
  "spell",
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
