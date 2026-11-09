import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { decideRoute } from "@/lib/auth/route-decision";
import { isAppRole } from "@/lib/auth/roles";

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/**
 * Runs on every page request: refreshes the Supabase session cookie and
 * applies optimistic role redirects. Pages and actions still re-check the
 * user server-side, and RLS is the final authority.
 */
export async function updateSession(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  const hadAuthCookie = hasAuthCookie(request);
  // getClaims() validates the JWT (refreshing it when expired). Do not put
  // code between client creation and this call (Supabase SSR requirement).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const appMetadata = claims?.app_metadata as Record<string, unknown> | undefined;
  const role = isAppRole(appMetadata?.role) ? appMetadata.role : null;

  const decision = decideRoute({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    signedIn: Boolean(claims?.sub),
    role,
    hadAuthCookie,
  });

  if (decision.type === "next") return response;

  const url = request.nextUrl.clone();
  const target = new URL(decision.location, request.url);
  url.pathname = target.pathname;
  url.search = target.search;
  const redirect = NextResponse.redirect(url);
  // Keep refreshed / cleared session cookies on the redirect response.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  const cacheControl = response.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}
