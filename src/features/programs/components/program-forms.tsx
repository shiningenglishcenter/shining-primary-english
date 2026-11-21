"use client";

import { useActionState } from "react";
import { FormStatus, SubmitButton, useKeepValues } from "@/components/forms/form-parts";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { saveLevel, saveProgram } from "@/features/programs/actions";
import type { AdminLevel, AdminProgram } from "@/features/programs/queries";
import type { FormState } from "@/features/people/schemas";

const initial: FormState = {};
const lbl = "flex flex-col gap-1 text-xs text-ink-soft";

function Err({ state }: { state: FormState }) {
  const e = state.fieldErrors ? Object.values(state.fieldErrors)[0] : undefined;
  return e ? <p className="text-sm text-berry">{e}</p> : <FormStatus state={state} />;
}

/** Add (no `program`) or edit a programme (D55). */
export function ProgramForm({ program }: { program?: AdminProgram }) {
  const [state, action, pending] = useActionState(saveProgram, initial);
  const keep = useKeepValues(action);
  const p = program;
  return (
    <form
      onSubmit={keep}
      className="flex flex-col gap-2"
      data-testid={p ? "program-form" : "new-program-form"}
    >
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_90px_140px_auto] sm:items-end">
        <label className={lbl}>
          Tên chương trình
          <Input name="name" defaultValue={p?.name ?? ""} placeholder="Family and Friends" maxLength={80} />
        </label>
        <label className={lbl}>
          Mã (không đổi sau này)
          <Input
            name="code"
            defaultValue={p?.code ?? ""}
            placeholder="family_friends"
            readOnly={Boolean(p)}
          />
        </label>
        <label className={lbl}>
          Gọi chủ đề là
          <Select name="topicNoun" defaultValue={p?.topicNoun ?? "topic"}>
            <option value="topic">Chủ đề</option>
            <option value="unit">Unit</option>
          </Select>
        </label>
        <label className={lbl}>
          Thứ tự
          <Input name="sortOrder" type="number" min={0} defaultValue={p?.sortOrder ?? 100} />
        </label>
        <label className={lbl}>
          Trạng thái
          <Select name="status" defaultValue={p?.status ?? "published"}>
            <option value="published">Hiện</option>
            <option value="draft">Ẩn</option>
          </Select>
        </label>
        <SubmitButton pending={pending} variant={p ? "outline" : "default"} className="h-10">
          {p ? "Lưu" : "+ Thêm chương trình"}
        </SubmitButton>
      </div>
      <Err state={state} />
    </form>
  );
}

/** Add (no `level`) or edit a level inside a programme (D55). */
export function LevelForm({ programId, level }: { programId: string; level?: AdminLevel }) {
  const [state, action, pending] = useActionState(saveLevel, initial);
  const keep = useKeepValues(action);
  const l = level;
  return (
    <form onSubmit={keep} className="flex flex-col gap-1" data-testid={l ? "level-form" : "new-level-form"}>
      <input type="hidden" name="id" value={l?.id ?? ""} />
      <input type="hidden" name="programId" value={programId} />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px_120px_auto] sm:items-end">
        <label className={lbl}>
          Tên trình độ
          <Input
            name="name"
            defaultValue={l?.name ?? ""}
            placeholder="Family and Friends 1"
            maxLength={120}
          />
        </label>
        <label className={lbl}>
          Tên trên tab
          <Input name="short" defaultValue={l?.short ?? ""} placeholder="FF1" maxLength={20} />
        </label>
        <label className={lbl}>
          Mã
          <Input name="code" defaultValue={l?.code ?? ""} placeholder="FF1" readOnly={Boolean(l)} />
        </label>
        <label className={lbl}>
          Đường dẫn
          <Input name="slug" defaultValue={l?.slug ?? ""} placeholder="ff1" />
        </label>
        <label className={lbl}>
          Thứ tự
          <Input name="sortOrder" type="number" min={0} defaultValue={l?.sortOrder ?? 100} />
        </label>
        <label className={lbl}>
          Trạng thái
          <Select name="status" defaultValue={l?.status ?? "published"}>
            <option value="published">Hiện</option>
            <option value="draft">Ẩn</option>
          </Select>
        </label>
        <SubmitButton pending={pending} variant="outline" className="h-10">
          {l ? "Lưu" : "+ Thêm"}
        </SubmitButton>
      </div>
      {l ? <p className="text-xs text-ink-soft">{l.topics} chủ đề</p> : null}
      <Err state={state} />
    </form>
  );
}
