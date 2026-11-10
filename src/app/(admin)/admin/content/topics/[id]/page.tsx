import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { TopicEditorPage } from "@/features/content-editor/pages";

export const metadata: Metadata = { title: "Sửa chủ đề" };

export default function Page({ params }: PageProps<"/admin/content/topics/[id]">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <TopicEditorPage base="/admin/content" params={params} />
    </Suspense>
  );
}
