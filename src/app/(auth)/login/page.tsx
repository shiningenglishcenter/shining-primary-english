import type { Metadata } from "next";
import { Suspense } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";
import { loginText } from "@/features/auth/login-text";
import { LangProvider, LangSwitch } from "@/features/i18n/client";
import { getChosenLang } from "@/features/i18n/server";
import { Sunny, Wordmark } from "@/features/practice/components/kid-ui";

export const metadata: Metadata = { title: "Đăng nhập" };

/**
 * Login (D36): the children's look (pale yellow + green, Sunny), big touch
 * targets for phones, EN | VI. Vietnamese unless English was chosen.
 */
async function LoginScreen({ searchParams }: { searchParams: Promise<{ reason?: string | string[] }> }) {
  const [lang, { reason }] = await Promise.all([getChosenLang(), searchParams]);
  const shown = lang ?? "vi";
  const t = loginText(shown);
  const notice = typeof reason === "string" ? t.notice[reason] : undefined;
  return (
    <LangProvider lang={shown}>
      <main
        className="relative flex min-h-dvh flex-col overflow-hidden bg-k-bg font-kid text-k-ink"
        lang={shown}
      >
        {/* Soft sun and clouds in the background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="animate-sun-rise absolute -top-24 -right-24 size-72 rounded-full bg-k-accent/25 sm:size-96" />
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-k-accent/35 sm:size-56" />
          <div className="absolute -bottom-28 -left-20 size-80 rounded-full bg-k-tile" />
          <div className="absolute bottom-16 left-[8%] hidden h-10 w-28 rounded-full bg-white/70 sm:block" />
          <div className="absolute top-[22%] left-[10%] hidden h-8 w-20 rounded-full bg-white/60 sm:block" />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-5">
          <Wordmark />
          <LangSwitch />
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-5 py-8 lg:grid-cols-2">
          <section className="hidden lg:block">
            <p className="font-kid-display text-5xl leading-tight font-bold">{t.tagline}</p>
            <p className="mt-4 text-lg font-bold text-k-soft">{t.programmes}</p>
          </section>

          <section className="relative mx-auto w-full max-w-md pt-14">
            <Sunny
              size={112}
              className="animate-kid-float absolute -top-2 left-1/2 z-10 -translate-x-1/2 drop-shadow"
            />
            <div className="rounded-[2rem] bg-k-surface px-6 pt-16 pb-6 shadow-[0_8px_0_var(--k-line)] sm:px-8">
              <h1 className="text-center font-kid-display text-3xl font-bold" data-testid="login-title">
                {t.welcome}
              </h1>
              <p className="mt-1 mb-6 text-center text-base font-bold text-k-soft">{t.welcomeSub}</p>
              {notice ? (
                <p
                  className={
                    reason === "inactive"
                      ? "mb-4 flex items-start gap-2 rounded-2xl bg-k-bad-soft px-4 py-3 text-sm font-bold text-k-bad"
                      : "mb-4 flex items-start gap-2 rounded-2xl bg-k-accent-soft px-4 py-3 text-sm font-bold text-k-accent-ink"
                  }
                  role="status"
                  data-testid="login-notice"
                >
                  {reason === "inactive" ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  )}
                  {notice}
                </p>
              ) : null}
              <Suspense fallback={<div className="h-80" />}>
                <LoginForm t={t} />
              </Suspense>
            </div>
            <p className="mt-5 text-center text-sm font-bold text-k-soft">{t.staff}</p>
          </section>
        </div>
      </main>
    </LangProvider>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-k-bg" />}>
      <LoginScreen searchParams={searchParams} />
    </Suspense>
  );
}
