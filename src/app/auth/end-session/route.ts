import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_REASONS = new Set(["inactive", "signed_out", "expired"]);

/**
 * Clears the session and sends the person to the login page. Used when a
 * deactivated account still holds a valid session cookie (Server Components
 * cannot clear cookies themselves). Signing someone out is the only effect.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const reason = request.nextUrl.searchParams.get("reason");
  const url = new URL("/login", request.url);
  url.searchParams.set("reason", reason && ALLOWED_REASONS.has(reason) ? reason : "signed_out");
  return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
}
