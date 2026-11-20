import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/empty-state";
import { ResultsHome } from "@/features/results/pages";

export const metadata: Metadata = { title: "Kết quả" };

export default function Page({ searchParams }: PageProps<"/admin/results">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResultsHome base="/admin/results" searchParams={searchParams} />
    </Suspense>
  );
}
