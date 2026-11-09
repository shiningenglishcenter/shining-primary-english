import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpen, School, Users } from "lucide-react";
import { EmptyState, PageHeading, SectionSkeleton } from "@/components/shell/empty-state";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quản trị" };

async function CentreOverview() {
  await requireRole("admin");
  const supabase = await createClient();
  const [students, classes, teachers] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase.from("teachers").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  const figures = [
    { label: "Học sinh đang học", value: students.count ?? 0, icon: Users },
    { label: "Lớp đang mở", value: classes.count ?? 0, icon: School },
    { label: "Giáo viên", value: teachers.count ?? 0, icon: BookOpen },
  ];

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-3" data-testid="admin-figures">
        {figures.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5">
            <Icon className="size-6 text-sky" aria-hidden="true" />
            <div>
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {(students.count ?? 0) === 0 ? (
        <EmptyState icon={Users} title="Chưa có học sinh nào">
          Bản cập nhật tiếp theo sẽ có phần tạo tài khoản học sinh, phụ huynh, giáo viên và xếp lớp. Khi đó số
          liệu ở đây sẽ tự cập nhật.
        </EmptyState>
      ) : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeading title="Tổng quan trung tâm">Số liệu học sinh, lớp và giáo viên của trung tâm.</PageHeading>
      <Suspense fallback={<SectionSkeleton />}>
        <CentreOverview />
      </Suspense>
    </>
  );
}
