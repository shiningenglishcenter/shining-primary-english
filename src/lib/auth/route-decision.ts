import { isPublicPath, requiredRoleForPath, ROLE_HOME, type AppRole } from "@/lib/auth/roles";

export type RouteInput = {
  pathname: string;
  search: string;
  signedIn: boolean;
  role: AppRole | null;
  /** A Supabase auth cookie arrived with the request (used to detect expiry). */
  hadAuthCookie: boolean;
};

export type RouteDecision = { type: "next" } | { type: "redirect"; location: string };

const next = (): RouteDecision => ({ type: "next" });
const redirect = (location: string): RouteDecision => ({ type: "redirect", location });

/** Pure redirect rules applied by proxy.ts. */
export function decideRoute({ pathname, search, signedIn, role, hadAuthCookie }: RouteInput): RouteDecision {
  if (pathname === "/") {
    return redirect(signedIn && role ? ROLE_HOME[role] : "/login");
  }

  if (pathname === "/login") {
    return signedIn && role ? redirect(ROLE_HOME[role]) : next();
  }

  if (isPublicPath(pathname)) return next();

  if (!signedIn) {
    const params = new URLSearchParams({ next: `${pathname}${search}` });
    if (hadAuthCookie) params.set("reason", "expired");
    return redirect(`/login?${params.toString()}`);
  }

  const required = requiredRoleForPath(pathname);
  if (!role || (required !== null && required !== role)) {
    return redirect("/forbidden");
  }
  return next();
}
