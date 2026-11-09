"use server";

import { refresh } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLoginEmail, getManagedProfile, setPassword } from "@/features/people/accounts";
import {
  accountTargetSchema,
  fieldErrorsOf,
  resetPasswordSchema,
  type FormState,
} from "@/features/people/schemas";

/** Reset the password of a student or teacher account (never an admin's). */
export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = resetPasswordSchema.safeParse({
    profileId: formData.get("profileId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const profile = await getManagedProfile(parsed.data.profileId);
  if (!profile) return { error: "Không tìm thấy tài khoản." };

  const result = await setPassword(profile.id, parsed.data.password);
  if (!result.ok) return { error: result.error };
  return {
    ok: true,
    credentials: {
      login: profile.username ?? (await getLoginEmail(profile.id)) ?? "",
      password: parsed.data.password,
      name: profile.full_name,
    },
  };
}

/** Lock or unlock a student or teacher account. Audited by the database. */
export async function setAccountActive(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireRole("admin");
  const parsed = accountTargetSchema.safeParse({ profileId: formData.get("profileId") });
  const active = formData.get("active") === "true";
  if (!parsed.success) return { error: "Yêu cầu không hợp lệ." };

  const profile = await getManagedProfile(parsed.data.profileId);
  if (!profile || profile.id === me.id) return { error: "Không tìm thấy tài khoản." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", profile.id);
  if (error) return { error: "Không lưu được. Vui lòng thử lại." };
  refresh();
  return { ok: true, message: active ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản." };
}
