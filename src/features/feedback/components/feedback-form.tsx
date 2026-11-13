"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import { CheckCircle2, ChevronRight, Loader2, Paperclip, Plus, Send, Star, Trash2, X } from "lucide-react";
import { submitFeedback, type FeedbackInput } from "@/features/feedback/actions";
import {
  FEEDBACK_AREAS,
  FEEDBACK_KINDS,
  RATINGS,
  SEVERITIES,
  type FeedbackArea,
  type FeedbackKind,
  type RatingCode,
  type Severity,
} from "@/features/feedback/labels";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Shot = { path: string; preview: string };
type Entry = {
  key: number;
  kind: FeedbackKind;
  area: FeedbackArea;
  severity: Severity | "";
  description: string;
  shots: Shot[];
  uploading: boolean;
  uploadError: string | null;
};

const ME_KEY = "shining-feedback-me";
const MAX_BYTES = 5 * 1024 * 1024;
const BUG_KINDS = FEEDBACK_KINDS.filter((k) => k.code !== "idea");
let nextKey = 1;
const entry = (kind: FeedbackKind, area: FeedbackArea): Entry => ({
  key: nextKey++,
  kind,
  area,
  severity: "",
  description: "",
  shots: [],
  uploading: false,
  uploadError: null,
});

function storedMe(): string {
  try {
    return localStorage.getItem(ME_KEY) ?? "";
  } catch {
    return "";
  }
}

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

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-base outline-none focus:border-sky focus:ring-2 focus:ring-sky/20";
const select = "h-10 rounded-md border border-line bg-surface px-2 text-sm";

/**
 * Internal pilot feedback form (D38 v2): who (required), ideas (highlighted),
 * bugs, then optional ratings and comment. At least one idea or bug.
 */
