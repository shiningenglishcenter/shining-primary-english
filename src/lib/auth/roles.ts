/**
 * Route-level role rules. These drive redirects (UX only); the database
 * enforces access with RLS regardless of what the UI allows.
 */
export const APP_ROLES = ["admin", "teacher", "student", "parent"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Home page for each role. */
export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/learn",
  parent: "/parent",
};

export const ROLE_LABEL_VI: Record<AppRole, string> = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  student: "Học sinh",
  parent: "Phụ huynh",
};

/** Pages anyone can open without a session. */
export const PUBLIC_PATHS = ["/login", "/forbidden", "/api/health", "/auth/end-session"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => matchesPrefix(pathname, p));
}

/** Which role a path belongs to, or null if any signed-in user may open it. */
export function requiredRoleForPath(pathname: string): AppRole | null {
  for (const role of APP_ROLES) {
    if (matchesPrefix(pathname, ROLE_HOME[role])) return role;
  }
  return null;
}

/**
 * A `next` redirect target is only honoured if it is a same-origin path the
 * role may open. Anything else (absolute URLs, `//host`, backslashes, another
 * role's area) falls back to the role's home page.
 */
export function safeRedirectPath(next: string | null | undefined, role: AppRole): string {
  const home = ROLE_HOME[role];
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return home;
  }
  let pathname: string;
  try {
    pathname = new URL(next, "http://local").pathname;
  } catch {
    return home;
  }
  if (isPublicPath(pathname) || pathname === "/") return home;
  const required = requiredRoleForPath(pathname);
  return required === null || required === role ? next : home;
}
