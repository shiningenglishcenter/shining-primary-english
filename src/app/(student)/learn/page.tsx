import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpenCheck, Sparkles } from "lucide-react";
import { EmptyState, SectionSkeleton } from "@/components/shell/empty-state";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Học bài" };

async function StudentHome() {
  const user = await requireRole("student");
  const name = user.displayName ?? user.fullName;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-xl bg-sun-soft p-6">
        <Sparkles className="size-8 shrink-0 text-sun" aria-hidden="true" />
        <h1 className="text-2xl leading-snug font-semibold" data-testid="page-title">
          Hello, {name}!
        </h1>
      </div>
      <EmptyState icon={BookOpenCheck} title="Chưa có bài tập nào">
        Khi thầy cô giao bài, bài tập sẽ hiện ở đây để con làm.
      </EmptyState>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <StudentHome />
    </Suspense>
  );
}
