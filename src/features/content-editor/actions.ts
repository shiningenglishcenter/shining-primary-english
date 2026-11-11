"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EMOJI_CODE_PATTERN, emojiToCode } from "@/features/practice/emoji";
import {
  contentSchemaFor,
  emptyContentFor,
  levelByCode,
  PRACTICE_KINDS,
  KIND_LABEL_VI,
  type PracticeKind,
} from "@/features/practice/model";
import { fieldErrorsOf, type FormState } from "@/features/people/schemas";

/**
 * Practice content editing for admins AND teachers (owner decision,
 * ARCHITECTURE D23). RLS (`*_staff_all`) is the authority; every action also
 * checks the role first.
 */

const SAVE_FAILED = "Không lưu được. Vui lòng thử lại.";
const STATUSES = ["draft", "published"] as const;
const BASES = ["/admin/content", "/teacher/content"] as const;

async function staff() {
  return requireRole("admin", "teacher");
}

function baseOf(formData: FormData): (typeof BASES)[number] {
  const b = formData.get("base");
  return BASES.find((x) => x === b) ?? "/teacher/content";
}

/** Accepts a pasted emoji ("🐈") or a code ("1f408"); "" = none. */
const emojiField = z
  .string()
  .trim()
  .max(40)
  .transform((v, ctx) => {
    if (!v) return null;
    const code = EMOJI_CODE_PATTERN.test(v.toLowerCase()) ? v.toLowerCase() : emojiToCode(v);
    if (!EMOJI_CODE_PATTERN.test(code)) {
      ctx.addIssue({ code: "custom", message: "Hãy dán một emoji, ví dụ 🐈" });
      return z.NEVER;
    }
    return code;
  });

const topicSchema = z.object({
  titleEn: z.string().trim().min(1, "Nhập tên tiếng Anh.").max(80),
  titleVi: z.string().trim().min(1, "Nhập tên tiếng Việt.").max(80),
  emoji: emojiField,
  status: z.enum(STATUSES),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
});

function codeFrom(title: string): string {
  return (
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "topic"
  );
}

export async function createTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const level = levelByCode(String(formData.get("levelCode") ?? ""));
  const parsed = topicSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleVi: formData.get("titleVi"),
    emoji: formData.get("emoji") ?? "",
    status: "draft",
    sortOrder: formData.get("sortOrder") || 999,
  });
  if (!level) return { error: "Trình độ không hợp lệ." };
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data: lvl } = await supabase
    .from("levels")
    .select("id")
    .eq("code", level.code)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lvl) return { error: SAVE_FAILED };
  const base = codeFrom(parsed.data.titleEn);
  let created: { id: string } | null = null;
  for (let i = 1; i < 20 && !created; i++) {
    const { data, error } = await supabase
      .from("topics")
      .insert({
        level_id: lvl.id,
        code: i === 1 ? base : `${base}-${i}`,
        title_en: parsed.data.titleEn,
        title_vi: parsed.data.titleVi,
        emoji: parsed.data.emoji,
        sort_order: parsed.data.sortOrder,
        status: "draft",
      })
      .select("id")
      .single();
    if (data) created = data as { id: string };
    else if (error?.code !== "23505") return { error: SAVE_FAILED };
  }
  if (!created) return { error: SAVE_FAILED };
  redirect(`${baseOf(formData)}/topics/${created.id}`);
}

export async function updateTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = topicSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleVi: formData.get("titleVi"),
    emoji: formData.get("emoji") ?? "",
    status: formData.get("status"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!id.success) return { error: "Yêu cầu không hợp lệ." };
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({
      title_en: parsed.data.titleEn,
      title_vi: parsed.data.titleVi,
      emoji: parsed.data.emoji,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", id.data)
    .is("deleted_at", null);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: "Đã lưu chủ đề." };
}

// ------------------------------------------------------------- vocabulary ---

const wordSchema = z.object({
  topicId: z.uuid(),
  id: z.union([z.uuid(), z.literal("")]).optional(),
  word: z.string().trim().min(1, "Nhập từ.").max(80),
  meaningVi: z.string().trim().min(1, "Nhập nghĩa.").max(300),
  emoji: emojiField,
});

export async function saveWord(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const parsed = wordSchema.safeParse({
    topicId: formData.get("topicId"),
    id: formData.get("id") ?? "",
    word: formData.get("word"),
    meaningVi: formData.get("meaningVi"),
    emoji: formData.get("emoji") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const w = parsed.data;
  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("topics")
    .select("id, level_id, code")
    .eq("id", w.topicId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!topic) return { error: "Không tìm thấy chủ đề." };

  const values = { word: w.word, meaning_vi: w.meaningVi, emoji: w.emoji };
  const { error } = w.id
    ? await supabase.from("vocabulary").update(values).eq("id", w.id).eq("topic_id", w.topicId)
    : await supabase.from("vocabulary").insert({
        ...values,
        level_id: topic.level_id,
        topic_id: topic.id,
        topic: topic.code,
        part_of_speech: "noun",
        status: "published",
      });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { word: "Từ này đã có ở trình độ này." } };
    return { error: SAVE_FAILED };
  }
  refresh();
  return { ok: true, message: w.id ? "Đã lưu từ." : `Đã thêm “${w.word}”.` };
}

