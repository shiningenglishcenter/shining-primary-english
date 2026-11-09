"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createLoginAccount, deleteLoginAccount, resolveUsername } from "@/features/people/accounts";
import {
  fieldErrorsOf,
  newTeacherSchema,
  updateTeacherSchema,
  usernameSchema,
  type FormState,
} from "@/features/people/schemas";

const SAVE_FAILED = "Không lưu được. Vui lòng thử lại.";
const emailSchema = z.email("Email không hợp lệ.").transform((v) => v.trim().toLowerCase());

/** Teachers always get a login: they sign in to assign and grade work. */
export async function createTeacher(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = newTeacherSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    loginType: formData.get("loginType"),
    username: formData.get("username") ?? undefined,
    email: formData.get("email") ?? undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;

  // Each account signs in with a username OR a real email, never both (D16).
  let username: string | undefined;
  let email: string | undefined;
  if (input.loginType === "username") {
    const u = usernameSchema.safeParse(input.username ?? "");
    if (!u.success) return { fieldErrors: { username: u.error.issues[0]!.message } };
    const free = await resolveUsername(u.data, false);
    if (!free) return { fieldErrors: { username: "Tên đăng nhập này đã có người dùng." } };
    username = free;
  } else {
    const e = emailSchema.safeParse((input.email ?? "").trim());
    if (!e.success) return { fieldErrors: { email: e.error.issues[0]!.message } };
    email = e.data;
  }

  const account = await createLoginAccount({
    role: "teacher",
    fullName: input.fullName,
    password: input.password,
    username,
    email,
  });
  if (!account.ok) return { error: account.error };

  const supabase = await createClient();
  const { data: teacher, error } = await supabase
    .from("teachers")
    .insert({ profile_id: account.userId, phone: input.phone })
    .select("id")
    .single();
  if (error || !teacher) {
    await deleteLoginAccount(account.userId);
    console.error("[teachers] insert failed", { code: error?.code });
    return { error: SAVE_FAILED };
  }

  return {
    ok: true,
    message: `Đã tạo giáo viên ${input.fullName}.`,
    href: `/admin/teachers/${teacher.id}`,
    credentials: { login: account.login, password: input.password, name: input.fullName },
  };
}

export async function updateTeacher(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = updateTeacherSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: teacher, error } = await supabase
    .from("teachers")
    .update({ phone: input.phone })
    .eq("id", input.id)
    .is("deleted_at", null)
    .select("profile_id")
    .maybeSingle();
  if (error || !teacher) return { error: SAVE_FAILED };

  const { error: nameError } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName })
    .eq("id", teacher.profile_id);
  if (nameError) return { error: SAVE_FAILED };
  refresh();
  return { ok: true, message: "Đã lưu thông tin giáo viên." };
}
