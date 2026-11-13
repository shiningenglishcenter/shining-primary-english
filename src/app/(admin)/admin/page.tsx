import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, MessageSquareHeart, School, Users } from "lucide-react";
import { newFeedbackCount } from "@/features/feedback/queries";
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
  const feedback = await newFeedbackCount();

  const figures = [
    { label: "Học sinh đang học", value: students.count ?? 0, icon: Users, href: "/admin/students" },
    { label: "Lớp đang mở", value: classes.count ?? 0, icon: School, href: "/admin/classes" },
    { label: "Giáo viên", value: teachers.count ?? 0, icon: BookOpen, href: "/admin/teachers" },
    { label: "Góp ý mới", value: feedback, icon: MessageSquareHeart, href: "/admin/gop-y" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-figures">
        {figures.map(({ label, value, icon: Icon, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-sky"
            >
              <Icon className="size-6 text-sky" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-soft">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {(students.count ?? 0) === 0 ? (
        <EmptyState icon={Users} title="Chưa có học sinh nào">
          Bắt đầu bằng cách{" "}
          <Link href="/admin/classes/new" className="font-semibold text-sky hover:underline">
            tạo lớp
          </Link>
          , rồi{" "}
          <Link href="/admin/students/new" className="font-semibold text-sky hover:underline">
            thêm học sinh
          </Link>{" "}
          và{" "}
          <Link href="/admin/teachers/new" className="font-semibold text-sky hover:underline">
            giáo viên
          </Link>
          .
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
