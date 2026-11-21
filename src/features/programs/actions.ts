"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LEVELS_TAG } from "@/features/practice/catalog";
import { fieldErrorsOf, type FormState } from "@/features/people/schemas";

const SAVE_FAILED = "Không lưu được. Vui lòng thử lại.";

const programSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{1,39}$/, "Mã: chữ thường không dấu, số, gạch dưới (vd. family_friends)."),
  name: z.string().trim().min(1, "Nhập tên chương trình.").max(80),
  topicNoun: z.enum(["topic", "unit"]),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  status: z.enum(["draft", "published"]),
});

/** Add or edit a programme (D55). Admins only (RLS too). */
export async function saveProgram(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { id, code, name, topicNoun, sortOrder, status } = parsed.data;
  const supabase = await createClient();
  const values = { code, name, topic_noun: topicNoun, sort_order: sortOrder, status };
  const { error } = id
    ? await supabase.from("programs").update(values).eq("id", id)
    : await supabase.from("programs").insert(values);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { code: "Mã này đã có." } };
    return { error: SAVE_FAILED };
  }
  updateTag(LEVELS_TAG);
  refresh();
  return { ok: true, message: id ? "Đã lưu chương trình." : `Đã thêm chương trình “${name}”.` };
}

const levelSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  programId: z.uuid(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,20}$/, "Mã: chữ in hoa không dấu và số (vd. FF1)."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Đường dẫn: chữ thường không dấu, số, gạch ngang (vd. ff1)."),
  name: z.string().trim().min(1, "Nhập tên trình độ.").max(120),
  short: z.string().trim().min(1, "Nhập tên ngắn.").max(20),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  status: z.enum(["draft", "published"]),
});

/** Add or edit a level of a programme (D55). */
export async function saveLevel(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = levelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { id, programId, code, slug, name, short, sortOrder, status } = parsed.data;
  const supabase = await createClient();
  const values = {
    code,
    slug,
    name,
    short_name: short,
    sort_order: sortOrder,
    status,
    program_id: programId,
  };
  const { error } = id
    ? await supabase.from("levels").update(values).eq("id", id)
    : await supabase.from("levels").insert({ ...values, program: "other" });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { code: "Mã hoặc đường dẫn này đã có." } };
    return { error: SAVE_FAILED };
  }
  updateTag(LEVELS_TAG);
  refresh();
  return { ok: true, message: id ? "Đã lưu trình độ." : `Đã thêm trình độ “${name}”.` };
}
