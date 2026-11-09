"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
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
import { Select } from "@/components/ui/select";
import { generatePassword, suggestUsername } from "@/features/people/credentials";
import { createStudent, updateStudent } from "@/features/people/student-actions";
import { STUDENT_STATUSES, STUDENT_STATUS_LABEL, type FormState } from "@/features/people/schemas";

const initial: FormState = {};

function StudentFields({
  state,
  values,
  onNameChange,
}: {
  state: FormState;
  values?: {
    fullName: string;
    englishName: string | null;
    schoolName: string | null;
    schoolGrade: number | null;
  };
  onNameChange?: (name: string) => void;
}) {
  const e = state.fieldErrors ?? {};
  return (
    <>
      <Field id="fullName" label="Họ và tên" error={e.fullName}>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={values?.fullName}
          onChange={(ev) => onNameChange?.(ev.target.value)}
          aria-invalid={Boolean(e.fullName)}
          required
          maxLength={120}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="englishName" label="Tên tiếng Anh (không bắt buộc)" error={e.englishName}>
          <Input
            id="englishName"
            name="englishName"
            defaultValue={values?.englishName ?? ""}
            maxLength={60}
          />
        </Field>
        <Field id="schoolGrade" label="Lớp ở trường (không bắt buộc)" error={e.schoolGrade}>
          <Select id="schoolGrade" name="schoolGrade" defaultValue={values?.schoolGrade?.toString() ?? ""}>
            <option value="">—</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="schoolName" label="Trường (không bắt buộc)" error={e.schoolName}>
        <Input id="schoolName" name="schoolName" defaultValue={values?.schoolName ?? ""} maxLength={120} />
      </Field>
    </>
  );
}

type NewStudentProps = {
  classes: { id: string; name: string }[];
  initialPassword: string;
  defaultClassId?: string;
};

/** Remounts the form (fresh state, new password) for "add another student". */
export function NewStudentForm(props: NewStudentProps) {
  const [round, setRound] = useState(0);
  const [password, setPassword] = useState(props.initialPassword);
  return (
    <NewStudentFormInner
      key={round}
      {...props}
      initialPassword={password}
      onAnother={() => {
        setPassword(generatePassword());
        setRound((r) => r + 1);
      }}
    />
  );
}

function NewStudentFormInner({
  classes,
  initialPassword,
  defaultClassId,
  onAnother,
}: NewStudentProps & { onAnother: () => void }) {
  const [state, formAction, pending] = useActionState(createStudent, initial);
  const [createAccount, setCreateAccount] = useState(true);
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const e = state.fieldErrors ?? {};

  if (state.ok && state.href) {
    return (
      <div className="flex flex-col gap-4">
        {state.credentials ? (
          <CredentialsCard credentials={state.credentials} href={state.href} hrefLabel="Xem hồ sơ học sinh" />
        ) : null}
        <FormStatus state={{ ...state, credentials: undefined }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onAnother}>
            <Plus aria-hidden="true" />
            Thêm học sinh khác
          </Button>
          {!state.credentials ? (
            <Button asChild variant="outline">
              <Link href={state.href}>Xem hồ sơ học sinh</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5" noValidate>
      <FormStatus state={state} />
      <StudentFields
        state={state}
        onNameChange={(name) => {
          if (!usernameEdited) setUsername(suggestUsername(name, "student"));
        }}
      />
      <Field id="classId" label="Xếp vào lớp (không bắt buộc)" error={e.classId}>
        <Select id="classId" name="classId" defaultValue={defaultClassId ?? ""}>
          <option value="">— Chưa xếp lớp —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
        <legend className="px-1 text-sm font-semibold">Tài khoản đăng nhập</legend>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="createAccount"
            checked={createAccount}
            onChange={(ev) => setCreateAccount(ev.target.checked)}
            className="size-5 accent-ink"
          />
          Tạo tài khoản để học sinh đăng nhập làm bài
        </label>
        {createAccount ? (
          <>
            <Field
              id="username"
              label="Tên đăng nhập"
              hint="Gợi ý theo tên học sinh. Nếu trùng, hệ thống tự thêm số (ví dụ hs.an2)."
              error={e.username}
            >
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
                aria-describedby="username-hint username-error"
              />
            </Field>
            <PasswordField initial={initialPassword} error={e.password} />
          </>
        ) : (
          <p className="text-sm text-ink-soft">Bạn có thể tạo tài khoản sau ở trang hồ sơ học sinh.</p>
        )}
      </fieldset>

      <div>
        <SubmitButton pending={pending} size="lg">
          Tạo học sinh
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditStudentForm({
  student,
}: {
  student: {
    id: string;
    fullName: string;
    englishName: string | null;
    schoolName: string | null;
    schoolGrade: number | null;
    status: (typeof STUDENT_STATUSES)[number];
  };
}) {
  const [state, formAction, pending] = useActionState(updateStudent, initial);
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={student.id} />
      <FormStatus state={state} />
      <StudentFields state={state} values={student} />
      <Field id="status" label="Trạng thái học">
        <Select id="status" name="status" defaultValue={student.status}>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STUDENT_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <SubmitButton pending={pending}>Lưu thay đổi</SubmitButton>
      </div>
    </form>
  );
}
