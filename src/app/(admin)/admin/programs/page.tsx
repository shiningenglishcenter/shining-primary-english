import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/empty-state";
import { PageHeader, Section } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { LevelForm, ProgramForm } from "@/features/programs/components/program-forms";
import { listProgramsForAdmin } from "@/features/programs/queries";

export const metadata: Metadata = { title: "Chương trình & trình độ" };

/** Programmes and their levels (D55): what teachers and pupils see as tabs. */
async function ProgramsView() {
  await requireRole("admin");
  const programs = await listProgramsForAdmin();
  return (
    <>
      <PageHeader
        title="Chương trình & trình độ"
        description="Các tab Cambridge / Global Success … và trình độ bên trong. Học sinh và giáo viên thấy chương trình và trình độ đang “Hiện”."
        back={{ href: "/admin/content", label: "Bài luyện" }}
      />
      {programs.length === 0 ? (
        <p className="text-ink-soft">Chưa đọc được danh sách. Cần chạy migration 0033 trên cơ sở dữ liệu.</p>
      ) : null}
      <div className="flex flex-col gap-6">
        {programs.map((p) => (
          <Section key={p.id} title={p.name} testId="program-section">
            <div className="flex flex-col gap-5">
              <ProgramForm program={p} />
              <div className="flex flex-col gap-3 rounded-lg bg-paper p-4">
                <h3 className="text-sm font-semibold">Trình độ ({p.levels.length})</h3>
                {p.levels.map((l) => (
                  <LevelForm key={l.id} programId={p.id} level={l} />
                ))}
                <div className="border-t border-line pt-3">
                  <LevelForm programId={p.id} />
                </div>
              </div>
            </div>
          </Section>
        ))}
        <Section title="Thêm chương trình mới">
          <ProgramForm />
        </Section>
      </div>
    </>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProgramsView />
    </Suspense>
  );
}
