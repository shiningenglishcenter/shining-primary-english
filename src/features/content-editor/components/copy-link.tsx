"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Link2, MessageSquareText } from "lucide-react";
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

const TEMPLATE_KEY = "shining-share-template";
/** {ten} = the activity / topic name, {link} = its address. */
const DEFAULT_TEMPLATE =
  "Con vào link này để làm {loai} “{ten}” trên SHINING nhé (đăng nhập bằng tài khoản học sinh của con):\n{link}";

function loadTemplate(): string {
  try {
    return localStorage.getItem(TEMPLATE_KEY) || DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}
function saveTemplate(t: string) {
  try {
    if (t === DEFAULT_TEMPLATE) localStorage.removeItem(TEMPLATE_KEY);
    else localStorage.setItem(TEMPLATE_KEY, t);
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
export function ShareLink({ path, title, what = "bài" }: { path: string; title: string; what?: string }) {
  const origin = useOrigin();
  const url = `${origin}${path}`;
  const { copied, copy } = useCopied();
  const vars = { link: url, ten: title, loai: what };
  // null = not edited on this page yet: show the remembered template.
  const [draft, setDraft] = useState<string | null>(null);
  const template = useSyncExternalStore(
    () => () => {},
    loadTemplate,
    () => DEFAULT_TEMPLATE,
  );
  const message = draft ?? fill(template, vars);
  const edit = (text: string) => {
    setDraft(text);
    // Remember the wording with this page's link and name turned back into placeholders.
    let t = text;
    if (url) t = t.replaceAll(url, "{link}");
    if (title) t = t.replaceAll(title, "{ten}");
    saveTemplate(t);
  };
  const reset = () => {
    saveTemplate(DEFAULT_TEMPLATE);
    setDraft(fill(DEFAULT_TEMPLATE, vars));
  };
  const edited = message !== fill(DEFAULT_TEMPLATE, vars);
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-sky/40 bg-sky-soft/50 p-4"
      data-testid="share-link"
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Link gửi phụ huynh / học sinh</p>
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
