"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Lock, TriangleAlert, User } from "lucide-react";
import { signIn } from "@/features/auth/actions";
import type { LoginText } from "@/features/auth/login-text";
import type { LoginFormState } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

const initialState: LoginFormState = {};

const field =
  "h-14 w-full rounded-2xl border-[3px] bg-k-bg pr-4 pl-12 text-lg font-bold text-k-ink outline-none transition-colors placeholder:font-semibold placeholder:text-k-soft/70 focus:border-k-primary focus:bg-white";

export function LoginForm({ t }: { t: LoginText }) {
  const next = useSearchParams().get("next") ?? "";
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const say = (m: string | undefined) => (m ? (t.errors[m] ?? m) : undefined);
  const idError = say(state.fieldErrors?.identifier);
  const pwError = say(state.fieldErrors?.password);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
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
