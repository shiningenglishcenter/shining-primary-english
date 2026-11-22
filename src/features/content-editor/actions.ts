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
  QUICK_WORD_KINDS,
  QUICK_MIN_WORDS,
  levelByCode,
  PRACTICE_KINDS,
  KIND_LABEL_VI,
  settingsOf,
  WRITE_HINTS,
  type PlaySettings,
  type PracticeKind,
} from "@/features/practice/model";
import { fieldErrorsOf, type FormState } from "@/features/people/schemas";
import { getLevelCatalog } from "@/features/practice/catalog";
import { IPA } from "../../../content/ipa.mts";

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
  const level = levelByCode(String(formData.get("levelCode") ?? ""), await getLevelCatalog());
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

/**
 * Sentence patterns (D51), one per line: "English | Tiếng Việt". At most 10;
 * blank lines are ignored.
 */
const patternsField = z
  .string()
  .max(4000)
  .transform((text, ctx) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 10) {
      ctx.addIssue({ code: "custom", message: "Tối đa 10 mẫu câu." });
      return z.NEVER;
    }
    return lines.map((l) => {
      const [en, ...vi] = l.split("|");
      return { en: en!.trim().slice(0, 200), vi: vi.join("|").trim().slice(0, 200) };
    });
  })
  .refine((ps) => ps.every((p) => p.en), "Mỗi dòng cần có câu tiếng Anh trước dấu |.");

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
  // Patterns have their own tab (D56); older forms still send them here.
  const hasPatterns = formData.has("patterns");
  const patterns = patternsField.safeParse(String(formData.get("patterns") ?? ""));
  if (!id.success) return { error: "Yêu cầu không hợp lệ." };
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (!patterns.success) return { fieldErrors: { patterns: patterns.error.issues[0]?.message ?? "" } };
  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({
      title_en: parsed.data.titleEn,
      title_vi: parsed.data.titleVi,
      emoji: parsed.data.emoji,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
      ...(hasPatterns ? { patterns: patterns.data } : {}),
    })
    .eq("id", id.data)
    .is("deleted_at", null);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: "Đã lưu chủ đề." };
}

