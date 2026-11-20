"use client";

import { useState, useSyncExternalStore } from "react";
import { Sunny } from "@/features/practice/components/kid-ui";
import { Player, type RoundResult } from "@/features/practice/components/player";
import { recordGuestPractice } from "@/features/guest/actions";
import { useT } from "@/features/i18n/client";
import type { PlaySettings, PracticeKind } from "@/features/practice/model";
import type { PlayerContext, Question } from "@/features/practice/round";

const NAME_KEY = "shining-guest-name";

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Guest link (D35): the child types a first name (remembered on this device),
 * then plays; the round is saved under that name for the teacher.
 */
export function GuestPlay({
  token,
  activityId,
  kind,
  title,
  questions,
  contexts,
  settings,
  maxScore,
  loginHref,
  again = false,
}: {
  token: string;
  activityId: string;
  kind: PracticeKind;
  title: string;
  questions: Question[];
  contexts: PlayerContext[];
  settings: PlaySettings;
  maxScore: number;
  loginHref: string;
  /** "Play again": skip the name form when a name is remembered. */
  again?: boolean;
}) {
  const t = useT();
  const remembered = useSyncExternalStore(
    () => () => {},
    storedName,
    () => "",
  );
  const [typed, setTyped] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const name = changing ? null : (chosen ?? (again && remembered ? remembered : null));
  const setName = (n: string | null) => {
    setChanging(n === null);
    setChosen(n);
  };
  const value = typed ?? remembered;

  if (!name) {
    const start = (e: React.FormEvent) => {
      e.preventDefault();
      const n = value.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!n) return;
      try {
        localStorage.setItem(NAME_KEY, n);
      } catch {
        /* storage blocked: ask again next time */
      }
      setName(n);
    };
    return (
      <form
        onSubmit={start}
        className="animate-kid-in mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-4 rounded-[2rem] bg-k-surface p-6 text-center shadow-[0_6px_0_var(--k-line)]"
        data-testid="guest-name-form"
      >
        <Sunny size={96} className="animate-kid-float" />
        <p className="text-sm font-bold text-k-soft">{title}</p>
        <label htmlFor="guest-name" className="font-kid-display text-3xl font-bold">
          {t.guestAsk}
        </label>
        <input
          id="guest-name"
          value={value}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={40}
          autoComplete="given-name"
          placeholder={t.guestPlaceholder}
          className="h-16 w-full rounded-2xl border-[3px] border-k-line bg-k-bg px-4 text-center font-kid-display text-3xl font-bold outline-none focus:border-k-primary"
          data-testid="guest-name"
        />
        <p className="text-sm font-bold text-k-soft">{t.guestHint}</p>
        <button
          type="submit"
          disabled={!value.trim()}
          className="kid-press h-16 w-full rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)] disabled:opacity-40"
          data-testid="guest-start"
        >
          {t.guestStart}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-k-soft">
        <span data-testid="guest-hello">{t.guestHello(name)}</span>
        <button type="button" onClick={() => setName(null)} className="underline">
          {t.guestNotYou(name)}
        </button>
      </p>
      <Player
        activityId={activityId}
        kind={kind}
        title={title}
        questions={questions}
        contexts={contexts}
        settings={settings}
        maxScore={maxScore}
        topicHref={`/p/${token}`}
        nextHref={null}
        playHref={`/p/${token}`}
        guest={{ loginHref }}
        record={(r: RoundResult) => recordGuestPractice({ token, name, ...r })}
      />
    </div>
  );
}
