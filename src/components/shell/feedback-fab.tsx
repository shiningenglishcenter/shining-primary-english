"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareHeart } from "lucide-react";

/**
 * Floating "Góp ý" button for teachers and admins (D38): opens the public
 * feedback page with the current screen filled in. Hidden from pupils.
 */
export function FeedbackFab() {
  return (
    <Suspense fallback={<Fab from={null} />}>
      <CurrentFab />
    </Suspense>
  );
}

function CurrentFab() {
  return <Fab from={usePathname()} />;
}

function Fab({ from }: { from: string | null }) {
  return (
    <Link
      href={from ? `/gop-y?from=${encodeURIComponent(from)}` : "/gop-y"}
      className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-sun px-4 py-3 text-sm font-semibold text-ink shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl"
      data-testid="feedback-fab"
    >
      <MessageSquareHeart className="size-5" aria-hidden="true" />
      Góp ý
    </Link>
  );
}
