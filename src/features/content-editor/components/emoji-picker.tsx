"use client";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageUp, LoaderCircle, Search, Smile, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emojiSrc } from "@/features/practice/emoji";
import { EMOJI_INDEX_URL, searchEmoji, type EmojiRow } from "@/features/content-editor/emoji-search";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

/**
 * A1 (D42): pick a picture by searching in English or Vietnamese, with
 * suggestions for the word being edited; or upload a picture.
 */

let indexPromise: Promise<EmojiRow[]> | null = null;
function loadIndex(): Promise<EmojiRow[]> {
  indexPromise ??= fetch(EMOJI_INDEX_URL)
    .then((r) => (r.ok ? (r.json() as Promise<EmojiRow[]>) : []))
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

/** Quick topics for an empty search box (Vietnamese keywords match the index). */
const QUICK = [
  "con vật",
  "trái cây",
  "đồ ăn",
  "trường học",
  "gia đình",
  "đồ chơi",
  "xe",
  "quần áo",
  "thời tiết",
  "nhà",
];

export function EmojiPickerButton({
  onPick,
  suggestFor,
  size = "default",
}: {
  onPick: (code: string) => void;
  /** Called when the picker opens: the English word to suggest pictures for. */
  suggestFor?: () => string;
  size?: "default" | "sm";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<EmojiRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [word, setWord] = useState("");

  const open = () => {
    const w = suggestFor?.().trim() ?? "";
    setWord(w);
    setQuery("");
    dialog.current?.showModal();
    void loadIndex().then(setRows);
  };
  const close = () => dialog.current?.close();
  const pick = (code: string) => {
    onPick(code);
    close();
  };

  const names = useMemo(() => new Map((rows ?? []).map(([c, en]) => [c, en.split("|")[0]!.trim()])), [rows]);
  const results = useMemo(() => (rows ? searchEmoji(rows, query, 60) : []), [rows, query]);
  const suggested = useMemo(() => (rows && word ? searchEmoji(rows, word, 8) : []), [rows, word]);

  const grid = (codes: string[], testId: string) => (
    <ul className="grid grid-cols-6 gap-1 sm:grid-cols-8" data-testid={testId}>
      {codes.map((code) => (
        <li key={code}>
          <button
            type="button"
            onClick={() => pick(code)}
            title={names.get(code)}
            aria-label={names.get(code) ?? code}
            data-code={code}
            className="flex size-11 items-center justify-center rounded-md hover:bg-sky-soft focus-visible:bg-sky-soft"
          >
            <Image src={emojiSrc(code)!} alt="" width={34} height={34} unoptimized loading="lazy" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={open}
        data-testid="emoji-picker-open"
      >
        <Smile aria-hidden="true" />
        Chọn hình
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="emoji-picker-title"
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        data-testid="emoji-picker"
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="emoji-picker-title" className="text-lg font-semibold">
              Chọn hình
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Đóng">
              <X aria-hidden="true" />
            </Button>
          </div>
          <label className="relative block">
            <span className="sr-only">Tìm hình bằng tiếng Anh hoặc tiếng Việt</span>
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm: cat, con mèo, táo…"
              className="pl-9"
              data-testid="emoji-search"
            />
          </label>
          {rows === null ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Đang tải danh sách hình…
            </p>
          ) : query.trim() ? (
            results.length ? (
              <div className="max-h-[50vh] overflow-y-auto">{grid(results, "emoji-results")}</div>
            ) : (
              <p className="text-sm text-ink-soft">Không thấy hình nào. Thử từ khác, hoặc tải ảnh lên.</p>
            )
          ) : (
            <>
              {suggested.length ? (
                <section aria-label={`Gợi ý cho ${word}`}>
                  <p className="mb-1 text-sm font-semibold">Gợi ý cho “{word}”</p>
                  {grid(suggested, "emoji-suggestions")}
                </section>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuery(q)}
                    className="rounded-full border border-line px-3 py-1 text-sm hover:bg-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="text-xs text-ink-soft">
            Hình: Microsoft Fluent Emoji 3D. Tên tiếng Việt theo Unicode CLDR.
          </p>
        </div>
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------- upload ---

/** Teachers may pick files up to 2 MB; the browser shrinks them before upload (owner, 2026-11-20). */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_MAX_SIDE = 512;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_PATH = /^practice\/images\/[0-9a-f-]{36}\.(webp|jpg)$/;

/** Longest side ≤ 512 px, WebP; JPEG on a white background where the browser cannot encode WebP (Safari). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") {
    bitmap.close();
    return webp;
  }
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  bitmap.close();
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("encode");
  return jpeg;
}

/**
 * Upload button + preview for a word's picture. Submits `imagePath` with its
 * form ("" = no picture). The file never leaves the device at full size.
 */
export function WordImageField({
  defaultPath,
  defaultUrl,
}: {
  defaultPath?: string | null;
  defaultUrl?: string | null;
}) {
  const [path, setPath] = useState(defaultPath ?? "");
  const [dialog, ask] = useConfirm();
  const [url, setUrl] = useState(defaultUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => void (objectUrl.current && URL.revokeObjectURL(objectUrl.current)), []);

  const upload = async (file: File) => {
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    if (file.size > IMAGE_MAX_BYTES) return setError("Ảnh lớn hơn 2 MB. Hãy chọn ảnh nhỏ hơn.");
    setBusy(true);
    try {
      const blob = await shrink(file);
      const next = `practice/images/${crypto.randomUUID()}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
      const { error: upErr } = await createClient()
        .storage.from("learning-media")
        .upload(next, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setUrl(objectUrl.current);
      setPath(next);
    } catch (e) {
      setError(
        e instanceof Error && e.message === "encode"
          ? "Không đọc được ảnh này. Hãy thử ảnh khác."
          : "Không tải lên được. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <input type="hidden" name="imagePath" value={path} />
        {dialog}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="word-image-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        {url && path ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: or signed Storage URL */}
            <img
              src={url}
              alt="Ảnh của từ"
              width={40}
              height={40}
              className="size-10 rounded-md border border-line object-contain"
              data-testid="word-image-preview"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-berry"
              onClick={async () => {
                if (!(await ask({ title: "Bỏ ảnh này?", body: "Ảnh bị bỏ khi bấm Lưu.", okLabel: "Bỏ ảnh" })))
                  return;
                setPath("");
                setUrl(null);
              }}
            >
              <Trash2 aria-hidden="true" />
              Bỏ ảnh
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
            data-testid="word-image-upload"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <ImageUp aria-hidden="true" />
            )}
            {busy ? "Đang tải…" : "Tải ảnh"}
          </Button>
        )}
      </span>
      {error ? (
        <span className="text-sm text-berry" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** One line for staff next to every upload control (D17: no photos of children). */
export function ImageRule({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-ink-soft", className)}>
      Ảnh tải lên: JPG/PNG/WebP, tối đa 2 MB (tự thu nhỏ). Chỉ dùng ảnh đồ vật, con vật, cảnh vật —{" "}
      <strong>không dùng ảnh chụp học sinh</strong>. Ảnh thay cho emoji của từ.
    </p>
  );
}
