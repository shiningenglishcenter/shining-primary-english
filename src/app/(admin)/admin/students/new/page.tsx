import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { listOpenClasses } from "@/features/classes/queries";
import { generatePassword } from "@/features/people/credentials";
import { NewStudentForm } from "@/features/people/components/student-forms";

export const metadata: Metadata = { title: "Thêm học sinh" };

async function Form({ searchParams }: { searchParams: Promise<{ classId?: string | string[] }> }) {
  await requireRole("admin");
  const [classes, sp] = await Promise.all([listOpenClasses(), searchParams]);
  const classId =
    typeof sp.classId === "string" && classes.some((c) => c.id === sp.classId) ? sp.classId : undefined;
  return <NewStudentForm classes={classes} initialPassword={generatePassword()} defaultClassId={classId} />;
}

export default function NewStudentPage({ searchParams }: PageProps<"/admin/students/new">) {
  return (
    <>
      <PageHeader
        title="Thêm học sinh"
        description="Chỉ lưu thông tin cần cho việc học: không cần ngày sinh, ảnh hay địa chỉ."
        back={{ href: "/admin/students", label: "Danh sách học sinh" }}
      />
      <Suspense fallback={<SectionSkeleton />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}
