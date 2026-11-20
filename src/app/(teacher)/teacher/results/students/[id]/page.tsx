import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/empty-state";
import { StudentResults } from "@/features/results/pages";

export const metadata: Metadata = { title: "Kết quả học sinh" };

export default function Page({ params, searchParams }: PageProps<"/teacher/results/students/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudentResults base="/teacher/results" params={params} searchParams={searchParams} />
    </Suspense>
  );
}
