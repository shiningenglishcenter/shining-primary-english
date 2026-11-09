import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { EmptyState, SectionSkeleton } from "@/components/shell/empty-state";
import { DataTable, PageHeader, td, th } from "@/components/shell/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listTeachers } from "@/features/people/queries";

export const metadata: Metadata = { title: "Giáo viên" };

async function TeacherTable() {
  await requireRole("admin");
  const teachers = await listTeachers();
  if (teachers.length === 0) {
    return (
      <EmptyState icon={GraduationCap} title="Chưa có giáo viên nào">
        Bấm “Thêm giáo viên” để tạo tài khoản. Giáo viên đăng nhập để giao bài và chấm bài cho lớp mình.
      </EmptyState>
    );
  }
  return (
    <DataTable testId="teacher-table">
      <thead>
        <tr>
          <th className={th}>Họ và tên</th>
          <th className={th}>Lớp phụ trách</th>
          <th className={th}>Điện thoại</th>
          <th className={th}>Tài khoản</th>
        </tr>
      </thead>
      <tbody>
        {teachers.map((t) => (
          <tr key={t.id} className="hover:bg-muted/40">
            <td className={td}>
              <Link
                href={`/admin/teachers/${t.id}`}
                className="font-semibold text-ink hover:text-sky hover:underline"
              >
                {t.fullName}
              </Link>
            </td>
            <td className={td}>
              {t.classes.length > 0 ? t.classes.join(", ") : <span className="text-ink-soft">—</span>}
            </td>
            <td className={td}>{t.phone ?? <span className="text-ink-soft">—</span>}</td>
            <td className={td}>
              {t.accountActive ? (
                <Badge tone="success">Đang hoạt động</Badge>
              ) : (
                <Badge tone="danger">Đã khoá</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export default function TeachersPage() {
  return (
    <>
      <PageHeader
        title="Giáo viên"
        description="Tài khoản giáo viên và các lớp họ phụ trách."
        action={
          <Button asChild>
            <Link href="/admin/teachers/new">
              <Plus aria-hidden="true" />
              Thêm giáo viên
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<SectionSkeleton />}>
        <TeacherTable />
      </Suspense>
    </>
  );
}
