"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Guest links (D35). Staff switch a link on/off or replace it; anyone with a
 * live link records a round under a first name (validated again in SQL).
 */

const detailsSchema = z
  .array(
    z.object({
      t: z.string().max(20),
      q: z.string().max(120),
      p: z.number().int().min(0).max(16),
      x: z.number().int().min(1).max(16),
    }),
  )
  .max(60)
  .optional();

const guestResultSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{16,40}$/),
  name: z.string().trim().min(1).max(40),
  score: z.number().int().min(0).max(200),
  maxScore: z.number().int().min(1).max(200),
  seconds: z.number().int().min(0).max(14_400),
  details: detailsSchema,
});

export async function recordGuestPractice(
  input: z.input<typeof guestResultSchema>,
): Promise<{ stars: number | null }> {
  const parsed = guestResultSchema.safeParse(input);
  if (!parsed.success || parsed.data.score > parsed.data.maxScore) return { stars: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_guest_practice", {
    p_token: parsed.data.token,
    p_name: parsed.data.name,
    p_score: parsed.data.score,
    p_max_score: parsed.data.maxScore,
    p_duration_seconds: parsed.data.seconds,
    p_details: parsed.data.details ?? null,
  });
  if (error) {
    console.error("[guest] record failed", { code: error.code });
    return { stars: null };
  }
  return { stars: typeof data === "number" ? data : null };
}

/** 22 url-safe characters (~131 bits): not guessable, short enough to share. */
function newToken(): string {
  return randomBytes(16).toString("base64url");
}

const linkSchema = z.object({ activityId: z.uuid(), mode: z.enum(["on", "off", "renew"]) });

export async function setGuestLink(
  input: z.input<typeof linkSchema>,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin", "teacher");
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_activities")
    .update({ public_token: parsed.data.mode === "off" ? null : newToken() })
    .eq("id", parsed.data.activityId)
    .is("deleted_at", null);
  if (error) {
    // Before migration 0022 the column does not exist yet.
    return { ok: false, error: "Không lưu được. Kiểm tra đã chạy migration 0022 chưa." };
  }
  refresh();
  return { ok: true };
}
