"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Lock, TriangleAlert, User } from "lucide-react";
import { signIn } from "@/features/auth/actions";
import type { LoginText } from "@/features/auth/login-text";
import type { LoginFormState } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

const initialState: LoginFormState = {};

/** Usernames remembered on this device (round 3, D52): never passwords. */
const REMEMBER_KEY = "shining-logins";
const REMEMBER_MAX = 3;
export function rememberedLogins(raw: string | null): string[] {
  try {
    const list = JSON.parse(raw ?? "[]") as unknown;
    return Array.isArray(list)
      ? list.filter((x): x is string => typeof x === "string" && x.length <= 120).slice(0, REMEMBER_MAX)
      : [];
  } catch {
    return [];
  }
}
export function withLogin(list: string[], login: string): string[] {
  const l = login.trim();
  return l ? [l, ...list.filter((x) => x.toLowerCase() !== l.toLowerCase())].slice(0, REMEMBER_MAX) : list;
}

const field =
  "h-14 w-full rounded-2xl border-[3px] bg-k-bg pr-4 pl-12 text-lg font-bold text-k-ink outline-none transition-colors placeholder:font-semibold placeholder:text-k-soft/70 focus:border-k-primary focus:bg-white";

export function LoginForm({ t }: { t: LoginText }) {
  const next = useSearchParams().get("next") ?? "";
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const idInput = useRef<HTMLInputElement>(null);
  const pwInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const list = rememberedLogins(localStorage.getItem(REMEMBER_KEY));
      // Restoring a per-device list after mount (localStorage is client-only).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(list);
      if (list[0] && idInput.current && !idInput.current.value) idInput.current.value = list[0];
    } catch {
      /* storage blocked */
    }
  }, []);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const login = String(new FormData(e.currentTarget).get("identifier") ?? "");
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify(withLogin(saved, login)));
      else
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify(saved.filter((x) => x.toLowerCase() !== login.trim().toLowerCase())),
        );
    } catch {
      /* storage blocked */
    }
  };
  const pick = (login: string) => {
    if (idInput.current) idInput.current.value = login;
    pwInput.current?.focus();
  };
  const say = (m: string | undefined) => (m ? (t.errors[m] ?? m) : undefined);
  const idError = say(state.fieldErrors?.identifier);
  const pwError = say(state.fieldErrors?.password);

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <p
          className="animate-kid-shake flex items-start gap-2 rounded-2xl bg-k-bad-soft px-4 py-3 text-sm font-bold text-k-bad"
          role="alert"
          data-testid="login-error"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {say(state.error)}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="identifier" className="text-base font-black">
          {t.username}
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-k-soft"
            aria-hidden="true"
          />
          <input
            ref={idInput}
            id="identifier"
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t.usernamePlaceholder}
            defaultValue={state.identifier}
            aria-invalid={Boolean(idError)}
            aria-describedby="identifier-hint identifier-error"
            required
            className={cn(field, idError ? "border-k-bad" : "border-k-line")}
          />
        </div>
        {saved.length > 1 ? (
          <div className="flex flex-wrap gap-2" data-testid="saved-logins">
            {saved.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => pick(l)}
                className="rounded-full border-2 border-k-line bg-k-surface px-3 py-1 text-sm font-black"
              >
                {l}
              </button>
            ))}
          </div>
        ) : null}
        <p id="identifier-hint" className="text-xs font-semibold text-k-soft">
          {t.usernameHint}
        </p>
        {idError ? (
          <p id="identifier-error" className="text-sm font-bold text-k-bad">
            {idError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-base font-black">
          {t.password}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-k-soft"
            aria-hidden="true"
          />
          <input
            ref={pwInput}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(pwError)}
            aria-describedby="password-error"
            required
            className={cn(field, "pr-14", pwError ? "border-k-bad" : "border-k-line")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-1 flex w-12 items-center justify-center rounded-2xl text-k-soft hover:text-k-ink"
            aria-label={showPassword ? t.hide : t.show}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
          </button>
        </div>
        {pwError ? (
          <p id="password-error" className="text-sm font-bold text-k-bad">
            {pwError}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-base font-bold">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-5 accent-k-primary"
          data-testid="remember-login"
        />
        {t.remember}
      </label>

      <button
        type="submit"
        disabled={pending}
        aria-label={t.submit}
        className="kid-press mt-1 flex h-16 items-center justify-center gap-2 rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)] disabled:opacity-70"
      >
        {pending ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : null}
        {pending ? t.pending : t.submit}
      </button>

      <p className="text-center text-sm font-semibold text-k-soft">{t.forgot}</p>
    </form>
  );
}
