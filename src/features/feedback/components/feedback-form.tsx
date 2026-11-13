"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { CheckCircle2, ImagePlus, Loader2, Plus, Send, Star, Trash2, X } from "lucide-react";
import { submitFeedback, type FeedbackInput } from "@/features/feedback/actions";
import {
  FEEDBACK_AREAS,
  FEEDBACK_KINDS,
  RATINGS,
  ROLES,
  SEVERITIES,
  type FeedbackArea,
  type FeedbackKind,
  type RatingCode,
  type Severity,
} from "@/features/feedback/labels";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Shot = { path: string; preview: string };
type Item = {
  kind: FeedbackKind;
  area: FeedbackArea;
  severity: Severity | null;
  description: string;
  steps: string;
  shots: Shot[];
  uploading: boolean;
  uploadError: string | null;
};

const MAX_BYTES = 5 * 1024 * 1024;
const PLACEHOLDER: Record<FeedbackKind, string> = {
  bug: "Ví dụ: Ở bài “Sắp xếp thành câu”, con xếp đúng mà vẫn báo sai.",
  idea: "Ví dụ: Lớp em hay chơi trò “Ai nhanh hơn” — app có thể có bài thi đua theo nhóm…",
  content: "Ví dụ: Unit 3 G1, từ “bag” đang hiện hình cái mũ.",
  design: "Ví dụ: Chữ trong bảng Kết quả hơi nhỏ khi xem trên điện thoại.",
};

const newItem = (kind: FeedbackKind = "bug"): Item => ({
  kind,
  area: "play",
  severity: null,
  description: "",
  steps: "",
  shots: [],
  uploading: false,
  uploadError: null,
});

