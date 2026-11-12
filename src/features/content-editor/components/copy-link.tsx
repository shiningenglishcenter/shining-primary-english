"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copies a student link (e.g. /learn/play/<id>) with this site's address, to
 * send to parents. A student who is not signed in lands on the login page
 * and comes straight back to the activity afterwards.
 */
export function CopyLink({
  path,
  label = "Sao chép link",
  compact = false,
  className,
}: {
  path: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (old browser / no permission): let the teacher copy by hand.
      window.prompt("Sao chép link này:", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const Icon = copied ? Check : Link2;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={compact ? `${label}: ${path}` : undefined}
      title={compact ? label : undefined}
      className={cn(copied && "border-leaf text-leaf", className)}
      data-testid="copy-link"
    >
      <Icon aria-hidden="true" />
      {compact ? null : copied ? "Đã sao chép" : label}
    </Button>
  );
}
