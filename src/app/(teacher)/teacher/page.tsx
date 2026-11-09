import type { Metadata } from "next";
import { Suspense } from "react";
import { School } from "lucide-react";
import { EmptyState, PageHeading, SectionSkeleton } from "@/components/shell/empty-state";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Giáo viên" };

async function MyClasses() {
  await requireRole("teacher");
  const supabase = await createClient();
  // RLS returns only the classes this teacher is currently assigned to.
  const { data: classes } = await supabase
    .from("classes")
    .select("id, code, name, schedule_note")
    .eq("is_active", true)
    .order("code");

  if (!classes || classes.length === 0) {
    return (
      <EmptyState icon={School} title="Bạn chưa được phân công lớp nào">
        Khi quản trị viên xếp bạn vào lớp, danh sách lớp và học sinh sẽ hiện ở đây.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="teacher-classes">
      {classes.map((c) => (
        <li key={c.id} className="rounded-lg border border-line bg-surface p-5">
          <p className="text-sm font-medium text-ink-soft">{c.code}</p>
          <p className="mt-1 font-semibold">{c.name}</p>
          {c.schedule_note ? <p className="mt-2 text-sm text-ink-soft">{c.schedule_note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default function TeacherDashboardPage() {
  return (
    <>
      <PageHeading title="Lớp của tôi">Các lớp bạn đang dạy.</PageHeading>
      <Suspense fallback={<SectionSkeleton />}>
        <MyClasses />
      </Suspense>
    </>
  );
}