export function FeedbackForm({ fromPage }: { fromPage: string | null }) {
  const remembered = useSyncExternalStore(
    () => () => {},
    storedMe,
    () => "",
  );
  const [me, setMe] = useState<{ name: string; contact: string } | null>(null);
  const saved = (() => {
    try {
      return JSON.parse(remembered || "{}") as { name?: string; contact?: string };
    } catch {
      return {};
    }
  })();
  const name = me?.name ?? saved.name ?? "";
  const contact = me?.contact ?? saved.contact ?? "";
  const setWho = (patch: Partial<{ name: string; contact: string }>) => setMe({ name, contact, ...patch });

  const [ideas, setIdeas] = useState<Entry[]>([entry("idea", "play")]);
  const [bugs, setBugs] = useState<Entry[]>([entry("bug", "play")]);
  const [ratings, setRatings] = useState<Partial<Record<RatingCode, number>>>({});
  const [change, setChange] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const uploading = [...ideas, ...bugs].some((e) => e.uploading);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const all = [...ideas, ...bugs].filter((x) => x.description.trim());
    const data: FeedbackInput = {
      website,
      name,
      contact,
      ratings: ratings as Record<string, number>,
      change,
      pageUrl: fromPage ?? undefined,
      userAgent: navigator.userAgent.slice(0, 300),
      items: all.map((x) => ({
        kind: x.kind,
        area: x.area,
        severity: x.kind === "bug" && x.severity ? x.severity : undefined,
        description: x.description,
        screenshots: x.shots.map((s) => s.path),
      })),
    };
    start(async () => {
      const r = await submitFeedback(data);
      if (r.ok) {
        try {
          localStorage.setItem(ME_KEY, JSON.stringify({ name: name.trim(), contact: contact.trim() }));
        } catch {
          /* storage blocked: type again next time */
        }
        setSent(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError({ text: r.error ?? "Chưa gửi được.", field: r.field });
      }
    });
  };

  if (sent) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-leaf/40 bg-leaf-soft p-8 text-center"
        data-testid="feedback-sent"
      >
        <CheckCircle2 className="size-12 text-leaf" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Đã gửi. Cảm ơn cô!</h2>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setIdeas([entry("idea", "play")]);
            setBugs([entry("bug", "play")]);
            setRatings({});
            setChange("");
          }}
          className="rounded-md bg-ink px-4 py-2 font-semibold text-white"
        >
          Gửi thêm góp ý
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate data-testid="feedback-form">
      <label className="sr-only" aria-hidden="true">
        Website
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>

      {/* Who */}
      <Block title="Thông tin">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            <span>
              Họ tên <span className="text-berry">*</span>
              <span className="sr-only">(bắt buộc)</span>
            </span>
            <input
              value={name}
              onChange={(e) => setWho({ name: e.target.value })}
              maxLength={80}
              autoComplete="name"
              required
              aria-invalid={error?.field === "name"}
              className={cn(input, error?.field === "name" && "border-berry")}
              data-testid="feedback-name"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            <span>
              SĐT Zalo <span className="text-berry">*</span>
              <span className="sr-only">(bắt buộc)</span>
            </span>
            <input
              value={contact}
              onChange={(e) => setWho({ contact: e.target.value })}
              inputMode="tel"
              autoComplete="tel"
              placeholder="09xx xxx xxx"
              maxLength={20}
              required
              aria-invalid={error?.field === "contact"}
              className={cn(input, error?.field === "contact" && "border-berry")}
              data-testid="feedback-phone"
            />
          </label>
        </div>
      </Block>

      {/* Ideas: highlighted */}
      <section
        className="rounded-xl border-2 border-sun bg-sun-soft/60 p-4 sm:p-5"
        data-testid="feedback-ideas"
      >
        <h2 className="text-lg font-semibold">💡 Đóng góp ý tưởng</h2>
        <p className="mt-1 mb-4 text-sm">
          Ý tưởng của các cô dựa trên kinh nghiệm dạy thực tiễn trên lớp sẽ giúp ích rất nhiều cho quá trình
          nâng cấp app.
        </p>
        <EntryList
          list={ideas}
          setList={setIdeas}
          idea
          placeholder="Ví dụ: trò chơi các con thích, cách cô ôn bài, điều cô muốn app có thêm…"
        />
        <AddButton onClick={() => setIdeas([...ideas, entry("idea", "play")])}>Thêm ý tưởng</AddButton>
      </section>

      {/* Bugs */}
      <Block title="🐞 Báo lỗi">
        <EntryList
          list={bugs}
          setList={setBugs}
          placeholder="Lỗi gì, ở bài/màn hình nào, cô đã bấm gì trước đó…"
        />
        <AddButton onClick={() => setBugs([...bugs, entry("bug", "play")])}>Thêm lỗi</AddButton>
      </Block>

      {/* Optional */}
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
          Đánh giá nhanh <span className="font-normal text-ink-soft">(không bắt buộc)</span>
        </summary>
        <ul className="flex flex-col gap-3 border-t border-line px-4 py-4">
          {RATINGS.map((r) => (
            <li key={r.code} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm">{r.label}</span>
              <span className="flex" role="radiogroup" aria-label={r.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={ratings[r.code] === n}
                    aria-label={`${n} sao`}
                    onClick={() =>
                      setRatings({ ...ratings, [r.code]: ratings[r.code] === n ? undefined : n })
                    }
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "size-7",
                        (ratings[r.code] ?? 0) >= n ? "fill-sun text-sun" : "text-line",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </details>
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
          Nhận xét khác <span className="font-normal text-ink-soft">(không bắt buộc)</span>
        </summary>
        <div className="border-t border-line px-4 py-4">
          <textarea
            value={change}
            onChange={(e) => setChange(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label="Nhận xét khác"
            className={input}
          />
        </div>
      </details>

      {error ? (
        <p
          className="rounded-md bg-berry-soft px-4 py-3 text-sm font-semibold text-berry"
          role="alert"
          data-testid="feedback-error"
        >
          {error.text}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending || uploading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-leaf px-8 font-semibold text-white hover:bg-leaf/90 disabled:opacity-60 sm:w-auto"
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-muted"
    >
      <Plus className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

/** Compact rows: selects on one line, then the description and an attach button. */
function EntryList({
  list,
  setList,
  idea = false,
  placeholder,
}: {
  list: Entry[];
  setList: React.Dispatch<React.SetStateAction<Entry[]>>;
  idea?: boolean;
  placeholder: string;
}) {
  const update = (key: number, patch: Partial<Entry>) =>
    setList((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const attach = async (key: number, files: FileList) => {
    const current = list.find((x) => x.key === key)!;
    const chosen = Array.from(files).slice(0, 3 - current.shots.length);
    if (!chosen.length) return;
    update(key, { uploading: true, uploadError: null });
    const supabase = createClient();
    const added: Shot[] = [];
    let failed = false;
    for (const file of chosen) {
      try {
        const blob = await prepare(file);
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const path = `incoming/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("feedback")
          .upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (error) throw error;
        added.push({ path, preview: URL.createObjectURL(blob) });
      } catch {
        failed = true;
      }
    }
    setList((l) =>
      l.map((x) =>
        x.key === key
          ? {
              ...x,
              uploading: false,
              shots: [...x.shots, ...added],
              uploadError: failed ? "Một ảnh chưa tải lên được." : null,
            }
          : x,
      ),
    );
  };

  return (
    <ol className="flex flex-col gap-3">
      {list.map((x, i) => (
        <li key={x.key} className="rounded-lg border border-line bg-surface p-3" data-testid="feedback-item">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-ink-soft">#{i + 1}</span>
            {idea ? (
              <span className="text-ink-soft">Liên quan đến</span>
            ) : (
              <select
                value={x.kind}
                onChange={(e) => update(x.key, { kind: e.target.value as FeedbackKind })}
                aria-label="Loại"
                className={select}
              >
                {BUG_KINDS.map((k) => (
                  <option key={k.code} value={k.code}>
                    {k.label}
                  </option>
                ))}
              </select>
            )}
            <select
              value={x.area}
              onChange={(e) => update(x.key, { area: e.target.value as FeedbackArea })}
              aria-label="Phần"
              className={select}
            >
              {FEEDBACK_AREAS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
            {!idea && x.kind === "bug" ? (
              <select
                value={x.severity}
                onChange={(e) => update(x.key, { severity: e.target.value as Severity | "" })}
                aria-label="Mức độ"
                className={select}
              >
                <option value="">Mức độ…</option>
                {SEVERITIES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : null}
            {list.length > 1 ? (
              <button
                type="button"
                onClick={() => setList(list.filter((y) => y.key !== x.key))}
                aria-label={`Xoá mục ${i + 1}`}
                className="ml-auto rounded p-1 text-ink-soft hover:text-berry"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <textarea
            value={x.description}
            onChange={(e) => update(x.key, { description: e.target.value })}
            rows={3}
            maxLength={2000}
            placeholder={placeholder}
            aria-label={idea ? `Ý tưởng ${i + 1}` : `Mô tả lỗi ${i + 1}`}
            className={cn(input, "mt-2")}
            data-testid={idea ? "feedback-idea" : "feedback-description"}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {x.shots.map((s, k) => (
              <span key={s.path} className="relative">
                <Image
                  src={s.preview}
                  alt={`Ảnh ${k + 1}`}
                  width={56}
                  height={56}
                  unoptimized
                  className="size-14 rounded border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => update(x.key, { shots: x.shots.filter((_, j) => j !== k) })}
                  aria-label={`Bỏ ảnh ${k + 1}`}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {x.shots.length < 3 ? (
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm text-ink-soft hover:bg-muted">
                {x.uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-label="Đang tải ảnh" />
                ) : (
                  <Paperclip className="size-4" aria-hidden="true" />
                )}
                Ảnh (không bắt buộc)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  multiple
                  className="sr-only"
                  disabled={x.uploading}
                  onChange={(e) => {
                    if (e.target.files) void attach(x.key, e.target.files);
                    e.target.value = "";
                  }}
                  data-testid="feedback-image"
                />
              </label>
            ) : null}
            {x.uploadError ? <span className="text-sm text-berry">{x.uploadError}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