/** Toolbar "Thao tác" on the topic list: publish, draft or delete several topics. */
export async function bulkTopics(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const ids = z.array(z.uuid()).min(1).max(200).safeParse(formData.getAll("ids"));
  const op = z.enum(["publish", "draft", "delete"]).safeParse(formData.get("op"));
  if (!ids.success) return { error: "Chọn ít nhất một chủ đề." };
  if (!op.success) return { error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const patch =
    op.data === "delete"
      ? { deleted_at: new Date().toISOString() }
      : { status: op.data === "publish" ? "published" : "draft" };
  const { error, count } = await supabase
    .from("topics")
    .update(patch, { count: "exact" })
    .in("id", ids.data)
    .is("deleted_at", null);
  if (error) return { error: SAVE_FAILED };
  refresh();
  const what = { publish: "xuất bản", draft: "chuyển về nháp", delete: "xoá" }[op.data];
  return { ok: true, message: `Đã ${what} ${count ?? ids.data.length} chủ đề.` };
}

// ------------------------------------------------------------- vocabulary ---

const wordSchema = z.object({
  topicId: z.uuid(),
  id: z.union([z.uuid(), z.literal("")]).optional(),
  word: z.string().trim().min(1, "Nhập từ.").max(80),
  meaningVi: z.string().trim().min(1, "Nhập nghĩa.").max(300),
  emoji: emojiField,
  /** British IPA (D53), without slashes; "" = none. */
  ipa: z
    .string()
    .trim()
    .max(80, "Phiên âm tối đa 80 ký tự.")
    .transform((v) => v.replace(/^\/+|\/+$/g, "").trim() || null),
  /** Uploaded picture (A1): "" = none; uploads go to practice/images/ from the browser. */
  imagePath: z
    .string()
    .trim()
    .refine((v) => v === "" || /^practice\/images\/[0-9a-f-]{36}\.(webp|jpg)$/.test(v), "Ảnh không hợp lệ.")
    .transform((v) => v || null),
});

export async function saveWord(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const parsed = wordSchema.safeParse({
    topicId: formData.get("topicId"),
    id: formData.get("id") ?? "",
    word: formData.get("word"),
    meaningVi: formData.get("meaningVi"),
    emoji: formData.get("emoji") ?? "",
    imagePath: formData.get("imagePath") ?? "",
    ipa: formData.get("ipa") ?? "",
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

  // A new, known word gets its British IPA when the teacher left it empty (D53).
  const values = {
    word: w.word,
    meaning_vi: w.meaningVi,
    emoji: w.emoji,
    image_path: w.imagePath,
    ipa: w.ipa ?? (!w.id ? (IPA[w.word.toLowerCase()] ?? null) : null),
  };
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

/**
 * A2 (D40): one click turns the topic's word list into draft word games
 * (flashcards, look/listen and choose, match, spell). Empty content = "use
 * every topic word with a picture", so words added later join in. Kinds the
 * topic already has are skipped.
 */
export async function quickCreateWordActivities(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await staff();
  const topicId = z.uuid().safeParse(formData.get("topicId"));
  if (!topicId.success) return { error: SAVE_FAILED };
  const supabase = await createClient();
  const [words, existing] = await Promise.all([
    supabase
      .from("vocabulary")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topicId.data)
      .or("emoji.not.is.null,image_path.not.is.null")
      .is("deleted_at", null),
    supabase
      .from("practice_activities")
      .select("kind, sort_order")
      .eq("topic_id", topicId.data)
      .is("deleted_at", null),
  ]);
  if (words.error || existing.error) return { error: SAVE_FAILED };
  if ((words.count ?? 0) < QUICK_MIN_WORDS) {
    return { error: `Cần ít nhất ${QUICK_MIN_WORDS} từ có hình để tạo bài.` };
  }
  const have = new Set((existing.data ?? []).map((a) => a.kind as string));
  const todo = QUICK_WORD_KINDS.filter((k) => !have.has(k));
  if (todo.length === 0) return { ok: true, message: "Chủ đề đã có đủ các dạng bài từ vựng." };
  const start = Math.max(0, ...(existing.data ?? []).map((a) => (a.sort_order as number) ?? 0));
  const { error } = await supabase.from("practice_activities").insert(
    todo.map((kind, i) => ({
      topic_id: topicId.data,
      kind,
      title_en: defaultTitleEn(kind),
      title_vi: KIND_LABEL_VI[kind],
      sort_order: start + (i + 1) * 10,
      status: "draft",
      content: emptyContentFor(kind),
      created_by: me.id,
    })),
  );
  if (error) return { error: SAVE_FAILED };
  refresh();
  const skipped = QUICK_WORD_KINDS.length - todo.length;
  return {
    ok: true,
    message: `Đã tạo ${todo.length} bài nháp${skipped ? ` (bỏ qua ${skipped} dạng đã có)` : ""}. Mở từng bài để xem lại rồi xuất bản.`,
  };
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
    match_meaning: "Match the meanings",
    translate: "What does it mean?",
  }[kind];
}

const activitySchema = z.object({
  id: z.uuid(),
  titleEn: z.string().trim().min(1, "Nhập tên tiếng Anh.").max(80),
  titleVi: z.string().trim().min(1, "Nhập tên tiếng Việt.").max(120),
  status: z.enum(STATUSES),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  content: z.string().max(60_000),
  hints: z.enum(["on", "off"]),
  explain: z.enum(["on", "off"]),
  ipa: z.enum(["on", "off"]),
  maxTries: z.coerce.number().int().min(1).max(5),
  writeHint: z.enum(WRITE_HINTS),
  yesNo: z.enum(["short", "full"]),
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
    hints: formData.get("hints") === "on" ? "on" : "off",
    explain: formData.get("explain") === "on" ? "on" : "off",
    ipa: formData.get("ipa") === "on" ? "on" : "off",
    maxTries: formData.get("maxTries") || 3,
    writeHint: formData.get("writeHint") || "slots",
    yesNo: formData.get("yesNo") === "full" ? "full" : "short",
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
      settings: {
        hints: parsed.data.hints === "on",
        explain: parsed.data.explain === "on",
        ipa: parsed.data.ipa === "on",
        maxTries: parsed.data.maxTries,
        writeHint: parsed.data.writeHint,
        yesNo: parsed.data.yesNo,
      },
    })
    .eq("id", parsed.data.id);
  if (error) return { error: SAVE_FAILED };
  // The draft is now what pupils get (D59); before migration 0034 there is none.
  await supabase.from("activity_drafts").delete().eq("activity_id", parsed.data.id);
  refresh();
  return {
    ok: true,
    message: parsed.data.status === "published" ? "Đã lưu và xuất bản." : "Đã lưu bản nháp.",
  };
}

const draftInput = z.object({
  id: z.uuid(),
  titleEn: z.string().max(80),
  titleVi: z.string().max(120),
  content: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()),
});

/**
 * Autosave of the activity editor (D59): the teacher's changes, valid or
 * not yet, kept apart from what pupils play. Only the preview shows them.
 */
export async function saveActivityDraft(
  input: z.input<typeof draftInput>,
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  await staff();
  const parsed = draftInput.safeParse(input);
  if (!parsed.success || JSON.stringify(parsed.data.content).length > 60_000) {
    return { ok: false, error: "Nội dung quá dài để lưu." };
  }
  const supabase = await createClient();
  const savedAt = new Date().toISOString();
  const { error } = await supabase.from("activity_drafts").upsert({
    activity_id: parsed.data.id,
    title_en: parsed.data.titleEn,
    title_vi: parsed.data.titleVi,
    content: parsed.data.content,
    settings: settingsOf(parsed.data.settings),
    updated_at: savedAt,
  });
  if (error) return { ok: false, error: "Chưa tự lưu được, thử lại sau." };
  return { ok: true, savedAt };
}

/** "Huỷ thay đổi": back to the version pupils play, returned for the editor. */
export async function discardActivityDraft(id: string): Promise<
  | {
      ok: true;
      live: { titleEn: string; titleVi: string; content: Record<string, unknown>; settings: PlaySettings };
    }
  | { ok: false }
