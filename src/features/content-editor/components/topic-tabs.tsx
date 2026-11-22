"use client";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { FormStatus, SubmitButton } from "@/components/forms/form-parts";
import { Input } from "@/components/ui/input";
import {
  bulkAddWords,
  reorderActivities,
  savePatterns,
  setTopicStatus,
} from "@/features/content-editor/actions";
import { CopyLinkIcon } from "@/features/content-editor/components/copy-link";
import {
  DIFFICULTY_OF,
  DIFFICULTY_VI,
  KIND_LABEL_VI,
  kindGroupOf,
  type PracticeKind,
} from "@/features/practice/model";
import type { FormState } from "@/features/people/schemas";
import { cn } from "@/lib/utils";

const initial: FormState = {};
type Base = "/admin/content" | "/teacher/content";

/** Header switch: Nháp ⇄ Xuất bản for the whole topic (D56). */
export function TopicStatusSwitch({ topicId, status }: { topicId: string; status: string }) {
  const [state, action, pending] = useActionState(setTopicStatus, initial);
  const on = status === "published";
  return (
    <form action={action} className="flex items-center gap-3" data-testid="topic-status">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="status" value={on ? "draft" : "published"} />
      <span
        className={cn(
          "rounded-full px-3 py-1 text-sm font-semibold",
          on ? "bg-leaf-soft text-leaf" : "bg-muted text-ink-soft",
        )}
      >
        {on ? "Đã xuất bản" : "Bản nháp"}
      </span>
      <SubmitButton pending={pending} variant="outline" size="sm" data-testid="topic-status-toggle">
        {on ? "Chuyển về nháp" : "Xuất bản chủ đề"}
      </SubmitButton>
      {state.error ? <span className="text-sm text-berry">{state.error}</span> : null}
    </form>
  );
}

