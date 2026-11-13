import "server-only";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/auth/identifier";
import { nextUsernameCandidate } from "@/features/people/credentials";

/**
 * Login accounts (Supabase Auth) for students and teachers. Every function here
 * must only be called from a Server Action that has already run
 * `requireRole("admin")`. The service-role client is used ONLY for the Auth
 * Admin API; table reads and writes go through the admin's own session so RLS
 * and the audit triggers apply (ARCHITECTURE D2).
 */

type ManagedRole = "student" | "teacher";

export type AccountResult = { ok: true; userId: string; login: string } | { ok: false; error: string };

const MESSAGES = {
  taken: "Tên đăng nhập hoặc email này đã có người dùng.",
  weak: "Mật khẩu quá yếu. Hãy dùng mật khẩu khác dài hơn.",
  failed: "Không tạo được tài khoản. Vui lòng thử lại.",
  // Shown instead of a server crash when SUPABASE_SERVICE_ROLE_KEY is missing.
  noAdminKey:
    "Máy chủ chưa được cấu hình để quản lý tài khoản (thiếu SUPABASE_SERVICE_ROLE_KEY). Báo quản trị kỹ thuật thêm biến này trên Vercel rồi thử lại.",
};

function isTaken(error: { code?: string; status?: number; message?: string }): boolean {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered|already exists/i.test(error.message ?? "")
  );
}

/** Is this username free? Checks profiles (usernames) under the admin's session. */
async function usernameIsFree(username: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("username", username);
  return (count ?? 0) === 0;
}

/**
 * Picks `username`, or the next free variant (hs.an → hs.an2 …) when
 * `autoNumber` is set. Returns null if the exact name is taken and
 * `autoNumber` is off.
 */
export async function resolveUsername(username: string, autoNumber: boolean): Promise<string | null> {
  let candidate = username;
  for (let i = 0; i < 50; i++) {
    if (await usernameIsFree(candidate)) return candidate;
    if (!autoNumber) return null;
    candidate = nextUsernameCandidate(candidate);
  }
  return null;
}

export async function createLoginAccount(input: {
  role: ManagedRole;
  fullName: string;
  password: string;
  username?: string;
  email?: string;
}): Promise<AccountResult> {
  const email = input.username ? usernameToEmail(input.username) : input.email;
  if (!email) return { ok: false, error: MESSAGES.failed };
  if (!adminConfigured()) {
    console.error("[accounts] SUPABASE_SERVICE_ROLE_KEY is not set");
    return { ok: false, error: MESSAGES.noAdminKey };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    // app_metadata (not user_metadata): only the service role can write it.
    app_metadata: {
      role: input.role,
      full_name: input.fullName,
      ...(input.username ? { username: input.username } : {}),
    },
  });
  if (error || !data.user) {
    if (error && isTaken(error)) return { ok: false, error: MESSAGES.taken };
    if (error?.code === "weak_password") return { ok: false, error: MESSAGES.weak };
    console.error("[accounts] createUser failed", { status: error?.status, code: error?.code });
    return { ok: false, error: MESSAGES.failed };
  }

  const login = input.username ?? email;
  await logAccountEvent("account_created", data.user.id, { role: input.role, login });
  return { ok: true, userId: data.user.id, login };
}

/** Undo a just-created account when the rest of the record could not be saved. */
export async function deleteLoginAccount(userId: string): Promise<void> {
  if (!adminConfigured()) return;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) console.error("[accounts] rollback deleteUser failed", { status: error.status });
}

export async function setPassword(
  userId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!adminConfigured()) {
    console.error("[accounts] SUPABASE_SERVICE_ROLE_KEY is not set");
    return { ok: false, error: MESSAGES.noAdminKey };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    if (error.code === "weak_password") return { ok: false, error: MESSAGES.weak };
    console.error("[accounts] updateUserById failed", { status: error.status, code: error.code });
    return { ok: false, error: "Không đặt lại được mật khẩu. Vui lòng thử lại." };
  }
  await logAccountEvent("password_reset", userId);
  return { ok: true };
}

/** Email of a teacher who signs in with a real address (shown on their page). */
export async function getLoginEmail(userId: string): Promise<string | null> {
  if (!adminConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function logAccountEvent(
  action: "account_created" | "password_reset",
  profileId: string,
  details = {},
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_account_event", {
    p_action: action,
    p_profile_id: profileId,
    p_details: details,
  });
  if (error) console.error("[accounts] audit failed", { action, code: error.code });
}

/**
 * The profile an account action targets, read under the admin's session.
 * Only student and teacher accounts are managed from these screens — never
 * admin accounts.
 */
export async function getManagedProfile(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, username, is_active")
    .eq("id", profileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data || (data.role !== "student" && data.role !== "teacher")) return null;
  return data as {
    id: string;
    role: ManagedRole;
    full_name: string;
    username: string | null;
    is_active: boolean;
  };
}