> {
  await staff();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("activity_drafts").delete().eq("activity_id", parsed.data);
  const { data } = await supabase
    .from("practice_activities")
    .select("title_en, title_vi, content, settings")
    .eq("id", parsed.data)
    .maybeSingle();
  refresh();
  if (error || !data) return { ok: false };
  return {
    ok: true,
    live: {
      titleEn: data.title_en as string,
      titleVi: data.title_vi as string,
      content: (data.content ?? {}) as Record<string, unknown>,
      settings: settingsOf(data.settings),
    },
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

// ------------------------------------------------------- topic page (D56) ---

const patternRows = z
  .array(z.object({ en: z.string().trim().max(200), vi: z.string().trim().max(200) }))
  .max(10, "Tối đa 10 mẫu câu.");

/** Patterns tab: the topic's sentence patterns as rows ({ en, vi }). */
export async function savePatterns(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const id = z.uuid().safeParse(formData.get("topicId"));
  let rows: unknown = null;
  try {
    rows = JSON.parse(String(formData.get("patterns") ?? "[]"));
  } catch {
    /* invalid */
  }
  const parsed = patternRows.safeParse(rows);
  if (!id.success || !parsed.success) {
    return { error: parsed.error?.issues[0]?.message ?? "Yêu cầu không hợp lệ." };
  }
  const patterns = parsed.data.filter((p) => p.en);
  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ patterns })
    .eq("id", id.data)
    .is("deleted_at", null);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: `Đã lưu ${patterns.length} mẫu câu.` };
}

/** Header status switch on the topic page. */
export async function setTopicStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const id = z.uuid().safeParse(formData.get("topicId"));
  const status = z.enum(STATUSES).safeParse(formData.get("status"));
  if (!id.success || !status.success) return { error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.from("topics").update({ status: status.data }).eq("id", id.data);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: status.data === "published" ? "Đã xuất bản." : "Đã chuyển về nháp." };
}

/**
 * "Nhập nhiều từ một lúc": one word per line, "word | nghĩa" (optionally
 * "| 🐈"; a tab works too). Known words get their IPA; words already in the
 * level are skipped.
 */
export async function bulkAddWords(_prev: FormState, formData: FormData): Promise<FormState> {
  await staff();
  const topicId = z.uuid().safeParse(formData.get("topicId"));
  if (!topicId.success) return { error: "Yêu cầu không hợp lệ." };
  const lines = String(formData.get("lines") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "Dán mỗi dòng một từ: cat | con mèo" };
  if (lines.length > 100) return { error: "Tối đa 100 từ mỗi lần." };
  const bad: number[] = [];
  const rows = lines.flatMap((l, i) => {
    const [word = "", meaning = "", pic = ""] = l.split(/\s*[|\t]\s*/);
    const emoji = pic ? emojiField.safeParse(pic) : null;
    if (!word || !meaning || word.length > 80 || meaning.length > 300 || (emoji && !emoji.success)) {
      bad.push(i + 1);
      return [];
    }
    return [{ word, meaning, emoji: emoji?.success ? emoji.data : null }];
  });
  if (bad.length) return { error: `Dòng ${bad.slice(0, 5).join(", ")} chưa đúng dạng “từ | nghĩa”.` };
  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("topics")
    .select("id, level_id, code")
    .eq("id", topicId.data)
    .is("deleted_at", null)
    .maybeSingle();
  if (!topic) return { error: "Không tìm thấy chủ đề." };
  let added = 0;
  const skipped: string[] = [];
  for (const r of rows) {
    const { error } = await supabase.from("vocabulary").insert({
      word: r.word,
      meaning_vi: r.meaning,
      emoji: r.emoji,
      ipa: IPA[r.word.toLowerCase()] ?? null,
      level_id: topic.level_id,
      topic_id: topic.id,
      topic: topic.code,
      part_of_speech: "noun",
      status: "published",
    });
    if (!error) added++;
    else if (error.code === "23505") skipped.push(r.word);
    else return { error: SAVE_FAILED };
  }
  refresh();
  const skip = skipped.length
    ? `; bỏ qua ${skipped.length} từ đã có (${skipped.slice(0, 5).join(", ")})`
    : "";
  return { ok: true, message: `Đã thêm ${added} từ${skip}. Từ chưa có hình: bấm Sửa để chọn hình.` };
}

/** Drag/arrow reorder on the activities tab: every activity id of the topic, in the new order. */
export async function reorderActivities(topicId: string, ids: string[]): Promise<{ ok: boolean }> {
  await staff();
  const t = z.uuid().safeParse(topicId);
  const list = z.array(z.uuid()).max(200).safeParse(ids);
  if (!t.success || !list.success) return { ok: false };
  const supabase = await createClient();
  const results = await Promise.all(
    list.data.map((id, i) =>
      supabase
        .from("practice_activities")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", id)
        .eq("topic_id", t.data),
    ),
  );
  refresh();
  return { ok: results.every((r) => !r.error) };
}
