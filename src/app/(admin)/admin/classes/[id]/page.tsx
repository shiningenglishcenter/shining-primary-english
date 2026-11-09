import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { PageHeader, Section } from "@/components/shell/page-parts";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getClass, listEnrolCandidates, listLevels, listTeacherOptions } from "@/features/classes/queries";
import { idSchema, TEACHER_ROLE_LABEL } from "@/features/people/schemas";
import {
  AssignTeacherForm,
  EditClassForm,
  EnrolStudentsForm,
  RemoveMemberButton,
} from "@/features/classes/components/class-forms";

export const metadata: Metadata = { title: "Lớp học" };

async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const cls = await getClass(id);
  if (!cls) notFound();

  const [levels, candidates, teacherOptions] = await Promise.all([
    listLevels(),
    listEnrolCandidates(
      cls.id,
      cls.students.map((s) => s.id),
    ),
    listTeacherOptions(),
  ]);
  const assigned = new Set(cls.teachers.map((t) => t.id));
  const assignable = teacherOptions.filter((t) => t.isActive && !assigned.has(t.id));

  return (
    <>
      <PageHeader
        title={cls.name}
        description={`Mã lớp ${cls.code}${cls.isActive ? "" : " · Lớp đã đóng"}`}
        back={{ href: "/admin/classes", label: "Danh sách lớp" }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Section
            title={`Học sinh trong lớp (${cls.students.length})`}
            description="Học sinh trong lớp sẽ nhận bài tập giao cho lớp này."
            testId="class-students"
          >
            {cls.students.length === 0 ? (
              <p className="text-sm text-ink-soft">Lớp chưa có học sinh.</p>
            ) : (
              <ul className="divide-y divide-line rounded-md border border-line">
                {cls.students.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="font-semibold hover:text-sky hover:underline"
                    >
                      {s.fullName}
                    </Link>
                    {s.englishName ? <span className="text-ink-soft">({s.englishName})</span> : null}
                    <span className="font-mono text-xs text-ink-soft">{s.code}</span>
                    <span className="ml-auto">
                      <RemoveMemberButton kind="student" classId={cls.id} memberId={s.id} name={s.fullName} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Thêm học sinh vào lớp">
            <EnrolStudentsForm classId={cls.id} candidates={candidates} />
            <Button asChild variant="link" className="mt-2 h-auto px-0">
              <Link href={`/admin/students/new?classId=${cls.id}`}>
                <Plus aria-hidden="true" />
                Tạo học sinh mới cho lớp này
              </Link>
            </Button>
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section title="Giáo viên phụ trách" testId="class-teachers">
            {cls.teachers.length === 0 ? (
              <p className="mb-4 text-sm text-ink-soft">Chưa phân công giáo viên.</p>
            ) : (
              <ul className="mb-5 divide-y divide-line rounded-md border border-line">
                {cls.teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-semibold">{t.fullName}</span>
                    <span className="text-ink-soft">{TEACHER_ROLE_LABEL[t.role]}</span>
                    <span className="ml-auto">
                      <RemoveMemberButton kind="teacher" classId={cls.id} memberId={t.id} name={t.fullName} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <AssignTeacherForm classId={cls.id} teachers={assignable} />
          </Section>
          <Section title="Thông tin lớp">
            <EditClassForm levels={levels} cls={cls} />
          </Section>
        </div>
      </div>
    </>
  );
}

export default function ClassPage({ params }: PageProps<"/admin/classes/[id]">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ClassDetail params={params} />
    </Suspense>
  );
}
