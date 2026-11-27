import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { GuideHeader } from "@/features/guide/header";

export const metadata: Metadata = {
  title: "Giáo trình",
  description: "Sơ đồ giáo trình SHINING English Application: chương trình, cấp độ, sách và cấu trúc mỗi unit.",
};

/** Public curriculum map (D37): one picture, made from the level packs' counts. */
export default function CurriculumPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <GuideHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
        <h1 className="sr-only" data-testid="page-title">
          Giáo trình SHINING English Application
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold">
          <a
            href="/guide/giao-trinh.png"
            download
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 hover:border-sky"
          >
            <Download className="size-4" aria-hidden="true" />
            Tải ảnh
          </a>
        </div>
        <a
          href="/guide/giao-trinh.webp"
          target="_blank"
          rel="noreferrer"
          title="Bấm để xem ảnh lớn"
          className="block overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
        >
          <Image
            src="/guide/giao-trinh.webp"
            alt="Sơ đồ giáo trình: SHINING English Application gồm Cambridge (Starters – sách Start!, Movers – sách Move!, Flyers – sách Fly!, mỗi cấp 17 unit) và Global Success (G1–G5 theo SGK Tiếng Anh 1–5). Mỗi unit gồm từ vựng, mẫu câu, ngữ âm và khoảng 14 bài luyện."
            width={2496}
            height={1600}
            unoptimized
            priority
            className="h-auto w-full"
          />
        </a>
        <p className="text-center text-sm text-ink-soft">
          Bấm vào ảnh để xem lớn ·{" "}
          <Link href="/huong-dan" className="font-semibold text-sky underline">
            Xem hướng dẫn sử dụng
          </Link>
        </p>
      </main>
    </div>
  );
}
