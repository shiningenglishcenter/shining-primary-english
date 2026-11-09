import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText, UserRound } from "lucide-react";
import { EmptyState, PageHeading, SectionSkeleton } from "@/components/shell/empty-state";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Phụ huynh" };

async function MyChildren() {
  await requireRole("parent");
  const supabase = await createClient();
  // RLS returns only children linked to this parent.
  const { data: children } = await supabase
    .from("students")
    .select("id, full_name, english_name")
    .order("full_name");

  return (
    <div className="flex flex-col gap-6">
      {children && children.length > 0 ? (
        <ul className="flex flex-col gap-3" data-testid="parent-children">
          {children.map((c) => (
            <li key={c.id} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5">
              <UserRound className="size-6 text-sky" aria-hidden="true" />
              <div>
                <p className="font-semibold">{c.full_name}</p>
                {c.english_name ? <p className="text-sm text-ink-soft">{c.english_name}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={UserRound} title="Chưa có thông tin con">
          Trung tâm chưa liên kết tài khoản của anh/chị với học sinh nào. Vui lòng liên hệ trung tâm.
        </EmptyState>
      )}
      <EmptyState icon={FileText} title="Chưa có báo cáo học tập">
        Báo cáo hằng tháng và kết quả bài kiểm tra của con sẽ hiện ở đây khi giáo viên gửi.
      </EmptyState>
    </div>
  );
}

export default function ParentDashboardPage() {
  return (
    <>
      <PageHeading title="Việc học của con">Theo dõi báo cáo và kết quả học tập.</PageHeading>
      <Suspense fallback={<SectionSkeleton />}>
        <MyChildren />
      </Suspense>
    </>
  );
}
