"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy, Link2, MessageSquareText, RefreshCw } from "lucide-react";
import { setGuestLink } from "@/features/guest/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** This site's address, known only in the browser. */
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard blocked (old browser / no permission): let the teacher copy by hand.
    window.prompt("Sao chép nội dung này:", text);
  }
}

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    async copy(key: string, text: string) {
      await copyText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    },
  };
}

/** {ten} = the activity / topic name, {link} = its address. One template per kind of link. */
const TEMPLATES = {
  student: {
    key: "shining-share-template",
    text: "Con vào link này để làm {loai} “{ten}” trên SHINING nhé (đăng nhập bằng tài khoản học sinh của con):\n{link}",
  },
  guest: {
    key: "shining-share-template-guest",
    text: "Con vào link này để làm {loai} “{ten}” trên SHINING nhé (không cần đăng nhập, chỉ cần nhập tên của con):\n{link}",
  },
} as const;
type Variant = keyof typeof TEMPLATES;

function loadTemplate(v: Variant): string {
  try {
    return localStorage.getItem(TEMPLATES[v].key) || TEMPLATES[v].text;
  } catch {
    return TEMPLATES[v].text;
  }
}
function saveTemplate(v: Variant, t: string) {
  try {
    if (t === TEMPLATES[v].text) localStorage.removeItem(TEMPLATES[v].key);
    else localStorage.setItem(TEMPLATES[v].key, t);
  } catch {
    /* storage blocked: the edit still works for this page */
  }
}
const fill = (t: string, v: { link: string; ten: string; loai: string }) =>
  t.replaceAll("{link}", v.link).replaceAll("{ten}", v.ten).replaceAll("{loai}", v.loai);

/**
 * Share box for a student link (e.g. /learn/play/<id>) to send to parents:
 * the full link with a copy button, and an editable message (D33). The
 * teacher's wording is remembered on this device for every other activity;
 * {ten} and {link} are filled in per activity, so it is edited only once.
 */
export function ShareLink({
  path,
  title,
  what = "bài",
  variant = "student",
  heading = "Link gửi phụ huynh / học sinh",
}: {
  path: string;
  title: string;
  what?: string;
  variant?: Variant;
  heading?: string;
}) {
  const DEFAULT_TEMPLATE = TEMPLATES[variant].text;
  const origin = useOrigin();
  const url = `${origin}${path}`;
  const { copied, copy } = useCopied();
  const vars = { link: url, ten: title, loai: what };
  // null = not edited on this page yet: show the remembered template.
  const [draft, setDraft] = useState<string | null>(null);
  const template = useSyncExternalStore(
    () => () => {},
    () => loadTemplate(variant),
    () => DEFAULT_TEMPLATE,
  );
  const message = draft ?? fill(template, vars);
  const edit = (text: string) => {
    setDraft(text);
    // Remember the wording with this page's link and name turned back into placeholders.
    let t = text;
    if (url) t = t.replaceAll(url, "{link}");
    if (title) t = t.replaceAll(title, "{ten}");
    saveTemplate(variant, t);
  };
  const reset = () => {
    saveTemplate(variant, DEFAULT_TEMPLATE);
    setDraft(fill(DEFAULT_TEMPLATE, vars));
  };
  const edited = message !== fill(DEFAULT_TEMPLATE, vars);
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-sky/40 bg-sky-soft/50 p-4"
      data-testid="share-link"
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{heading}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            aria-label="Link của bài"
            className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-sm"
            data-testid="share-url"
          />
          <Button
            type="button"
            onClick={() => copy("link", url)}
            className={cn("h-10 sm:w-40", copied === "link" && "bg-leaf hover:bg-leaf")}
            data-testid="copy-link"
          >
            {copied === "link" ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
            {copied === "link" ? "Đã sao chép" : "Sao chép link"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={`msg-${path}`}
          className="flex items-center justify-between gap-2 text-sm font-semibold"
        >
          <span className="inline-flex items-center gap-1.5">
            <MessageSquareText className="size-4" aria-hidden="true" />
            Lời nhắn kèm link (sửa trực tiếp được)
          </span>
          {edited ? (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-sky hover:underline"
              data-testid="reset-message"
            >
              Dùng lại lời nhắn mặc định
            </button>
          ) : null}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <textarea
            id={`msg-${path}`}
            value={message}
            onChange={(e) => edit(e.target.value)}
            rows={3}
            maxLength={1000}
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm leading-relaxed"
            data-testid="share-message"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => copy("message", message)}
            className={cn("h-10 bg-surface sm:w-40", copied === "message" && "border-leaf text-leaf")}
            data-testid="copy-message"
          >
            {copied === "message" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied === "message" ? "Đã sao chép" : "Sao chép lời nhắn"}
          </Button>
        </div>
        <p className="text-xs text-ink-soft">
          Sửa một lần là các bài khác dùng theo (lưu trên máy này); tên bài và link tự đổi theo từng bài. Dán
          vào Zalo để gửi phụ huynh.
        </p>
      </div>
    </div>
  );
}

/** Small icon button for lists: copies the full student link. */
export function CopyLinkIcon({ path, label }: { path: string; label: string }) {
  const origin = useOrigin();
  const { copied, copy } = useCopied();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => copy("link", `${origin}${path}`)}
      aria-label={label}
      title={copied ? "Đã sao chép" : label}
      className={cn("shrink-0", copied && "border-leaf text-leaf")}
    >
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      <span className="hidden sm:inline">{copied ? "Đã chép" : "Link"}</span>
    </Button>
  );
}

/**
 * "No login needed" switch for one activity (D35), off by default. On: a
 * public link that never expires; "new link" stops the old one.
 */
export function GuestLinkPanel({
  activityId,
  token,
  title,
  canShare,
}: {
  activityId: string;
  token: string | null;
  title: string;
  canShare: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (mode: "on" | "off" | "renew") =>
    start(async () => {
      setError(null);
      const r = await setGuestLink({ activityId, mode });
      if (!r.ok) setError(r.error ?? "Không lưu được.");
    });
  const on = Boolean(token);
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
      data-testid="guest-link"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Cho làm không cần đăng nhập</p>
          <p className="text-xs text-ink-soft">
            Bật lên để có một link ai cũng làm được (chỉ cần nhập tên). Điểm không vào tài khoản học sinh;
            thầy cô xem ở <span className="font-medium">Kết quả → Link không cần đăng nhập</span>.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Cho làm không cần đăng nhập"
          disabled={pending || (!on && !canShare)}
          onClick={() => run(on ? "off" : "on")}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
            on ? "bg-leaf" : "bg-line",
          )}
          data-testid="guest-switch"
        >
          <span
            className={cn(
              "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
              on && "translate-x-5",
            )}
          />
        </button>
      </div>
      {!canShare && !on ? (
        <p className="text-xs text-ink-soft">Xuất bản bài và chủ đề trước khi bật.</p>
      ) : null}
      {error ? <p className="text-sm text-berry">{error}</p> : null}
      {on && token ? (
        <>
          <ShareLink
            key={token}
            path={`/p/${token}`}
            title={title}
            variant="guest"
            heading="Link không cần đăng nhập"
          />
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Tạo link mới? Link cũ sẽ không mở được nữa.")) run("renew");
              }}
              data-testid="guest-renew"
            >
              <RefreshCw aria-hidden="true" />
              Tạo link mới (link cũ sẽ ngừng hoạt động)
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
