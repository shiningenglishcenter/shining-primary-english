import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const PASSWORD = process.env.SEED_PASSWORD ?? "Sample-Pass-2026";

export async function signInAs(page: Page, identifier: string, password = PASSWORD) {
  await page.getByLabel("Tên đăng nhập").fill(identifier);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

export async function loginFromScratch(page: Page, identifier: string) {
  await page.goto("/login");
  await signInAs(page, identifier);
  await expect(page).not.toHaveURL(/\/login/);
}

/** Revokes every session of a sample account, as an admin "sign out everywhere" would. */
export async function revokeAllSessions(email: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  if (signOutError) throw signOutError;
}
