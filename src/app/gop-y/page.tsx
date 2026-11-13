import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Bug, Lightbulb, LogIn } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";

export const metadata: Metadata = {
  title: "Góp ý cho SHINING",
  description: "Giúp SHINING hoàn thiện trước khi đến với học sinh: báo lỗi và chia sẻ ý tưởng từ lớp học.",
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
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
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

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-[2rem] leading-tight font-semibold" data-testid="page-title">
            Cô giúp SHINING tốt hơn nhé!
          </h1>
          <p className="mt-3 max-w-prose text-lg text-ink-soft">
            Cảm ơn cô đã dành thời gian dùng thử. Trước khi SHINING đến với các con, chúng tôi rất cần hai
            điều từ cô:
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-berry/30 bg-berry-soft/60 p-5">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Bug className="size-6 text-berry" aria-hidden="true" />
              Tìm thêm lỗi giúp chúng tôi
            </p>
            <p className="mt-2 text-ink">
              Bất cứ chỗ nào chạy sai, khó hiểu, hay nội dung chưa đúng — dù nhỏ.{" "}
              <b>Mỗi lỗi cô tìm ra là một lỗi học sinh sẽ không gặp phải.</b>
            </p>
          </div>
          <div className="rounded-2xl border-2 border-sun bg-sun-soft p-5">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="size-6 text-sun" aria-hidden="true" />
              Quan trọng nhất: ý tưởng từ lớp học
            </p>
            <p className="mt-2 text-ink">
              Cô là người hiểu học sinh nhất. Trò chơi các con mê, cách cô ôn bài, điều cô ước có trên lớp —{" "}
              <b>hãy kể cho chúng tôi, để app được xây từ chính kinh nghiệm giảng dạy của cô.</b>
            </p>
          </div>
        </div>

        <p className="text-sm text-ink-soft">
          Mất khoảng 3–5 phút. Không cần đăng nhập; mọi ô đều không bắt buộc — chỉ cần cô viết ít nhất một
          điều.
        </p>

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
