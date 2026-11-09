"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { signIn } from "@/features/auth/actions";
import type { LoginFormState } from "@/features/auth/schemas";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginFormState = {};

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <Alert variant="destructive" data-testid="login-error">
          {state.error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="identifier">Tên đăng nhập</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state.identifier}
          aria-invalid={Boolean(state.fieldErrors?.identifier)}
          aria-describedby="identifier-hint identifier-error"
          required
        />
        <p id="identifier-hint" className="text-xs text-ink-soft">
          Học sinh và phụ huynh dùng tên đăng nhập trung tâm cấp. Giáo viên có thể dùng email.
        </p>
        {state.fieldErrors?.identifier ? (
          <p id="identifier-error" className="text-sm text-berry">
            {state.fieldErrors.identifier}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby="password-error"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-ink-soft hover:text-ink"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-berry">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>

      <p className="text-sm text-ink-soft">
        Quên mật khẩu? Hãy nhờ giáo viên hoặc trung tâm đặt lại cho bạn.
      </p>
    </form>
  );
}
