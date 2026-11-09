import { connection, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Uptime probe: confirms the app runs and the database answers.
 * Returns status and build version only — no user data, no error details.
 */
export async function GET() {
  await connection();
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
  const headers = { "cache-control": "no-store" };

  try {
    const env = publicEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const started = Date.now();
    const { data, error } = await supabase.rpc("health_check");
    const dbOk = !error && (data as { db?: string } | null)?.db === "ok";
    return NextResponse.json(
      {
        status: dbOk ? "ok" : "degraded",
        db: dbOk ? "ok" : "unreachable",
        dbLatencyMs: Date.now() - started,
        version,
      },
      { status: dbOk ? 200 : 503, headers },
    );
  } catch {
    return NextResponse.json({ status: "degraded", db: "unreachable", version }, { status: 503, headers });
  }
}
