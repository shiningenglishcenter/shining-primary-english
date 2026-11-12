"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const resultSchema = z.object({
  activityId: z.uuid(),
  score: z.number().int().min(0).max(200),
  maxScore: z.number().int().min(1).max(200),
  seconds: z.number().int().min(0).max(14_400),
  /** Per-question outcome (D32): type, word/sentence, points, max points. */
  details: z
    .array(
      z.object({
        t: z.string().max(20),
        q: z.string().max(120),
        p: z.number().int().min(0).max(16),
        x: z.number().int().min(1).max(16),
      }),
    )
    .max(60)
    .optional(),
});
export type QuestionResult = { t: string; q: string; p: number; x: number };

/**
 * Saves a finished round. Only students have progress; for anyone else this
 * is a no-op so staff can try activities. The database re-validates
 * everything (record_practice) and returns the stars.
 */
export async function recordPractice(input: z.input<typeof resultSchema>): Promise<{ stars: number | null }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return { stars: null };
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success || parsed.data.score > parsed.data.maxScore) return { stars: null };

  const supabase = await createClient();
  const args = {
    p_activity_id: parsed.data.activityId,
    p_score: parsed.data.score,
    p_max_score: parsed.data.maxScore,
    p_duration_seconds: parsed.data.seconds,
  };
  let { data, error } = await supabase.rpc("record_practice", {
    ...args,
    p_details: parsed.data.details ?? null,
  });
  // Database without migration 0020 yet: save the score without the details.
  if (error?.code === "PGRST202") ({ data, error } = await supabase.rpc("record_practice", args));
  if (error) {
    console.error("[practice] record failed", { code: error.code });
    return { stars: null };
  }
  return { stars: typeof data === "number" ? data : null };
}
