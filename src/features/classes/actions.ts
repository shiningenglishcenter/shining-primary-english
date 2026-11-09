"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toAscii } from "@/features/people/credentials";
import {
  assignTeacherSchema,
  classFieldsSchema,
  classMemberSchema,
  enrolSchema,
  fieldErrorsOf,
  updateClassSchema,
  type FormState,
} from "@/features/people/schemas";

const SAVE_FAILED = "Không lưu được. Vui lòng thử lại.";
const CODE_TAKEN = "Mã lớp này đã được dùng cho lớp khác.";

/** "Movers A 2026" → "MOVERS-A-2026" */
function codeFromName(name: string): string {
  return (
    toAscii(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 24) || "LOP"
  );
}

async function freeClassCode(base: string): Promise<string> {
  const supabase = await createClient();
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const { count } = await supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .ilike("code", candidate)
      .is("deleted_at", null);
    if ((count ?? 0) === 0) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now() % 100_000}`;
}

export async function createClass(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = classFieldsSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") ?? undefined,
    levelId: formData.get("levelId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;

  const code = input.code ?? (await freeClassCode(codeFromName(input.name)));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({ name: input.name, code, primary_level_id: input.levelId })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { fieldErrors: { code: CODE_TAKEN } };
    return { error: SAVE_FAILED };
  }
  redirect(`/admin/classes/${data.id}`);
}

export async function updateClass(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = updateClassSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    code: formData.get("code") ?? undefined,
    levelId: formData.get("levelId") ?? "",
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;
  if (!input.code) return { fieldErrors: { code: "Nhập mã lớp." } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      name: input.name,
      code: input.code,
      primary_level_id: input.levelId,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .is("deleted_at", null);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { code: CODE_TAKEN } };
    return { error: SAVE_FAILED };
  }
  refresh();
  return { ok: true, message: "Đã lưu thông tin lớp." };
}

export async function enrolStudents(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = enrolSchema.safeParse({
    classId: formData.get("classId"),
    studentIds: formData.getAll("studentIds"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const now = new Date().toISOString();
  const supabase = await createClient();
  // Re-enrolling a student who left re-opens the row (left_at cleared).
  const { error } = await supabase.from("class_students").upsert(
    parsed.data.studentIds.map((studentId) => ({
      class_id: parsed.data.classId,
      student_id: studentId,
      enrolled_at: now,
      left_at: null,
    })),
  );
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: `Đã xếp ${parsed.data.studentIds.length} học sinh vào lớp.` };
}

/** The student leaves the class; the enrolment row stays for history. */
export async function removeStudentFromClass(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = classMemberSchema.safeParse({
    classId: formData.get("classId"),
    memberId: formData.get("memberId"),
  });
  if (!parsed.success) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_students")
    .update({ left_at: new Date().toISOString() })
    .eq("class_id", parsed.data.classId)
    .eq("student_id", parsed.data.memberId)
    .is("left_at", null);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: "Học sinh đã rời lớp." };
}

export async function assignTeacher(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = assignTeacherSchema.safeParse({
    classId: formData.get("classId"),
    teacherId: formData.get("teacherId") ?? "",
    role: formData.get("role"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("teacher_classes").upsert({
    class_id: parsed.data.classId,
    teacher_id: parsed.data.teacherId,
    role: parsed.data.role,
    assigned_at: new Date().toISOString(),
    unassigned_at: null,
  });
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: "Đã phân công giáo viên." };
}

export async function unassignTeacher(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = classMemberSchema.safeParse({
    classId: formData.get("classId"),
    memberId: formData.get("memberId"),
  });
  if (!parsed.success) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_classes")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("class_id", parsed.data.classId)
    .eq("teacher_id", parsed.data.memberId)
    .is("unassigned_at", null);
  if (error) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: "Đã gỡ giáo viên khỏi lớp." };
}
