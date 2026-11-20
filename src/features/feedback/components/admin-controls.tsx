"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateFeedback, updateFeedbackItem } from "@/features/feedback/actions";
import { STATUSES } from "@/features/feedback/labels";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  new: "border-sky bg-sky-soft",
  in_progress: "border-sun bg-sun-soft",
  done: "border-leaf bg-leaf-soft",
  wont_do: "border-line bg-muted",
};

/** Status dropdown for a whole submission or one item; saves on change. */
export function StatusPicker({ id, status, item = false }: { id: string; status: string; item?: boolean }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        start(async () => {
          await (item ? updateFeedbackItem({ id, status: next }) : updateFeedback({ id, status: next }));
        });
      }}
      aria-label="Trạng thái"
      className={cn("h-8 rounded-md border px-2 text-sm font-semibold", TONE[value])}
    >
      {STATUSES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** Internal note for a submission (admins only). */
export function NoteBox({ id, note }: { id: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={2}
        maxLength={2000}
        placeholder="Ghi chú nội bộ (ví dụ: đã sửa ở bản 13/11)"
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={pending || value === (note ?? "")}
        onClick={() =>
          start(async () => {
            const r = await updateFeedback({ id, note: value });
            setSaved(r.ok);
          })
        }
        className="inline-flex w-fit items-center gap-1 rounded-md border border-line px-3 py-1 text-sm font-semibold disabled:opacity-50"
      >
        {saved ? <Check className="size-4 text-leaf" aria-hidden="true" /> : null}
        {saved ? "Đã lưu" : "Lưu ghi chú"}
      </button>
    </div>
  );
}
