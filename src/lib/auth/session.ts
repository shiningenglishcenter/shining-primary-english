import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "@/lib/auth/roles";

export type CurrentUser = {
  id: string;
  role: AppRole;
  fullName: string;
  displayName: string | null;
};

/**
 * The signed-in user: the session JWT is verified with getClaims (locally
 * with asymmetric signing keys), then one database call (current_profile,
 * migration 0021) confirms the session was not revoked and returns the
 * caller's profile. Returns null when there is no session, no profile, or
 * the account is deactivated. Deduplicated per request.
 *
 * The role comes from the database row, not the JWT, so a role change or
 * deactivation by an admin takes effect on the next request.
 */
type SessionState =
  | { status: "signed_in"; user: CurrentUser }
  | { status: "signed_out" }
  /** Valid session, but the profile is missing, deactivated or deleted. */
  | { status: "inactive" };

type ProfileRow = {
  id: string;
  role: string;
  full_name: string;
  display_name: string | null;
  is_active: boolean;
  deleted_at: string | null;
};

const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "signed_out" };

  // One call: is the session still live (not revoked) + the caller's profile (0021).
  let profile: ProfileRow | null;
  const live = await supabase.rpc("current_profile");
  if (!live.error) {
    const result = live.data as { session: boolean; profile?: ProfileRow | null } | null;
    if (!result?.session) return { status: "signed_out" };
    profile = result.profile ?? null;
  } else if (live.error.code === "PGRST202") {
    // Database without migration 0021 yet: read the profile directly.
    const { data: row } = await supabase
      .from("profiles")
      .select("id, role, full_name, display_name, is_active, deleted_at")
      .eq("id", userId)
      .maybeSingle();
    profile = (row as ProfileRow | null) ?? null;
  } else {
    return { status: "signed_out" };
  }

  if (!profile || !profile.is_active || profile.deleted_at || !isAppRole(profile.role)) {
    return { status: "inactive" };
  }
  return {
    status: "signed_in",
    user: {
      id: profile.id,
      role: profile.role,
      fullName: profile.full_name,
      displayName: profile.display_name ?? null,
    },
  };
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const state = await getSessionState();
  return state.status === "signed_in" ? state.user : null;
}

/**
 * Authoritative guard for pages and Server Actions. Signed-out users go to
 * /login; deactivated accounts have their session cleared first (otherwise the
 * still-valid cookie would bounce them back); wrong roles go to /forbidden.
 */
export async function requireRole(...allowed: AppRole[]): Promise<CurrentUser> {
  const state = await getSessionState();
  // The proxy already sent cookie-less visitors to /login, so reaching here
  // means the cookie looked valid but the Auth server rejected it (revoked or
  // expired session). Clear it, or /login would bounce straight back.
  if (state.status === "signed_out") redirect("/auth/end-session?reason=expired");
  if (state.status === "inactive") redirect("/auth/end-session?reason=inactive");
  if (allowed.length > 0 && !allowed.includes(state.user.role)) redirect("/forbidden");
  return state.user;
}
