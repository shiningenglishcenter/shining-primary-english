import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { generatePassword } from "@/features/people/credentials";
import { NewTeacherForm } from "@/features/people/components/teacher-forms";

export const metadata: Metadata = { title: "Thêm giáo viên" };

async function Form() {
  await requireRole("admin");
  return <NewTeacherForm initialPassword={generatePassword()} />;
}

export default function NewTeacherPage() {
  return (
    <>
      <PageHeader
        title="Thêm giáo viên"
        description="Giáo viên đăng nhập bằng tên đăng nhập hoặc email của mình."
        back={{ href: "/admin/teachers", label: "Danh sách giáo viên" }}
      />
      <Suspense fallback={<SectionSkeleton />}>
        <Form />
      </Suspense>
    </>
  );
}
