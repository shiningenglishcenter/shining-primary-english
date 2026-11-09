import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { PageHeader, Section } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { generatePassword, suggestUsername } from "@/features/people/credentials";
import { getStudent } from "@/features/people/queries";
import { idSchema } from "@/features/people/schemas";
import { EditStudentForm } from "@/features/people/components/student-forms";
import { AccountPanel, CreateStudentAccountForm } from "@/features/people/components/account-panel";

export const metadata: Metadata = { title: "Hồ sơ học sinh" };

async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <>
      <PageHeader
        title={student.fullName}
        description={`Mã học sinh ${student.code}`}
        back={{ href: "/admin/students", label: "Danh sách học sinh" }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Thông tin học sinh">
          <EditStudentForm student={student} />
        </Section>
        <div className="flex flex-col gap-6">
          <Section title="Tài khoản đăng nhập">
            {student.profile ? (
              <AccountPanel
                account={{
                  profileId: student.profile.id,
                  login: student.profile.username ?? "",
                  isActive: student.profile.is_active,
                  name: student.fullName,
                }}
                initialPassword={generatePassword()}
              />
            ) : (
              <CreateStudentAccountForm
                studentId={student.id}
                suggestedUsername={suggestUsername(student.fullName, "student")}
                initialPassword={generatePassword()}
              />
            )}
          </Section>
          <Section title="Lớp đang học" testId="student-classes">
            {student.classes.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Chưa xếp lớp. Vào trang lớp học để thêm học sinh vào lớp.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {student.classes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/classes/${c.id}`} className="font-semibold text-sky hover:underline">
                      {c.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-ink-soft">{c.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

export default function StudentPage({ params }: PageProps<"/admin/students/[id]">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <StudentDetail params={params} />
    </Suspense>
  );
}
