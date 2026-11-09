import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { EmptyState, SectionSkeleton } from "@/components/shell/empty-state";
import { DataTable, PageHeader, td, th } from "@/components/shell/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/session";
import { listStudents } from "@/features/people/queries";
import { STUDENT_STATUS_LABEL } from "@/features/people/schemas";

export const metadata: Metadata = { title: "Học sinh" };

type SearchParams = Promise<{ q?: string | string[]; page?: string | string[] }>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function StudentTable({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 60) ?? "";
  const page = Number(one(sp.page)) || 1;
  const { items, total, pageCount } = await listStudents({ q, page });

  return (
    <div className="flex flex-col gap-4">
      <form className="flex max-w-md gap-2" role="search">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tên hoặc mã học sinh"
            aria-label="Tìm học sinh"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" className="h-12">
          Tìm
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={Users} title={q ? "Không tìm thấy học sinh nào" : "Chưa có học sinh nào"}>
          {q
            ? "Thử tìm bằng tên khác hoặc mã học sinh."
            : "Bấm “Thêm học sinh” để tạo hồ sơ và tài khoản đầu tiên."}
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-ink-soft" data-testid="student-count">
            {total} học sinh
          </p>
          <DataTable testId="student-table">
            <thead>
              <tr>
                <th className={th}>Mã</th>
                <th className={th}>Họ và tên</th>
                <th className={th}>Lớp</th>
                <th className={th}>Tên đăng nhập</th>
                <th className={th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className={`${td} font-mono text-xs text-ink-soft`}>{s.code}</td>
                  <td className={td}>
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="font-semibold text-ink hover:text-sky hover:underline"
                    >
                      {s.fullName}
                    </Link>
                    {s.englishName ? <span className="ml-1 text-ink-soft">({s.englishName})</span> : null}
                  </td>
                  <td className={td}>
                    {s.classes.length > 0 ? s.classes.join(", ") : <span className="text-ink-soft">—</span>}
                  </td>
                  <td className={td}>
                    {s.hasAccount ? (
                      <span className="font-mono text-xs">
                        {s.username}
                        {!s.accountActive ? (
                          <Badge tone="danger" className="ml-2">
                            Đã khoá
                          </Badge>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-ink-soft">Chưa có</span>
                    )}
                  </td>
                  <td className={td}>
                    <Badge
                      tone={s.status === "active" ? "success" : s.status === "paused" ? "warning" : "neutral"}
                    >
                      {STUDENT_STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {pageCount > 1 ? (
            <nav className="flex items-center gap-3 text-sm" aria-label="Trang">
              {page > 1 ? (
                <Link
                  className="font-semibold text-sky hover:underline"
                  href={{ query: { q, page: page - 1 } }}
                >
                  ← Trang trước
                </Link>
              ) : null}
              <span className="text-ink-soft">
                Trang {page}/{pageCount}
              </span>
              {page < pageCount ? (
                <Link
                  className="font-semibold text-sky hover:underline"
                  href={{ query: { q, page: page + 1 } }}
                >
                  Trang sau →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  return (
    <>
      <PageHeader
        title="Học sinh"
        description="Hồ sơ, tài khoản đăng nhập và lớp của học sinh."
        action={
          <Button asChild>
            <Link href="/admin/students/new">
              <Plus aria-hidden="true" />
              Thêm học sinh
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<SectionSkeleton />}>
        <StudentTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}