export async function deleteWord(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vocabulary")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------- activities ---

export async function createActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await staff();
  const topicId = z.uuid().safeParse(formData.get("topicId"));
  const kind = z.enum(PRACTICE_KINDS).safeParse(formData.get("kind"));
  if (!topicId.success || !kind.success) return { fieldErrors: { kind: "Chọn dạng bài." } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_activities")
    .insert({
      topic_id: topicId.data,
      kind: kind.data,
      title_en: defaultTitleEn(kind.data),
      title_vi: KIND_LABEL_VI[kind.data],
      sort_order: 999,
      status: "draft",
      content: emptyContentFor(kind.data),
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: SAVE_FAILED };
  redirect(`${baseOf(formData)}/activities/${data.id}`);
}

function isEmptyContent(content: unknown): boolean {
  if (!content || typeof content !== "object") return true;
  const c = content as { items?: unknown[]; steps?: unknown[] };
  return Object.keys(c).length === 0 || c.items?.length === 0 || c.steps?.length === 0;
}

/** "Chặng 2 · Câu 3: …" from a zod issue path such as ["steps", 1, "content", "items", 2, …]. */
function describeIssue(issue: z.core.$ZodIssue | undefined): string {
  if (!issue) return "Nội dung chưa đúng.";
  const parts: string[] = [];
  const path = issue.path;
  for (let i = 0; i < path.length - 1; i++) {
    const n = path[i + 1];
    if (typeof n !== "number") continue;
    if (path[i] === "steps") parts.push(`Chặng ${n + 1}`);
    if (path[i] === "items") parts.push(`Câu ${n + 1}`);
  }
  if (path[0] === "media") parts.push("Phần nghe");
  if (path[0] === "passage") parts.push("Đoạn văn");
  return `${parts.length ? `${parts.join(" · ")}: ` : ""}${issue.message}`;
}

function defaultTitleEn(kind: PracticeKind): string {
  return {
    flashcards: "Flashcards",
    listen_choose: "Listen and choose",
    look_choose: "Look and choose",
    match: "Match",
    spell: "Look and spell",
    true_false: "Yes or no?",
    fill_blank: "Complete the sentence",
    rearrange: "Make a sentence",
    listen_type: "Listen and write",
    listening: "Listen and answer",
    reading: "Read and answer",
    mixed: "Skills challenge",
  }[kind];
}

const activitySchema = z.object({
  id: z.uuid(),
  titleEn: z.string().trim().min(1, "Nhập tên tiếng Anh.").max(80),
  titleVi: z.string().trim().min(1, "Nhập tên tiếng Việt.").max(120),
  status: z.enum(STATUSES),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  content: z.string().max(60_000),
});

/** `content` arrives as JSON built by the editor; validated per kind here. */
export async function updateActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const parsed = activitySchema.safeParse({
    id: formData.get("id"),
    titleEn: formData.get("titleEn"),
    titleVi: formData.get("titleVi"),
    status: formData.get("status"),
    sortOrder: formData.get("sortOrder") || 0,
    content: formData.get("content") ?? "{}",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("practice_activities")
    .select("kind")
    .eq("id", parsed.data.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return { error: "Không tìm thấy bài." };
  const kind = row.kind as PracticeKind;

  let content: unknown;
  try {
    content = JSON.parse(parsed.data.content);
  } catch {
    return { error: "Nội dung bài không hợp lệ." };
  }
  const check = contentSchemaFor(kind).safeParse(content);
  if (check.success) {
    content = check.data;
  } else if (parsed.data.status === "published" || !isEmptyContent(content)) {
    // An untouched draft may be saved empty; anything else must be valid.
    return { error: describeIssue(check.error.issues[0]) };
  } else {
    content = emptyContentFor(kind);
  }

  const { error } = await supabase
    .from("practice_activities")
    .update({
      title_en: parsed.data.titleEn,
      title_vi: parsed.data.titleVi,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
      content,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return {
    ok: true,
    message: parsed.data.status === "published" ? "Đã lưu và xuất bản." : "Đã lưu bản nháp.",
  };
}

export async function deleteActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const id = z.uuid().safeParse(formData.get("id"));
  const topicId = z.uuid().safeParse(formData.get("topicId"));
  if (!id.success || !topicId.success) return { error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_activities")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data);
  if (error) return { error: SAVE_FAILED };
  redirect(`${baseOf(formData)}/topics/${topicId.data}`);
}
