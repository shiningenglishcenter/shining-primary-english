"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ZALO_PHONE } from "@/features/feedback/labels";

/**
 * Pilot feedback (D38). Anyone may submit (validated again in SQL by
 * submit_feedback); only admins triage.
 */

const text = (max: number) => z.string().trim().max(max).optional();

const phone = z
  .string()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(ZALO_PHONE, "Số Zalo gồm 10 số, bắt đầu bằng 0."));

const feedbackSchema = z.object({
  /** Honeypot: hidden from people; bots fill it. */
  website: z.string().max(0).optional(),
  name: z.string().trim().min(2, "Nhập họ tên.").max(80),
  contact: phone,
  ratings: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
  change: text(2000),
  pageUrl: text(300),
  userAgent: text(300),
  items: z
    .array(
      z.object({
        kind: z.enum(["bug", "idea", "content", "design"]),
        area: z.enum(["login", "content", "share", "play", "results", "other"]),
        severity: z.enum(["blocker", "annoying", "minor"]).optional(),
        description: z.string().trim().max(2000),
        screenshots: z.array(z.string().regex(/^incoming\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/)).max(3),
      }),
    )
    .max(20),
});

export type FeedbackInput = z.input<typeof feedbackSchema>;
export type FeedbackResult = { ok: boolean; error?: string; field?: "name" | "contact" | "items" };

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    if (field === "name") return { ok: false, field: "name", error: "Cô nhập họ tên giúp nhé." };
    if (field === "contact")
      return { ok: false, field: "contact", error: "Số Zalo gồm 10 số, bắt đầu bằng 0." };
    return { ok: false, error: "Nội dung chưa hợp lệ. Cô kiểm tra lại giúp nhé." };
  }
  const f = parsed.data;
  if (f.website) return { ok: true }; // bot: pretend it worked
  const items = f.items.filter((i) => i.description);
  if (!items.length) {
    return { ok: false, field: "items", error: "Cô viết ít nhất một ý tưởng hoặc một lỗi nhé." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", {
    p: {
      name: f.name,
      contact: f.contact,
      ratings: f.ratings ?? {},
      change: f.change,
      page_url: f.pageUrl,
      user_agent: f.userAgent,
      items,
    },
  });
  if (error) {
    console.error("[feedback] submit failed", { code: error.code });
    return {
      ok: false,
      error:
        error.code === "P0429"
          ? "Hệ thống đang nhận nhiều góp ý, cô thử lại sau vài phút nhé."
          : "Chưa gửi được. Cô thử lại giúp nhé.",
    };
  }
  return { ok: true };
}

const statusSchema = z.enum(["new", "in_progress", "done", "wont_do"]);

export async function updateFeedback(input: {
  id: string;
  status?: string;
  note?: string;
}): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const id = z.uuid().safeParse(input.id);
  if (!id.success) return { ok: false };
  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) {
    const s = statusSchema.safeParse(input.status);
    if (!s.success) return { ok: false };
    patch.status = s.data;
  }
  if (input.note !== undefined) patch.admin_note = input.note.trim().slice(0, 2000) || null;
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").update(patch).eq("id", id.data);
  if (error) return { ok: false };
  refresh();
  return { ok: true };
}

export async function updateFeedbackItem(input: { id: string; status: string }): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const id = z.uuid().safeParse(input.id);
  const s = statusSchema.safeParse(input.status);
  if (!id.success || !s.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("feedback_items").update({ status: s.data }).eq("id", id.data);
  if (error) return { ok: false };
  refresh();
  return { ok: true };
}
