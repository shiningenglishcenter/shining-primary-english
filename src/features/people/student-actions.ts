"use server";

import { refresh } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createLoginAccount, deleteLoginAccount, resolveUsername } from "@/features/people/accounts";
import {
  createAccountForStudentSchema,
  fieldErrorsOf,
  newStudentSchema,
  passwordSchema,
  updateStudentSchema,
  usernameSchema,
  type FormState,
} from "@/features/people/schemas";

const SAVE_FAILED = "Không lưu được. Vui lòng thử lại.";

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = newStudentSchema.safeParse({
    fullName: formData.get("fullName"),
    englishName: formData.get("englishName"),
    schoolName: formData.get("schoolName"),
    schoolGrade: formData.get("schoolGrade"),
    classId: formData.get("classId"),
    createAccount: formData.get("createAccount"),
    username: formData.get("username") ?? undefined,
    password: formData.get("password") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;

  // Account fields are validated only when an account is requested.
  let username: string | null = null;
  let password: string | null = null;
  if (input.createAccount) {
    const u = usernameSchema.safeParse(input.username ?? "");
    const p = passwordSchema.safeParse(input.password ?? "");
    const fieldErrors: Record<string, string> = {};
    if (!u.success) fieldErrors.username = u.error.issues[0]!.message;
    if (!p.success) fieldErrors.password = p.error.issues[0]!.message;
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
    username = await resolveUsername(u.data!, true);
    if (!username) return { fieldErrors: { username: "Tên đăng nhập này đã có người dùng." } };
    password = p.data!;
  }

  let profileId: string | null = null;
  if (username && password) {
    const account = await createLoginAccount({
      role: "student",
      fullName: input.fullName,
      username,
      password,
    });
    if (!account.ok) return { error: account.error };
    profileId = account.userId;
  }

  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .insert({
      full_name: input.fullName,
      english_name: input.englishName,
      school_name: input.schoolName,
      school_grade: input.schoolGrade,
      profile_id: profileId,
    })
    .select("id, student_code")
    .single();
  if (error || !student) {
    if (profileId) await deleteLoginAccount(profileId);
    console.error("[students] insert failed", { code: error?.code });
    return { error: SAVE_FAILED };
  }

  if (input.classId) {
    const { error: enrolError } = await supabase.from("class_students").upsert({
      class_id: input.classId,
      student_id: student.id,
      enrolled_at: new Date().toISOString(),
      left_at: null,
    });
    if (enrolError) {
      return {
        ok: true,
        href: `/admin/students/${student.id}`,
        error: "Đã tạo học sinh nhưng chưa xếp được vào lớp. Hãy xếp lớp lại ở trang lớp học.",
        credentials: username && password ? { login: username, password, name: input.fullName } : undefined,
      };
    }
  }

  return {
    ok: true,
    message: `Đã tạo học sinh ${input.fullName} (mã ${student.student_code}).`,
    href: `/admin/students/${student.id}`,
    credentials: username && password ? { login: username, password, name: input.fullName } : undefined,
  };
}

export async function updateStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = updateStudentSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    englishName: formData.get("englishName"),
    schoolName: formData.get("schoolName"),
    schoolGrade: formData.get("schoolGrade"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .update({
      full_name: input.fullName,
      english_name: input.englishName,
      school_name: input.schoolName,
      school_grade: input.schoolGrade,
      status: input.status,
    })
    .eq("id", input.id)
    .is("deleted_at", null)
    .select("profile_id")
    .maybeSingle();
  if (error || !student) return { error: SAVE_FAILED };

  // Keep the name shown after login in step with the student record.
  if (student.profile_id) {
    await supabase.from("profiles").update({ full_name: input.fullName }).eq("id", student.profile_id);
  }
  refresh();
  return { ok: true, message: "Đã lưu thông tin học sinh." };
}

export async function createAccountForStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = createAccountForStudentSchema.safeParse({
    studentId: formData.get("studentId"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, profile_id")
    .eq("id", input.studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!student) return { error: "Không tìm thấy học sinh." };
  if (student.profile_id) return { error: "Học sinh này đã có tài khoản." };

  const username = await resolveUsername(input.username, false);
  if (!username) return { fieldErrors: { username: "Tên đăng nhập này đã có người dùng." } };

  const account = await createLoginAccount({
    role: "student",
    fullName: student.full_name as string,
    username,
    password: input.password,
  });
  if (!account.ok) return { error: account.error };

  const { error } = await supabase
    .from("students")
    .update({ profile_id: account.userId })
    .eq("id", student.id)
    .is("profile_id", null);
  if (error) {
    await deleteLoginAccount(account.userId);
    return { error: SAVE_FAILED };
  }
  // No refresh(): the page would swap this form for the account panel and the
  // one-time credentials card would disappear before the admin could read it.
  return {
    ok: true,
    credentials: { login: username, password: input.password, name: student.full_name as string },
  };
}