/** Shrinks big screenshots in the browser so they fit the 5 MB limit. */
async function prepare(file: File): Promise<Blob> {
  if (file.size <= MAX_BYTES && /^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
}

/**
 * Pilot feedback form (D38): quick ratings, any number of issues/ideas with
 * optional screenshots, general comments, optional "about you". Everything
 * is optional except saying something.
 */
export function FeedbackForm({ fromPage }: { fromPage: string | null }) {
  const [ratings, setRatings] = useState<Partial<Record<RatingCode, number>>>({});
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [liked, setLiked] = useState("");
  const [change, setChange] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("teacher");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<Item>) =>
    setItems((list) => list.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const addShots = async (i: number, files: FileList) => {
    const room = 3 - items[i]!.shots.length;
    const chosen = Array.from(files).slice(0, room);
    if (!chosen.length) return;
    update(i, { uploading: true, uploadError: null });
    const supabase = createClient();
    const added: Shot[] = [];
    for (const file of chosen) {
      try {
        const blob = await prepare(file);
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const path = `incoming/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("feedback")
          .upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (upErr) throw upErr;
        added.push({ path, preview: URL.createObjectURL(blob) });
      } catch {
        update(i, { uploadError: "Một ảnh chưa tải lên được. Cô thử ảnh khác nhé." });
      }
    }
    setItems((list) =>
      list.map((it, k) => (k === i ? { ...it, uploading: false, shots: [...it.shots, ...added] } : it)),
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: FeedbackInput = {
      website,
      name,
      role: role as FeedbackInput["role"],
      contact,
      ratings: ratings as Record<string, number>,
      liked,
      change,
      pageUrl: fromPage ?? undefined,
      userAgent: navigator.userAgent.slice(0, 300),
      items: items
        .filter((it) => it.description.trim())
        .map((it) => ({
          kind: it.kind,
          area: it.area,
          severity: it.kind === "bug" ? (it.severity ?? undefined) : undefined,
          description: it.description,
          steps: it.kind === "bug" ? it.steps : undefined,
          screenshots: it.shots.map((s) => s.path),
        })),
    };
    start(async () => {
      const r = await submitFeedback(input);
      if (r.ok) {
        setSent(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setError(r.error ?? "Chưa gửi được.");
    });
  };

  if (sent) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-leaf/40 bg-leaf-soft p-8 text-center"
        data-testid="feedback-sent"
      >
        <CheckCircle2 className="size-14 text-leaf" aria-hidden="true" />
        <h2 className="text-2xl font-semibold">Cảm ơn cô rất nhiều!</h2>
        <p className="max-w-prose text-ink-soft">
          Góp ý đã được gửi tới đội phát triển. Mỗi lỗi cô tìm ra là một lỗi học sinh sẽ không gặp phải, và
          mỗi ý tưởng từ lớp học giúp SHINING gần với các con hơn.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setItems([newItem()]);
            setRatings({});
            setLiked("");
            setChange("");
          }}
          className="rounded-md bg-ink px-4 py-2 font-semibold text-white"
        >
          Gửi thêm góp ý
        </button>
      </div>
    );
  }

  const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
  const input =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-base outline-none focus:border-sky focus:ring-2 focus:ring-sky/20";

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate data-testid="feedback-form">
      {/* honeypot: invisible to people */}
      <label className="sr-only" aria-hidden="true">
        Website
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          name="website"
        />
      </label>

      {/* 1. issues and ideas — the heart of the page */}
      <section className={card}>
        <h2 className="text-xl font-semibold">1. Lỗi và ý tưởng của cô</h2>
        <p className="mt-1 mb-5 text-sm text-ink-soft">
          Mỗi thẻ là một điều. Cô có thể thêm bao nhiêu thẻ cũng được — càng cụ thể càng tốt.
        </p>
        <ol className="flex flex-col gap-5">
          {items.map((it, i) => (
            <li
              key={i}
              className="rounded-xl border-2 border-sky-soft bg-paper p-4"
              data-testid="feedback-item"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-soft">Điều thứ {i + 1}</span>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, k) => k !== i))}
                    className="flex items-center gap-1 text-sm text-berry"
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Bỏ thẻ này
                  </button>
                ) : null}
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Đây là</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FEEDBACK_KINDS.map((k) => (
                    <button
                      key={k.code}
                      type="button"
                      onClick={() => update(i, { kind: k.code })}
                      aria-pressed={it.kind === k.code}
                      className={cn(
                        "flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left",
                        it.kind === k.code
                          ? "border-sky bg-sky-soft"
                          : "border-line bg-surface hover:border-sky/50",
                      )}
                    >
                      <span className="font-semibold">
                        {k.icon} {k.label}
                      </span>
                      <span className="text-xs text-ink-soft">{k.hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-semibold">Ở phần nào?</legend>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_AREAS.map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => update(i, { area: a.code })}
                      aria-pressed={it.area === a.code}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        it.area === a.code
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface hover:bg-muted",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {it.kind === "bug" ? (
                <fieldset className="mt-4">
                  <legend className="mb-2 text-sm font-semibold">Mức độ</legend>
                  <div className="flex flex-wrap gap-2">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => update(i, { severity: it.severity === s.code ? null : s.code })}
                        aria-pressed={it.severity === s.code}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          it.severity === s.code
                            ? "border-berry bg-berry-soft text-berry"
                            : "border-line bg-surface",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold">
                {it.kind === "idea" ? "Ý tưởng của cô" : "Cô thấy gì?"}
                <textarea
                  value={it.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  placeholder={PLACEHOLDER[it.kind]}
                  className={cn(input, "font-normal")}
                  data-testid="feedback-description"
                />
              </label>

              {it.kind === "bug" ? (
                <label className="mt-3 flex flex-col gap-1.5 text-sm font-semibold">
                  Các bước để thấy lỗi (không bắt buộc)
                  <textarea
                    value={it.steps}
                    onChange={(e) => update(i, { steps: e.target.value })}
                    rows={2}
                    maxLength={2000}
                    placeholder="1. Đăng nhập hs.thu01  2. Mở Animals → Sắp xếp thành câu  3. …"
                    className={cn(input, "font-normal")}
                  />
                </label>
              ) : null}

              <div className="mt-3">
                <p className="mb-2 text-sm font-semibold">
                  Ảnh chụp màn hình{" "}
                  <span className="font-normal text-ink-soft">(không bắt buộc, tối đa 3 ảnh)</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {it.shots.map((s, k) => (
                    <span key={s.path} className="relative">
                      <Image
                        src={s.preview}
                        alt={`Ảnh ${k + 1}`}
                        width={88}
                        height={88}
                        unoptimized
                        className="size-22 rounded-lg border border-line object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => update(i, { shots: it.shots.filter((_, j) => j !== k) })}
                        aria-label={`Bỏ ảnh ${k + 1}`}
                        className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-ink text-white"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {it.shots.length < 3 ? (
                    <label className="flex size-22 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line bg-surface text-xs text-ink-soft hover:border-sky">
                      {it.uploading ? (
                        <Loader2 className="size-5 animate-spin" aria-label="Đang tải ảnh" />
                      ) : (
                        <ImagePlus className="size-5" aria-hidden="true" />
                      )}
                      Thêm ảnh
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/*"
                        multiple
                        className="sr-only"
                        disabled={it.uploading}
                        onChange={(e) => {
                          if (e.target.files) void addShots(i, e.target.files);
                          e.target.value = "";
                        }}
                        data-testid="feedback-image"
                      />
                    </label>
                  ) : null}
                </div>
                {it.uploadError ? <p className="mt-1 text-sm text-berry">{it.uploadError}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setItems([...items, newItem("bug")])}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Plus className="size-4" aria-hidden="true" /> Thêm một lỗi
          </button>
          <button
            type="button"
            onClick={() => setItems([...items, newItem("idea")])}
            className="inline-flex items-center gap-1.5 rounded-md border border-sun bg-sun-soft px-3 py-2 text-sm font-semibold"
          >
            <Plus className="size-4" aria-hidden="true" /> Thêm một ý tưởng
          </button>
        </div>
      </section>

      {/* 2. quick ratings */}
      <section className={card}>
        <h2 className="text-xl font-semibold">2. Đánh giá nhanh</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Bấm số sao (1 = chưa tốt, 5 = rất tốt). Bỏ qua câu nào cũng được.
        </p>
        <ul className="flex flex-col gap-4">
          {RATINGS.map((r) => (
            <li key={r.code} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">{r.label}</span>
              <span className="flex gap-1" role="radiogroup" aria-label={r.label}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = (ratings[r.code] ?? 0) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={ratings[r.code] === n}
                      aria-label={`${n} sao`}
                      onClick={() =>
                        setRatings({ ...ratings, [r.code]: ratings[r.code] === n ? undefined : n })
                      }
                      className="rounded p-0.5"
                    >
                      <Star
                        className={cn("size-8", on ? "fill-sun text-sun" : "text-line")}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. general */}
      <section className={card}>
        <h2 className="text-xl font-semibold">3. Nhận xét chung</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Điều cô thích nhất
            <textarea
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              rows={3}
              maxLength={2000}
              className={cn(input, "font-normal")}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Một điều cô muốn thay đổi nhất
            <textarea
              value={change}
              onChange={(e) => setChange(e.target.value)}
              rows={3}
              maxLength={2000}
              className={cn(input, "font-normal")}
            />
          </label>
        </div>
      </section>

      {/* 4. about you */}
      <section className={card}>
        <h2 className="text-xl font-semibold">4. Về cô (không bắt buộc)</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">Để đội phát triển hỏi lại khi cần làm rõ.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Tên
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className={cn(input, "font-normal")}
            />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">Cô là</legend>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setRole(r.code)}
                  aria-pressed={role === r.code}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    role === r.code ? "border-ink bg-ink text-white" : "border-line bg-surface",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Zalo hoặc email
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={120}
              className={cn(input, "font-normal")}
            />
          </label>
        </div>
      </section>

      {error ? (
        <p
          className="rounded-lg bg-berry-soft px-4 py-3 text-sm font-semibold text-berry"
          role="alert"
          data-testid="feedback-error"
        >
          {error}
        </p>
      ) : null}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="submit"
          disabled={pending || items.some((it) => it.uploading)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-leaf text-lg font-semibold text-white hover:bg-leaf/90 disabled:opacity-60 sm:w-auto sm:px-8"
          data-testid="feedback-submit"
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-5" aria-hidden="true" />
          )}
          Gửi góp ý
        </button>
      </div>
    </form>
  );
}
