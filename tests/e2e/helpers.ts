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

/** D56: the "Thêm chủ đề" button opens a dialog with the new-topic form. */
export async function openNewTopicForm(page: Page) {
  await page.getByTestId("add-topic").locator("visible=true").click();
  return page.getByTestId("add-topic-dialog").getByTestId("new-topic-form");
}

/** D56: a step tab of the topic page (info, words, patterns, activities, share). */
export async function topicTab(page: Page, tab: "info" | "words" | "patterns" | "activities" | "share") {
  await page.getByTestId(`tab-${tab}`).locator("visible=true").click();
  await expect(page.getByTestId(`tab-${tab}`).locator("visible=true")).toHaveAttribute(
    "aria-current",
    "page",
  );
}

/** D56: the header switch publishes the whole topic. */
export async function publishTopic(page: Page) {
  const box = page.getByTestId("topic-status").locator("visible=true");
  await box.getByTestId("topic-status-toggle").click();
  await expect(box).toContainText("Đã xuất bản");
}

/** D56: a tab of the activity editor (Câu hỏi / Nội dung, Cài đặt, Chia sẻ). */
export async function activityTab(page: Page, name: RegExp | string) {
  await page.getByTestId("activity-tabs").locator("visible=true").getByRole("tab", { name }).click();
}

/** Answers the app's confirmation dialog (deletions and the like). */
export async function confirmDialog(page: Page, ok = true) {
  const d = page.locator("dialog[open][data-testid=confirm-dialog]");
  await expect(d).toBeVisible();
  await (ok ? d.getByTestId("confirm-ok") : d.getByRole("button", { name: "Huỷ" })).click();
  await expect(d).toBeHidden();
}
