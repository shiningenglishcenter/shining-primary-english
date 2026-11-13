import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";

export const metadata: Metadata = {
  title: "Góp ý cho SHINING",
  description: "Góp ý nội bộ sau khi dùng thử: ý tưởng và lỗi.",
};

/** Public pilot feedback page (D38): no login, linked from the guide and the staff screens. */
async function Form({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await searchParams;
  // Only same-site paths, e.g. /teacher/results — the page the teacher was on.
  const page =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from.slice(0, 300) : null;
  return <FeedbackForm fromPage={page} />;
}

export default function FeedbackPage({ searchParams }: PageProps<"/gop-y">) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/huong-dan" aria-label="Hướng dẫn sử dụng">
            <Logo subtitle={false} />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap sm:gap-2">
            <Link href="/huong-dan" className="rounded-md px-2 py-2 hover:bg-muted sm:px-3">
              Hướng dẫn
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-white"
            >
              <LogIn className="size-4" aria-hidden="true" />
              Đăng nhập
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="page-title">
            Góp ý dùng thử SHINING
          </h1>
          <p className="mt-1 text-ink-soft">Ghi lại lỗi và ý tưởng sau khi dùng thử.</p>
        </div>

        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </main>

      <footer className="border-t border-line bg-surface py-6 text-center text-sm text-ink-soft">
        SHINING Primary English · Góp ý chỉ đội phát triển và quản trị viên đọc được.
      </footer>
    </div>
  );
}
