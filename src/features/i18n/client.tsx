"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANGS,
  MESSAGES,
  type Lang,
  type Messages,
} from "@/features/i18n/messages";
import { cn } from "@/lib/utils";

const LangContext = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): Messages {
  return MESSAGES[useContext(LangContext)];
}

function saveLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** EN | VI switch for the student header; remembered for a year on this device. */
export function LangSwitch() {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (next: Lang) => {
    if (next === lang) return;
    saveLang(next);
    start(() => router.refresh());
  };
  return (
    <div
      role="group"
      aria-label={t.langLabel}
      className={cn(
        "flex h-11 items-center rounded-full bg-k-surface p-1 shadow-[0_3px_0_var(--k-line)]",
        pending && "opacity-60",
      )}
      data-testid="lang-switch"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === lang}
          lang={l}
          className={cn(
            "h-9 rounded-full px-3 text-sm font-black uppercase",
            l === lang ? "bg-k-primary text-k-primary-ink" : "text-k-soft",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