/** Patterns tab: one row per sentence, English + Vietnamese (max 10). */
export function PatternsEditor({
  topicId,
  patterns,
}: {
  topicId: string;
  patterns: { en: string; vi: string }[];
}) {
  const [rows, setRows] = useState(patterns.length ? patterns : [{ en: "", vi: "" }]);
  const [state, action, pending] = useActionState(savePatterns, initial);
  const [dialog, ask] = useConfirm();
  const set = (i: number, k: "en" | "vi", v: string) =>
    setRows((r) => r.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <form action={action} className="flex flex-col gap-3" data-testid="patterns-editor">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="patterns" value={JSON.stringify(rows)} />
      {dialog}
      <p className="text-sm text-ink-soft">
        Học sinh thấy các mẫu câu ở đầu trang chủ đề, có giọng đọc. Bài “Câu” dùng mẫu câu để gợi ý. Tối đa
        10.
      </p>
      <ol className="flex flex-col gap-2">
        {rows.map((p, i) => (
          <li
            key={i}
            className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 sm:grid-cols-[2rem_1fr_1fr_auto]"
          >
            <span className="text-sm text-ink-soft tabular-nums">{i + 1}.</span>
            <Input
              value={p.en}
              onChange={(e) => set(i, "en", e.target.value)}
              placeholder="I have got a cat."
              aria-label={`Mẫu câu ${i + 1} (tiếng Anh)`}
              maxLength={200}
            />
            <Input
              value={p.vi}
              onChange={(e) => set(i, "vi", e.target.value)}
              placeholder="Tớ có một con mèo."
              aria-label={`Mẫu câu ${i + 1} (nghĩa)`}
              maxLength={200}
              className="col-start-2 sm:col-start-auto"
            />
            <button
              type="button"
              onClick={async () => {
                if (
                  (p.en || p.vi) &&
                  !(await ask({
                    title: `Xoá mẫu câu ${i + 1}?`,
                    body: "Mẫu câu bị xoá khi bấm “Lưu mẫu câu”.",
                  }))
                )
                  return;
                setRows((r) => r.filter((_, j) => j !== i));
              }}
              className="row-start-1 flex size-10 items-center justify-center rounded-md text-berry hover:bg-berry-soft sm:row-start-auto"
              aria-label={`Xoá mẫu câu ${i + 1}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { en: "", vi: "" }])}
          disabled={rows.length >= 10}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-dashed border-line px-3 text-sm font-semibold disabled:opacity-50"
          data-testid="add-pattern"
        >
          <Plus className="size-4" aria-hidden="true" />
          Thêm mẫu câu
        </button>
        <SubmitButton pending={pending}>Lưu mẫu câu</SubmitButton>
      </div>
      <FormStatus state={state} />
    </form>
  );
}

/** "Nhập nhiều từ một lúc": paste lines "word | nghĩa". */
export function BulkWordsForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState(bulkAddWords, initial);
  const [text, setText] = useState("");
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setText("");
  }
  return (
    <details className="rounded-lg border border-line bg-paper" data-testid="bulk-words">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Nhập nhiều từ một lúc</summary>
      <form action={action} className="flex flex-col gap-3 px-4 pb-4">
        <input type="hidden" name="topicId" value={topicId} />
        <p className="text-sm text-ink-soft">
          Mỗi dòng một từ: <code>từ | nghĩa</code>, có thể thêm <code>| emoji</code>. Dán được từ Excel (2
          cột). Phiên âm tự điền; hình chọn sau bằng nút Sửa.
        </p>
        <textarea
          name="lines"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"cat | con mèo | 🐈\ndog | con chó\nfish | con cá"}
          aria-label="Danh sách từ"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm"
          data-testid="bulk-words-input"
        />
        <div className="flex items-center gap-3">
          <SubmitButton pending={pending}>
            <Plus aria-hidden="true" />
            Thêm các từ
          </SubmitButton>
          <span className="text-sm text-ink-soft">
            {text.split("\n").filter((l) => l.trim()).length} dòng
          </span>
        </div>
        <FormStatus state={state} />
      </form>
    </details>
  );
}

type ActivityItem = {
  id: string;
  kind: PracticeKind;
  titleVi: string;
  status: string;
  summary: string;
  /** Saved changes pupils don't see yet (D59). */
  changed?: boolean;
};

const GROUP_TONE: Record<string, string> = {
  vocab: "bg-sky-soft text-sky",
  sentence: "bg-sun-soft text-[#7A5600]",
  listen_read: "bg-leaf-soft text-leaf",
  mixed: "bg-berry-soft text-berry",
};

/** Activities tab: ordered list, drag ⋮⋮ or arrows to reorder (saved at once). Re-key it when the list changes on the server. */
export function ActivityList({
  base,
  topicId,
  topicPublished,
  activities,
}: {
  base: Base;
  topicId: string;
  topicPublished: boolean;
  activities: ActivityItem[];
}) {
  const [items, setItems] = useState(activities);
  const [drag, setDrag] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const commit = (next: ActivityItem[]) => {
    setItems(next);
    start(async () => {
      const r = await reorderActivities(
        topicId,
        next.map((a) => a.id),
      );
      setMsg(r.ok ? "Đã lưu thứ tự." : "Chưa lưu được thứ tự, thử lại.");
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [a] = next.splice(from, 1);
    next.splice(to, 0, a!);
    commit(next);
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Chưa có bài luyện. Tạo nhanh từ danh sách từ hoặc thêm từng bài bên dưới.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ol className="divide-y divide-line rounded-md border border-line" data-testid="activity-list">
        {items.map((a, i) => {
          const g = kindGroupOf(a.kind);
          return (
            <li
              key={a.id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null) move(drag, i);
                setDrag(null);
              }}
              onDragEnd={() => setDrag(null)}
              className={cn("flex items-center gap-2 bg-surface pr-2", drag === i && "opacity-50")}
              data-testid="activity-row"
            >
              <span className="cursor-grab px-2 text-ink-soft" aria-hidden="true">
                <GripVertical className="size-4" />
              </span>
              <Link
                href={`${base}/activities/${a.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-sm hover:text-sky"
              >
                <span className="w-6 text-right text-ink-soft tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold" data-testid="activity-title">
                    {a.titleVi}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {KIND_LABEL_VI[a.kind]} · {DIFFICULTY_VI[DIFFICULTY_OF[a.kind]]}
                    {a.summary ? ` · ${a.summary}` : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline",
                    GROUP_TONE[g.key],
                  )}
                >
                  {g.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    a.status === "published" ? "bg-leaf-soft text-leaf" : "bg-muted text-ink-soft",
                  )}
                >
                  {a.status === "published" ? "Xuất bản" : "Nháp"}
                </span>
                {a.changed ? (
                  <span
                    className="rounded-full bg-sun-soft px-2 py-0.5 text-xs font-semibold text-[#7A5600]"
                    title="Đã sửa, học sinh chưa thấy bản sửa"
                    data-testid="activity-changed"
                  >
                    Có sửa chưa xuất bản
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0 || pending}
                className="flex size-8 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                aria-label={`Đưa “${a.titleVi}” lên`}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1 || pending}
                className="flex size-8 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                aria-label={`Đưa “${a.titleVi}” xuống`}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
              {a.status === "published" && topicPublished ? (
                <CopyLinkIcon path={`/learn/play/${a.id}`} label={`Sao chép link bài “${a.titleVi}”`} />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-ink-soft" aria-live="polite">
        {pending ? "Đang lưu thứ tự…" : msg || "Kéo ⋮⋮ hoặc bấm mũi tên để đổi thứ tự học sinh thấy."}
      </p>
    </div>
  );
}
