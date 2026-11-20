import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/empty-state";
import { ResultsHome } from "@/features/results/pages";

export const metadata: Metadata = { title: "Kết quả" };

export default function Page({ searchParams }: PageProps<"/teacher/results">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResultsHome base="/teacher/results" searchParams={searchParams} />
    </Suspense>
  );
}
