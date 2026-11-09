"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CredentialsCard,
  Field,
  FormStatus,
  PasswordField,
  SubmitButton,
} from "@/components/forms/form-parts";
import { Input } from "@/components/ui/input";
import { generatePassword, suggestUsername } from "@/features/people/credentials";
import { createTeacher, updateTeacher } from "@/features/people/teacher-actions";
import type { FormState } from "@/features/people/schemas";

const initial: FormState = {};

/** Remounts the form (fresh state, new password) for "add another teacher". */
export function NewTeacherForm({ initialPassword }: { initialPassword: string }) {
  const [round, setRound] = useState(0);
  const [password, setPassword] = useState(initialPassword);
  return (
    <NewTeacherFormInner
      key={round}
      initialPassword={password}
      onAnother={() => {
        setPassword(generatePassword());
        setRound((r) => r + 1);
      }}
    />
  );
}

function NewTeacherFormInner({
  initialPassword,
  onAnother,
}: {
  initialPassword: string;
  onAnother: () => void;
}) {
  const [state, formAction, pending] = useActionState(createTeacher, initial);
  const [loginType, setLoginType] = useState<"username" | "email">("username");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const e = state.fieldErrors ?? {};

  if (state.ok && state.credentials) {
    return (
      <div className="flex flex-col gap-4">
        <CredentialsCard credentials={state.credentials} href={state.href} hrefLabel="Xem hồ sơ giáo viên" />
        <div>
          <Button type="button" onClick={onAnother}>
            <Plus aria-hidden="true" />
            Thêm giáo viên khác
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5" noValidate>
      <FormStatus state={state} />
      <Field id="fullName" label="Họ và tên" error={e.fullName}>
        <Input
          id="fullName"
          name="fullName"
          maxLength={120}
          aria-invalid={Boolean(e.fullName)}
          onChange={(ev) => {
            if (!usernameEdited) setUsername(suggestUsername(ev.target.value, "teacher"));
          }}
        />
      </Field>
      <Field id="phone" label="Số điện thoại (không bắt buộc)" error={e.phone}>
        <Input id="phone" name="phone" type="tel" maxLength={30} />
      </Field>

      <fieldset className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
        <legend className="px-1 text-sm font-semibold">Tài khoản đăng nhập</legend>
        <div
          className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6"
          role="radiogroup"
          aria-label="Cách đăng nhập"
        >
          {(
            [
              ["username", "Tên đăng nhập (ví dụ gv.lan)"],
              ["email", "Email thật của giáo viên"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="loginType"
                value={value}
                checked={loginType === value}
                onChange={() => setLoginType(value)}
                className="size-5 accent-ink"
              />
              {label}
            </label>
          ))}
        </div>
        {loginType === "username" ? (
          <Field id="username" label="Tên đăng nhập" error={e.username}>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(ev) => {
                setUsername(ev.target.value.toLowerCase());
                setUsernameEdited(true);
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
              aria-invalid={Boolean(e.username)}
            />
          </Field>
        ) : (
          <Field id="email" label="Email" error={e.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoCapitalize="none"
              aria-invalid={Boolean(e.email)}
            />
          </Field>
        )}
        <PasswordField initial={initialPassword} error={e.password} />
      </fieldset>

      <div>
        <SubmitButton pending={pending} size="lg">
          Tạo giáo viên
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditTeacherForm({
  teacher,
}: {
  teacher: { id: string; fullName: string; phone: string | null };
}) {
  const [state, formAction, pending] = useActionState(updateTeacher, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={teacher.id} />
      <FormStatus state={state} />
      <Field id="fullName" label="Họ và tên" error={e.fullName}>
        <Input id="fullName" name="fullName" defaultValue={teacher.fullName} maxLength={120} />
      </Field>
      <Field id="phone" label="Số điện thoại" error={e.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={teacher.phone ?? ""} maxLength={30} />
      </Field>
      <div>
        <SubmitButton pending={pending}>Lưu thay đổi</SubmitButton>
      </div>
    </form>
  );
}
