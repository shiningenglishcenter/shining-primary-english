import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { DEFAULT_CATALOG, type LevelCatalog, type PracticeLevel } from "@/features/practice/model";

/** Cache tag of the programme/level catalogue; admin edits call updateTag(LEVELS_TAG). */
export const LEVELS_TAG = "levels";

type Raw = {
  code: string;
  name: string;
  topicNoun: "topic" | "unit";
  levels: { code: string; slug: string; name: string; short: string }[];
}[];

/** Published programmes and levels (D55), from practice_levels(); the built-in copy before 0033. */
export async function getLevelCatalog(): Promise<LevelCatalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(LEVELS_TAG);
  try {
    const env = publicEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("practice_levels");
    if (error || !Array.isArray(data) || data.length === 0) return DEFAULT_CATALOG;
    const raw = data as Raw;
    const levels: PracticeLevel[] = raw.flatMap((p) =>
      p.levels.map((l) => ({
        code: l.code,
        slug: l.slug,
        name: l.name,
        short: l.short,
        program: p.code,
        unit: p.topicNoun === "unit",
      })),
    );
    if (levels.length === 0) return DEFAULT_CATALOG;
    return {
      programs: raw
        .filter((p) => p.levels.length > 0)
        .map((p) => ({ code: p.code, name: p.name, unit: p.topicNoun === "unit" })),
      levels,
    };
  } catch {
    return DEFAULT_CATALOG;
  }
}
