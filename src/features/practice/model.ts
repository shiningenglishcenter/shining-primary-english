import { z } from "zod";
import { EMOJI_CODE_PATTERN } from "@/features/practice/emoji";

/** Practice levels shown to students, each with its own theme (D23). */
export const PRACTICE_LEVELS = [
  { code: "STARTERS", slug: "starters", name: "Starters", theme: "theme-starters" },
  { code: "MOVERS", slug: "movers", name: "Movers", theme: "theme-movers" },
  { code: "FLYERS", slug: "flyers", name: "Flyers", theme: "theme-flyers" },
] as const;
export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];

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
