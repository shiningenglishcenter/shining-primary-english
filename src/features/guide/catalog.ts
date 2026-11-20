import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

export type CatalogLevel = {
  level: string;
  name: string;
  program: "cambridge" | "global_success";
  topics: { title: string; activities: number }[];
};

/**
 * Published programme → level → topic structure for the public guide (D37),
 * via practice_catalog() (migration 0024). Cached for an hour; null when the
 * database cannot be reached or is older than 0024 (the page then shows a
 * static outline).
 */
export async function getCatalog(): Promise<CatalogLevel[] | null> {
  "use cache";
  cacheLife("hours");
  try {
    const env = publicEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("practice_catalog");
    if (error || !Array.isArray(data)) return null;
    return data as CatalogLevel[];
  } catch {
    return null;
  }
}
