import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES RLS — use only for Supabase Auth admin tasks
 * (create account, reset password) inside admin-only Server Actions that have
 * already called requireRole("admin"). Never import from client code: the
 * `server-only` import makes that a build error.
 */
/** False when the server has no service-role key (e.g. a Vercel environment without it). */
export function adminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
