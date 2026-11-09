import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Supabase client acting as the signed-in user (RLS applies). Use it in
 * Server Components, Server Actions and Route Handlers. With Cache Components
 * this reads cookies, so callers must render inside a <Suspense> boundary.
 */
export async function createClient() {
  const env = publicEnv();
  // Supabase reads the clock (token expiry) and every query result is
  // per-request: never let any of it run during a (runtime) prerender.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session cookie on every request instead.
        }
      },
    },
  });
}
