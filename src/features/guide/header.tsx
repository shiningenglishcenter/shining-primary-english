import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/** Top bar of the public guide pages (D37). Section links point into /huong-dan. */
export function GuideHeader() {
  const links = [
    ["/huong-dan/giao-trinh", "Giáo trình"],
    ["/huong-dan#soan-bai", "Soạn & gửi bài"],
    ["/huong-dan#ket-qua", "Xem kết quả"],
    ["/huong-dan#hoc-sinh", "Học sinh làm bài"],
    ["/huong-dan#hoi-dap", "Hỏi đáp"],
  ] as const;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/huong-dan" aria-label="Hướng dẫn sử dụng">
          <Logo subtitle={false} />
        </Link>
        <nav aria-label="Mục lục" className="hidden gap-1 text-sm font-semibold md:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 hover:bg-muted">
              {label}
            </Link>
          ))}
          <Link href="/gop-y" className="rounded-md bg-sun-soft px-3 py-2 hover:bg-sun/40">
            💬 Góp ý
          </Link>
        </nav>
        <Link
          href="/login"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white"
        >
          <LogIn className="size-4" aria-hidden="true" />
          Đăng nhập
        </Link>
      </div>
    </header>
  );
}
