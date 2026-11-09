import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Không có quyền truy cập" };

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <Logo />
      <div className="flex flex-col gap-3">
        <ShieldAlert className="size-8 text-berry" aria-hidden="true" />
        <h1 className="text-2xl font-semibold" data-testid="page-title">
          Bạn không có quyền mở trang này
        </h1>
        <p className="text-ink-soft">
          Trang này dành cho vai trò khác. Hãy quay về trang của bạn, hoặc liên hệ trung tâm nếu bạn nghĩ đây
          là nhầm lẫn.
        </p>
      </div>
      <Button asChild size="lg" className="self-start">
        {/* "/" redirects to the signed-in user's own home (or to login). */}
        <Link href="/">Về trang của tôi</Link>
      </Button>
    </main>
  );
}
