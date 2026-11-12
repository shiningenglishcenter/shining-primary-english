"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Link2, MessageSquareText } from "lucide-react";
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

/**
 * Share box for a student link (e.g. /learn/play/<id>) to send to parents:
 * the full link, a copy button and a copy-with-message button. A student who
 * is not signed in logs in first and comes straight back to the link.
 */
export function ShareLink({ path, title, what = "bài" }: { path: string; title: string; what?: string }) {
  const origin = useOrigin();
  const url = `${origin}${path}`;
  const { copied, copy } = useCopied();
  const message = `Con vào link này để làm ${what} “${title}” trên SHINING nhé (đăng nhập bằng tài khoản học sinh của con):\n${url}`;
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-sky/40 bg-sky-soft/50 p-4"
      data-testid="share-link"
    >
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
          className={cn("h-10", copied === "link" && "bg-leaf hover:bg-leaf")}
          data-testid="copy-link"
        >
          {copied === "link" ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          {copied === "link" ? "Đã sao chép" : "Sao chép link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => copy("message", message)}
          className={cn("h-10", copied === "message" && "border-leaf text-leaf")}
        >
          {copied === "message" ? <Check aria-hidden="true" /> : <MessageSquareText aria-hidden="true" />}
          {copied === "message" ? "Đã sao chép" : "Kèm lời nhắn"}
        </Button>
      </div>
      <p className="text-xs text-ink-soft">
        “Kèm lời nhắn” sao chép sẵn một câu nhắn cho phụ huynh để dán vào Zalo. Học sinh chưa đăng nhập sẽ
        đăng nhập trước, rồi vào thẳng {what} này.
      </p>
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
