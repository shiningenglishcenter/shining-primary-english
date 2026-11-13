"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, UserMinus } from "lucide-react";
import { Field, FormStatus, SubmitButton, useKeepValues } from "@/components/forms/form-parts";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toAscii } from "@/features/people/credentials";
import { TEACHER_ROLE_LABEL, type FormState } from "@/features/people/schemas";
import {
  assignTeacher,
  createClass,
  enrolStudents,
  removeStudentFromClass,
  unassignTeacher,
  updateClass,
} from "@/features/classes/actions";

const initial: FormState = {};
type Level = { id: string; name: string };

function LevelSelect({
  levels,
  defaultValue,
  error,
}: {
  levels: Level[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <Field
      id="levelId"
      label="Trình độ"
      hint="Học sinh trong lớp sẽ thấy nội dung học của trình độ này."
      error={error}
    >
      <Select id="levelId" name="levelId" defaultValue={defaultValue ?? ""} aria-invalid={Boolean(error)}>
        <option value="" disabled>
          — Chọn trình độ —
        </option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function NewClassForm({ levels }: { levels: Level[] }) {
  const [state, formAction, pending] = useActionState(createClass, initial);
  const keep = useKeepValues(formAction);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={keep} className="flex max-w-2xl flex-col gap-5" noValidate>
      <FormStatus state={state} />
      <Field id="name" label="Tên lớp" hint="Ví dụ: Movers A – Tối 3-5" error={e.name}>
        <Input id="name" name="name" maxLength={120} aria-invalid={Boolean(e.name)} />
      </Field>
      <LevelSelect levels={levels} error={e.levelId} />
      <Field
        id="code"
        label="Mã lớp (không bắt buộc)"
        hint="Để trống để hệ thống tự tạo từ tên lớp."
        error={e.code}
      >
        <Input
          id="code"
          name="code"
          maxLength={30}
          className="font-mono uppercase"
          aria-invalid={Boolean(e.code)}
        />
      </Field>
      <div>
        <SubmitButton pending={pending} size="lg">
          Tạo lớp
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditClassForm({
  levels,
  cls,
}: {
  levels: Level[];
  cls: { id: string; name: string; code: string; levelId: string | null; isActive: boolean };
}) {
  const [state, formAction, pending] = useActionState(updateClass, initial);
  const keep = useKeepValues(formAction);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={keep} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={cls.id} />
      <FormStatus state={state} />
      <Field id="name" label="Tên lớp" error={e.name}>
        <Input id="name" name="name" defaultValue={cls.name} maxLength={120} />
      </Field>
      <LevelSelect levels={levels} defaultValue={cls.levelId ?? ""} error={e.levelId} />
      <Field id="code" label="Mã lớp" error={e.code}>
        <Input id="code" name="code" defaultValue={cls.code} maxLength={30} className="font-mono uppercase" />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={cls.isActive} className="size-5 accent-ink" />
        Lớp đang mở (bỏ chọn khi lớp đã kết thúc)
      </label>
      <div>
        <SubmitButton pending={pending}>Lưu thay đổi</SubmitButton>
      </div>
    </form>
  );
}

export function EnrolStudentsForm({
  classId,
  candidates,
}: {
  classId: string;
  candidates: { id: string; student_code: string; full_name: string; english_name: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(enrolStudents, initial);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const f = toAscii(filter.trim());
    if (!f) return candidates;
    return candidates.filter((c) =>
      toAscii(`${c.full_name} ${c.english_name ?? ""} ${c.student_code}`).includes(f),
    );
  }, [candidates, filter]);

  if (candidates.length === 0) {
    return <p className="text-sm text-ink-soft">Tất cả học sinh đang học đã ở trong lớp này.</p>;
  }

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setSelected(new Set());
      }}
      className="flex flex-col gap-3"
      data-testid="enrol-form"
    >
      <input type="hidden" name="classId" value={classId} />
      <FormStatus state={state} />
      {state.fieldErrors?.studentIds ? (
        <p className="text-sm text-berry">{state.fieldErrors.studentIds}</p>
      ) : null}
      <div className="relative">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Lọc theo tên hoặc mã học sinh"
          aria-label="Lọc học sinh"
          className="pl-9"
        />
      </div>
      <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-md border border-line bg-surface">
        {visible.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                name="studentIds"
                value={c.id}
                checked={selected.has(c.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(c.id);
                  else next.delete(c.id);
                  setSelected(next);
                }}
                className="size-5 accent-ink"
              />
              <span className="font-medium">{c.full_name}</span>
              {c.english_name ? <span className="text-ink-soft">({c.english_name})</span> : null}
              <span className="ml-auto font-mono text-xs text-ink-soft">{c.student_code}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="px-3 py-3 text-sm text-ink-soft">Không có học sinh phù hợp.</li>
        ) : null}
      </ul>
      <div>
        <SubmitButton pending={pending} disabled={pending || selected.size === 0}>
          Thêm {selected.size > 0 ? selected.size : ""} học sinh vào lớp
        </SubmitButton>
      </div>
    </form>
  );
}

/** Small inline form for "remove student" / "unassign teacher". */
export function RemoveMemberButton({
  kind,
  classId,
  memberId,
  name,
}: {
  kind: "student" | "teacher";
  classId: string;
  memberId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    kind === "student" ? removeStudentFromClass : unassignTeacher,
    initial,
  );
  const question =
    kind === "student"
      ? `Cho ${name} rời lớp này?`
      : `Gỡ ${name} khỏi lớp này? Giáo viên sẽ không thấy lớp nữa.`;
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton
        pending={pending}
        pendingText="…"
        variant="ghost"
        size="sm"
        className="text-berry"
        aria-label={kind === "student" ? `Cho ${name} rời lớp` : `Gỡ ${name} khỏi lớp`}
        onClick={(e) => {
          if (!confirm(question)) e.preventDefault();
        }}
      >
        <UserMinus aria-hidden="true" />
        {kind === "student" ? "Rời lớp" : "Gỡ"}
      </SubmitButton>
      {state.error ? <span className="ml-2 text-sm text-berry">{state.error}</span> : null}
    </form>
  );
}

export function AssignTeacherForm({
  classId,
  teachers,
}: {
  classId: string;
  teachers: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignTeacher, initial);
  if (teachers.length === 0) {
    return (
      <p className="text-sm text-ink-soft">Không còn giáo viên nào để phân công. Hãy tạo giáo viên trước.</p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3" data-testid="assign-teacher-form">
      <input type="hidden" name="classId" value={classId} />
      <FormStatus state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="teacherId" label="Giáo viên" error={state.fieldErrors?.teacherId}>
          <Select id="teacherId" name="teacherId" defaultValue="">
            <option value="" disabled>
              — Chọn giáo viên —
            </option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="teacherRole" label="Vai trò">
          <Select id="teacherRole" name="role" defaultValue="main">
            {(Object.keys(TEACHER_ROLE_LABEL) as (keyof typeof TEACHER_ROLE_LABEL)[]).map((r) => (
              <option key={r} value={r}>
                {TEACHER_ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending}>Phân công</SubmitButton>
      </div>
    </form>
  );
}
