import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, School } from "lucide-react";
import { EmptyState, SectionSkeleton } from "@/components/shell/empty-state";
import { DataTable, PageHeader, td, th } from "@/components/shell/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listClasses } from "@/features/classes/queries";

export const metadata: Metadata = { title: "Lớp học" };

async function ClassTable() {
  await requireRole("admin");
  const classes = await listClasses();
  if (classes.length === 0) {
    return (
      <EmptyState icon={School} title="Chưa có lớp nào">
        Bấm “Thêm lớp” để tạo lớp, sau đó xếp học sinh và phân công giáo viên.
      </EmptyState>
    );
  }
  return (
    <DataTable testId="class-table">
      <thead>
        <tr>
          <th className={th}>Lớp</th>
          <th className={th}>Trình độ</th>
          <th className={th}>Sĩ số</th>
          <th className={th}>Giáo viên</th>
          <th className={th}>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((c) => (
          <tr key={c.id} className="hover:bg-muted/40">
            <td className={td}>
              <Link
                href={`/admin/classes/${c.id}`}
                className="font-semibold text-ink hover:text-sky hover:underline"
              >
                {c.name}
              </Link>
              <span className="ml-2 font-mono text-xs text-ink-soft">{c.code}</span>
            </td>
            <td className={td}>{c.level ?? <span className="text-ink-soft">—</span>}</td>
            <td className={`${td} tabular-nums`}>{c.studentCount}</td>
            <td className={td}>
              {c.teachers.length > 0 ? (
                c.teachers.join(", ")
              ) : (
                <span className="text-ink-soft">Chưa phân công</span>
              )}
            </td>
            <td className={td}>
              {c.isActive ? <Badge tone="success">Đang mở</Badge> : <Badge tone="neutral">Đã đóng</Badge>}
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export default function ClassesPage() {
  return (
    <>
      <PageHeader
        title="Lớp học"
        description="Lớp, trình độ, học sinh và giáo viên phụ trách."
        action={
          <Button asChild>
            <Link href="/admin/classes/new">
              <Plus aria-hidden="true" />
              Thêm lớp
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<SectionSkeleton />}>
        <ClassTable />
      </Suspense>
    </>
  );
}
