import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { listLevels } from "@/features/classes/queries";
import { NewClassForm } from "@/features/classes/components/class-forms";

export const metadata: Metadata = { title: "Thêm lớp" };

async function Form() {
  await requireRole("admin");
  const levels = await listLevels();
  return <NewClassForm levels={levels} />;
}

export default function NewClassPage() {
  return (
    <>
      <PageHeader title="Thêm lớp" back={{ href: "/admin/classes", label: "Danh sách lớp" }} />
      <Suspense fallback={<SectionSkeleton />}>
        <Form />
      </Suspense>
    </>
  );
}
