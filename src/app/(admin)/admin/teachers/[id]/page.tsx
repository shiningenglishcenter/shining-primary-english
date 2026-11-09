import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { PageHeader, Section } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { getLoginEmail } from "@/features/people/accounts";
import { generatePassword } from "@/features/people/credentials";
import { getTeacher } from "@/features/people/queries";
import { idSchema, TEACHER_ROLE_LABEL } from "@/features/people/schemas";
import { AccountPanel } from "@/features/people/components/account-panel";
import { EditTeacherForm } from "@/features/people/components/teacher-forms";

export const metadata: Metadata = { title: "Hồ sơ giáo viên" };

async function TeacherDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const teacher = await getTeacher(id);
  if (!teacher) notFound();
  const login = teacher.profile.username ?? (await getLoginEmail(teacher.profile.id)) ?? "";

  return (
    <>
      <PageHeader
        title={teacher.profile.full_name}
        back={{ href: "/admin/teachers", label: "Danh sách giáo viên" }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Thông tin giáo viên">
          <EditTeacherForm
            teacher={{ id: teacher.id, fullName: teacher.profile.full_name, phone: teacher.phone }}
          />
        </Section>
        <div className="flex flex-col gap-6">
          <Section title="Tài khoản đăng nhập">
            <AccountPanel
              account={{
                profileId: teacher.profile.id,
                login,
                isActive: teacher.profile.is_active,
                name: teacher.profile.full_name,
              }}
              initialPassword={generatePassword()}
            />
          </Section>
          <Section title="Lớp phụ trách" testId="teacher-classes">
            {teacher.classes.length === 0 ? (
              <p className="text-sm text-ink-soft">Chưa phụ trách lớp nào. Vào trang lớp học để phân công.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {teacher.classes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/classes/${c.id}`} className="font-semibold text-sky hover:underline">
                      {c.name}
                    </Link>
                    <span className="ml-2 text-ink-soft">{TEACHER_ROLE_LABEL[c.role]}</span>
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

export default function TeacherPage({ params }: PageProps<"/admin/teachers/[id]">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <TeacherDetail params={params} />
    </Suspense>
  );
}
