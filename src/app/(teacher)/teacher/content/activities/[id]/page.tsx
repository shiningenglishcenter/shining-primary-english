import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { ActivityEditorPage } from "@/features/content-editor/pages";

export const metadata: Metadata = { title: "Sửa bài luyện" };

export default function Page({ params }: PageProps<"/teacher/content/activities/[id]">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ActivityEditorPage base="/teacher/content" params={params} />
    </Suspense>
  );
}
