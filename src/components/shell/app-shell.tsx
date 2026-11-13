import { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FeedbackFab } from "@/components/shell/feedback-fab";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME, ROLE_LABEL_VI, type AppRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-semibold" data-testid="current-user-name">
          {user.displayName ?? user.fullName}
        </p>
        <p className="text-xs text-ink-soft">{ROLE_LABEL_VI[user.role]}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm" data-testid="sign-out">
          <LogOut aria-hidden="true" />
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}

/**
 * Chrome shared by every signed-in area. The header renders statically; the
 * user menu reads the session and streams in behind its own boundary.
 * Students and parents get a narrower, roomier column (mostly phones);
 * staff get a wide one for tables.
 */
export function AppShell({
  role,
  nav,
  children,
}: {
  role: AppRole;
  /** Section tabs under the header (admin). */
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  const wide = role === "admin" || role === "teacher";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div
          className={cn(
            "mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6",
            wide ? "max-w-7xl" : "max-w-3xl",
          )}
        >
          <Link href={ROLE_HOME[role]} aria-label="Về trang tổng quan" className="rounded-md">
            <Logo subtitle={false} />
          </Link>
          <Suspense fallback={<div className="h-9 w-28 rounded-md bg-muted" />}>
            <UserMenu />
          </Suspense>
        </div>
        {nav ? (
          <div className={cn("mx-auto px-4 sm:px-6", wide ? "max-w-7xl" : "max-w-3xl")}>{nav}</div>
        ) : null}
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6", wide ? "max-w-7xl" : "max-w-3xl")}>
        {children}
      </main>
      {wide ? <FeedbackFab /> : null}
    </div>
  );
}
