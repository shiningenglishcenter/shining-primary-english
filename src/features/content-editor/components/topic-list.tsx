"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { FormStatus } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bulkTopics } from "@/features/content-editor/actions";
import { NewTopicForm } from "@/features/content-editor/components/editor-forms";
import { fold } from "@/features/content-editor/emoji-search";
import type { TopicRow } from "@/features/content-editor/queries";
import { emojiSrc } from "@/features/practice/emoji";
import type { FormState } from "@/features/people/schemas";
import { cn } from "@/lib/utils";

const initial: FormState = {};
type Base = "/admin/content" | "/teacher/content";
type Need = "" | "pictures" | "short" | "patterns" | "empty";

const NEEDS: { value: Need; label: string }[] = [
  { value: "", label: "Cần hoàn thiện: tất cả" },
  { value: "pictures", label: "Có từ thiếu hình" },
  { value: "short", label: "Có bài dưới 6 câu" },
  { value: "patterns", label: "Chưa có mẫu câu" },
  { value: "empty", label: "Chưa có bài luyện" },
];

function ago(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  if (days < 60) return `${Math.floor(days / 7)} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

/** D56: the topic list of one level — toolbar (add, bulk actions, search, filters) and table. */
export function TopicList({
  base,
  levelCode,
  levelName,
  noun,
  rows,
}: {
  base: Base;
  levelCode: string;
  levelName: string;
  /** "chủ đề" or "Unit" */
  noun: string;
  rows: TopicRow[];
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [need, setNeed] = useState<Need>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [state, action, pending] = useActionState(bulkTopics, initial);
  const addDialog = useRef<HTMLDialogElement>(null);
  const bulkForm = useRef<HTMLFormElement>(null);
  const opInput = useRef<HTMLInputElement>(null);
  // Close the dialog when the page is left (Next keeps it mounted but hidden).
  useEffect(() => {
    const d = addDialog.current;
    return () => d?.close();
  }, []);

  const shown = useMemo(() => {
    const f = fold(q);
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (need === "pictures" && !r.wordsWithoutPicture) return false;
      if (need === "short" && !r.shortActivities) return false;
      if (need === "patterns" && r.patternCount) return false;
      if (need === "empty" && r.activityCount) return false;
      if (!f) return true;
      return (
        fold(r.titleEn).includes(f) || fold(r.titleVi).includes(f) || r.words.some((w) => fold(w).includes(f))
      );
    });
  }, [rows, q, status, need]);
  const allOn = shown.length > 0 && shown.every((r) => selected.includes(r.id));
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const run = (op: "publish" | "draft" | "delete") => {
    if (!selected.length) return;
    if (
      op === "delete" &&
      !confirm(`Xoá ${selected.length} ${noun.toLowerCase()}? Học sinh sẽ không thấy nữa.`)
    )
      return;
    opInput.current!.value = op;
    bulkForm.current!.requestSubmit();
  };

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface" data-testid="topic-list">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
        <Button
          type="button"
          onClick={() => addDialog.current?.showModal()}
          className="bg-leaf hover:bg-leaf/90"
          data-testid="add-topic"
        >
          <Plus aria-hidden="true" />
          Thêm {noun.toLowerCase()}
        </Button>
        <details className="relative" data-testid="bulk-menu">
          <summary
            className={cn(
              "flex h-10 cursor-pointer list-none items-center gap-1 rounded-md border border-line bg-surface px-4 text-sm font-semibold",
              !selected.length && "opacity-60",
            )}
          >
            Thao tác{selected.length ? ` (${selected.length})` : ""}
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="absolute z-10 mt-1 flex w-48 flex-col rounded-md border border-line bg-surface p-1 shadow-lg">
            {selected.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-soft">Tích chọn ở cột đầu bảng trước.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => run("publish")}
                  className="rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Xuất bản
                </button>
                <button
                  type="button"
                  onClick={() => run("draft")}
                  className="rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Chuyển về nháp
                </button>
                <button
                  type="button"
                  onClick={() => run("delete")}
                  className="rounded px-3 py-2 text-left text-sm text-berry hover:bg-berry-soft"
                >
                  Xoá
                </button>
              </>
            )}
          </div>
        </details>
        <span className="hidden h-7 w-px bg-line sm:block" aria-hidden="true" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Tìm ${noun.toLowerCase()} hoặc một từ (cat, mèo…)`}
          aria-label="Tìm"
          className="min-w-48 flex-1"
          data-testid="topic-search"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Trạng thái"
          className="w-auto"
        >
          <option value="">Mọi trạng thái</option>
          <option value="published">Xuất bản</option>
          <option value="draft">Nháp</option>
        </Select>
        <Select
          value={need}
          onChange={(e) => setNeed(e.target.value as Need)}
          aria-label="Cần hoàn thiện"
          className="w-auto"
          data-testid="topic-need"
        >
          {NEEDS.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-sm text-ink-soft tabular-nums">
          {shown.length} / {rows.length}
        </span>
      </div>

      <form ref={bulkForm} action={action} className="contents">
        <input ref={opInput} type="hidden" name="op" />
        {selected.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
      </form>
      {state.error || state.ok ? (
        <div className="px-4 pt-3 sm:px-5" aria-live="polite">
          <FormStatus state={state} />
        </div>
      ) : null}
      {pending ? <p className="px-5 pt-2 text-sm text-ink-soft">Đang cập nhật…</p> : null}

      {rows.length === 0 ? (
        <p className="p-6 text-ink-soft">
          Chưa có {noun.toLowerCase()} nào cho {levelName}. Bấm “Thêm {noun.toLowerCase()}” để bắt đầu.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm" data-testid="content-topics">
            <thead className="bg-paper text-ink-soft">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={allOn}
                    onChange={() => setSelected(allOn ? [] : shown.map((r) => r.id))}
                    className="size-4 accent-ink"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">{noun}</th>
                <th className="px-3 py-3 font-semibold">Từ vựng</th>
                <th className="px-3 py-3 font-semibold">Mẫu câu</th>
                <th className="px-3 py-3 font-semibold">Bài luyện</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-3 py-3 font-semibold">Cập nhật</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const src = emojiSrc(r.emoji);
                const href = `${base}/topics/${r.id}`;
                return (
                  <tr key={r.id} className="border-t border-line hover:bg-muted/40" data-testid="topic-row">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${r.titleEn}`}
                        checked={selected.includes(r.id)}
                        onChange={() => toggle(r.id)}
                        className="size-4 accent-ink"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={href}
                        className="flex items-center gap-3 font-semibold hover:text-sky hover:underline"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sun-soft">
                          {src ? <Image src={src} alt="" width={28} height={28} unoptimized /> : null}
                        </span>
                        <span>
                          {r.titleEn}
                          <span className="block text-xs font-normal text-ink-soft">{r.titleVi}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {r.wordCount}
                      {r.wordsWithoutPicture ? (
                        <span className="ml-2 rounded-full bg-sun-soft px-2 py-0.5 text-xs text-[#7A5600]">
                          {r.wordsWithoutPicture} thiếu hình
                        </span>
                      ) : null}
                    </td>
                    <td className={cn("px-3 py-3 tabular-nums", !r.patternCount && "text-berry")}>
                      {r.patternCount}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {r.activityCount}
                      <span className="text-xs text-ink-soft">
                        {r.activityCount ? ` · ${r.publishedActivities} xuất bản` : " · chưa có bài"}
                      </span>
                      {r.shortActivities ? (
                        <span className="ml-2 rounded-full bg-berry-soft px-2 py-0.5 text-xs text-berry">
                          {r.shortActivities} bài &lt; 6 câu
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          r.status === "published" ? "bg-leaf-soft text-leaf" : "bg-muted text-ink-soft",
                        )}
                      >
                        {r.status === "published" ? "Xuất bản" : "Nháp"}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{ago(r.updatedAt)}</td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={href}
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 font-semibold hover:bg-muted"
                        aria-label={`Mở ${r.titleEn}`}
                      >
                        Mở
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 ? (
            <p className="p-5 text-ink-soft">Không có {noun.toLowerCase()} nào khớp bộ lọc.</p>
          ) : null}
        </div>
      )}

      <dialog
        ref={addDialog}
        aria-labelledby="add-topic-title"
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
        data-testid="add-topic-dialog"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 id="add-topic-title" className="text-lg font-semibold">
              Thêm {noun.toLowerCase()} · {levelName}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => addDialog.current?.close()}
              aria-label="Đóng"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <NewTopicForm levelCode={levelCode} base={base} />
        </div>
      </dialog>
    </section>
  );
}
