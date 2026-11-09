"use client";

import { useActionState, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import {
  CredentialsCard,
  Field,
  FormStatus,
  PasswordField,
  SubmitButton,
} from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword, setAccountActive } from "@/features/people/account-actions";
import { createAccountForStudent } from "@/features/people/student-actions";
import type { FormState } from "@/features/people/schemas";

const initial: FormState = {};

/** Login account box on a student's or teacher's page. */
export function AccountPanel({
  account,
  initialPassword,
}: {
  account: { profileId: string; login: string; isActive: boolean; name: string };
  initialPassword: string;
}) {
  const [showReset, setShowReset] = useState(false);
  const [resetState, resetAction, resetPending] = useActionState(resetPassword, initial);
  const [lockState, lockAction, lockPending] = useActionState(setAccountActive, initial);

  return (
    <div className="flex flex-col gap-4" data-testid="account-panel">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-soft">Đăng nhập bằng</dt>
        <dd className="font-mono font-semibold" data-testid="account-login">
          {account.login}
        </dd>
        <dt className="text-ink-soft">Trạng thái</dt>
        <dd>
          {account.isActive ? (
            <Badge tone="success">Đang hoạt động</Badge>
          ) : (
            <Badge tone="danger" data-testid="account-locked">
              Đã khoá
            </Badge>
          )}
        </dd>
      </dl>

      <FormStatus state={lockState} />
      {resetState.credentials ? <CredentialsCard credentials={resetState.credentials} /> : null}
      {resetState.error ? <FormStatus state={resetState} /> : null}

      {showReset && !resetState.credentials ? (
        <form
          action={resetAction}
          className="flex flex-col gap-4 rounded-lg border border-line p-4"
          noValidate
        >
          <input type="hidden" name="profileId" value={account.profileId} />
          <PasswordField
            id="reset-password"
            initial={initialPassword}
            error={resetState.fieldErrors?.password}
          />
          <div className="flex gap-2">
            <SubmitButton pending={resetPending} size="sm">
              Lưu mật khẩu mới
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReset(false)}>
              Huỷ
            </Button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!showReset ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowReset(true)}>
            Đặt lại mật khẩu
          </Button>
        ) : null}
        <form action={lockAction}>
          <input type="hidden" name="profileId" value={account.profileId} />
          <input type="hidden" name="active" value={account.isActive ? "false" : "true"} />
          <SubmitButton
            pending={lockPending}
            pendingText="Đang lưu…"
            variant={account.isActive ? "outline" : "secondary"}
            size="sm"
            onClick={(ev) => {
              if (
                account.isActive &&
                !confirm(`Khoá tài khoản của ${account.name}? Người này sẽ không đăng nhập được.`)
              ) {
                ev.preventDefault();
              }
            }}
          >
            {account.isActive ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
            {account.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function CreateStudentAccountForm({
  studentId,
  suggestedUsername,
  initialPassword,
}: {
  studentId: string;
  suggestedUsername: string;
  initialPassword: string;
}) {
  const [state, formAction, pending] = useActionState(createAccountForStudent, initial);
  if (state.credentials) return <CredentialsCard credentials={state.credentials} />;
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate data-testid="create-account-form">
      <p className="text-sm text-ink-soft">Học sinh này chưa có tài khoản đăng nhập.</p>
      <FormStatus state={state} />
      <input type="hidden" name="studentId" value={studentId} />
      <Field id="username" label="Tên đăng nhập" error={e.username}>
        <Input
          id="username"
          name="username"
          defaultValue={suggestedUsername}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={Boolean(e.username)}
        />
      </Field>
      <PasswordField initial={initialPassword} error={e.password} />
      <div>
        <SubmitButton pending={pending}>Tạo tài khoản</SubmitButton>
      </div>
    </form>
  );
}
