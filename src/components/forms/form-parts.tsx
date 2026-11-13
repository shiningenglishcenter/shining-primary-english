"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePassword } from "@/features/people/credentials";
import type { FormState } from "@/features/people/schemas";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-berry" data-testid={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingText = "Đang lưu…",
  ...props
}: ButtonProps & { pending: boolean; pendingText?: string }) {
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}

/** Success / error banner for a form's last result. */
export function FormStatus({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive" data-testid="form-error">
        {state.error}
      </Alert>
    );
  }
  if (state.ok && state.message && !state.credentials) {
    return (
      <Alert variant="success" data-testid="form-success">
        {state.message}
      </Alert>
    );
  }
  return null;
}

/**
 * Password input with a "new password" button. `initial` is generated on the
 * server so the first render matches during hydration.
 */
export function PasswordField({
  id = "password",
  initial,
  error,
}: {
  id?: string;
  initial: string;
  error?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Field
      id={id}
      label="Mật khẩu"
      hint="Mật khẩu được tạo sẵn, dễ đọc cho trẻ. Bạn có thể sửa hoặc tạo mật khẩu khác."
      error={error}
    >
      <div className="flex gap-2">
        <Input
          id={id}
          name="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint ${id}-error`}
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 shrink-0"
          onClick={() => setValue(generatePassword())}
          aria-label="Tạo mật khẩu khác"
          title="Tạo mật khẩu khác"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>
    </Field>
  );
}

/**
 * Login details shown once, right after an account is created or a password
 * is reset. They are not stored anywhere readable afterwards.
 */
export function CredentialsCard({
  credentials,
  href,
  hrefLabel,
}: {
  credentials: NonNullable<FormState["credentials"]>;
  href?: string;
  hrefLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = `${credentials.name}\nTên đăng nhập: ${credentials.login}\nMật khẩu: ${credentials.password}`;
  return (
    <div
      className="rounded-lg border border-leaf/40 bg-leaf-soft p-5"
      data-testid="credentials"
      role="status"
    >
      <p className="flex items-center gap-2 font-semibold text-leaf">
        <KeyRound className="size-5" aria-hidden="true" />
        Thông tin đăng nhập của {credentials.name}
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
        <dt className="text-ink-soft">Tên đăng nhập</dt>
        <dd className="font-mono font-semibold" data-testid="credentials-login">
          {credentials.login}
        </dd>
        <dt className="text-ink-soft">Mật khẩu</dt>
        <dd className="font-mono font-semibold" data-testid="credentials-password">
          {credentials.password}
        </dd>
      </dl>
      <p className="mt-3 text-sm text-ink-soft">
        Hãy ghi lại hoặc gửi cho học sinh/giáo viên ngay. Mật khẩu chỉ hiện <strong>một lần</strong>; nếu
        quên, bạn có thể đặt lại mật khẩu mới.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Đã sao chép" : "Sao chép"}
        </Button>
        {href ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={href}>{hrefLabel ?? "Xem chi tiết"}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Submit handler that keeps what the person typed. With `<form action>`,
 * React 19 resets uncontrolled fields after every submission — including a
 * failed one, so a validation error would wipe the form (and e.g. flip a
 * "published" select back to its default). Dispatching the action ourselves
 * avoids the reset; `pending` from useActionState still works.
 */
export function useKeepValues(dispatch: (formData: FormData) => void) {
  const [, startTransition] = useTransition();
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}
