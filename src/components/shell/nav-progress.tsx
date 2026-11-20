"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "loading" | "done";

/** Same-document navigations a click on this anchor would start, or null. */
function navigationTarget(event: MouseEvent): URL | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const here = window.location;
  if (url.pathname === here.pathname && url.search === here.search) return null; // same page or #hash
  return url;
}

/**
 * Thin bar across the top of the window while a client navigation is in
 * flight (D25). Starts on a link click, finishes when the URL changes.
 * Route-level `loading.tsx` skeletons cover the page body meanwhile.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!navigationTarget(event)) return;
      clearTimers();
      setPhase("loading");
      // Never leave a bar stuck if a navigation is cancelled or fails.
      timers.current.push(window.setTimeout(() => setPhase("idle"), 15000));
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    setPhase((p) => {
      if (p !== "loading") return p;
      clearTimers();
      timers.current.push(window.setTimeout(() => setPhase("idle"), 400));
      return "done";
    });
  }, [pathname, search]);

  return (
    <div
      aria-hidden="true"
      data-testid="nav-progress"
      data-phase={phase}
      className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div className="nav-progress-bar h-full" />
    </div>
  );
}
