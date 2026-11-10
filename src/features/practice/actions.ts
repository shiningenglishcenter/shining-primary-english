"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const resultSchema = z.object({
  activityId: z.uuid(),
  score: z.number().int().min(0).max(200),
  maxScore: z.number().int().min(1).max(200),
  seconds: z.number().int().min(0).max(14_400),
});

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
  const { data, error } = await supabase.rpc("record_practice", {
    p_activity_id: parsed.data.activityId,
    p_score: parsed.data.score,
    p_max_score: parsed.data.maxScore,
    p_duration_seconds: parsed.data.seconds,
  });
  if (error) {
    console.error("[practice] record failed", { code: error.code });
    return { stars: null };
  }
  return { stars: typeof data === "number" ? data : null };
}
