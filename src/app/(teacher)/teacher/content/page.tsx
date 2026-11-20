import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { ContentHome } from "@/features/content-editor/pages";

export const metadata: Metadata = { title: "Bài luyện" };

export default function Page({ searchParams }: PageProps<"/teacher/content">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ContentHome base="/teacher/content" searchParams={searchParams} />
    </Suspense>
  );
}
