"use client";

import { useState } from "react";
import { Languages, Volume2 } from "lucide-react";
import { useLang, useT } from "@/features/i18n/client";
import { useSound } from "@/features/practice/use-sound";

/** A topic's key sentences with a voice; the Vietnamese meaning on request (D51). */
export function PatternsCard({ patterns }: { patterns: { en: string; vi: string }[] }) {
  const t = useT();
  const lang = useLang();
  const sound = useSound();
  const [showVi, setShowVi] = useState(lang === "vi");
  if (patterns.length === 0) return null;
  return (
    <section
      className="mt-6 rounded-3xl bg-k-surface p-4 shadow-[0_4px_0_var(--k-line)]"
      data-testid="patterns"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-kid-display text-2xl font-bold">{t.patternsTitle}</h2>
        {patterns.some((p) => p.vi) ? (
          <button
            type="button"
            onClick={() => setShowVi(!showVi)}
            aria-pressed={showVi}
            className="flex items-center gap-1 rounded-full bg-k-accent-soft px-3 py-1.5 text-sm font-black text-k-accent-ink"
            data-testid="patterns-meaning"
          >
            <Languages className="size-4" aria-hidden="true" />
            {showVi ? t.hideMeaning : t.showMeaning}
          </button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {patterns.map((p, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-k-tile px-3 py-2">
            <button
              type="button"
              onClick={() => sound.speak(p.en)}
              aria-label={t.listenWord(p.en)}
              className="kid-press flex size-11 shrink-0 items-center justify-center rounded-full bg-k-primary text-k-primary-ink [--press:var(--k-primary-shadow)]"
            >
              <Volume2 className="size-5" aria-hidden="true" />
            </button>
            <span className="flex flex-col">
              <span className="text-lg leading-snug font-black">{p.en}</span>
              {showVi && p.vi ? (
                <span lang="vi" className="text-base font-bold text-k-soft" data-testid="pattern-vi">
                  {p.vi}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
