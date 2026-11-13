import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { LangProvider, LangSwitch } from "@/features/i18n/client";
import { getMessages } from "@/features/i18n/server";
import { Wordmark } from "@/features/practice/components/kid-ui";
import { levelsOf, PROGRAMS, type PracticeLevel } from "@/features/practice/model";
import { cn } from "@/lib/utils";

/**
 * Full-bleed page for students, in the shared kid theme (D27) and the
 * student's interface language (D30), which client parts read from context.
 */
export async function KidPage({
  level,
  children,
  header = true,
  guest,
}: {
  level: PracticeLevel;
  children: React.ReactNode;
  header?: boolean;
  /** Guest link page (D35): no account menu, a login link instead. */
  guest?: { loginHref: string };
}) {
  const { lang, t } = await getMessages();
  return (
    <LangProvider lang={lang}>
      <div className="min-h-dvh bg-k-bg font-kid text-k-ink" data-level={level.slug} lang={lang}>
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 sm:px-6">
          {header ? (
            <header className="flex items-center justify-between gap-3 pt-4 pb-2">
              {guest ? (
                <Wordmark />
              ) : (
                <Link href={`/learn?level=${level.slug}`} aria-label={t.home} className="rounded-lg">
                  <Wordmark />
                </Link>
              )}
              <div className="flex items-center gap-2">
                <LangSwitch />
                {guest ? (
                  <Link
                    href={guest.loginHref}
                    className="flex h-11 items-center gap-2 rounded-full bg-k-surface px-4 text-sm font-extrabold text-k-ink shadow-[0_3px_0_var(--k-line)]"
                  >
                    <LogIn className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{t.haveAccount}</span>
                  </Link>
                ) : (
                  <form action={signOut}>
                    <button
                      type="submit"
                      data-testid="sign-out"
                      className="flex h-11 items-center gap-2 rounded-full bg-k-surface px-4 text-sm font-extrabold text-k-ink shadow-[0_3px_0_var(--k-line)]"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      {t.signOut}
                    </button>
                  </form>
                )}
              </div>
            </header>
          ) : null}
          {children}
        </div>
      </div>
    </LangProvider>
  );
}

/** Programme tabs (Cambridge / Global Success), then that programme's levels. */
export async function LevelTabs({ current }: { current: PracticeLevel }) {
  const { t } = await getMessages();
  return (
    <div className="flex flex-col gap-2">
      <nav
        aria-label={t.choosePrograme}
        className="flex gap-2 rounded-full bg-k-surface p-1 shadow-[0_3px_0_var(--k-line)]"
      >
        {PROGRAMS.map((p) => {
          const active = p.code === current.program;
          return (
            <Link
              key={p.code}
              href={`/learn?level=${levelsOf(p.code)[0].slug}`}
              aria-current={active ? "page" : undefined}
              data-testid="program-tab"
              className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-full text-[16px] font-black transition-colors",
                active ? "bg-k-primary text-k-primary-ink" : "text-k-soft",
              )}
            >
              {p.name}
            </Link>
          );
        })}
      </nav>
      <nav aria-label={t.chooseLevel} className="flex gap-2">
        {levelsOf(current.program).map((l) => {
          const active = l.slug === current.slug;
          return (
            <Link
              key={l.slug}
              href={`/learn?level=${l.slug}`}
              aria-current={active ? "page" : undefined}
              data-testid="level-tab"
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-full text-[17px] font-black transition-colors",
                active
                  ? "kid-press bg-k-accent text-k-ink [--press:var(--k-accent-shadow)]"
                  : "border-2 border-k-line bg-k-surface text-k-ink",
              )}
            >
              {l.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
