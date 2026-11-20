import { AppShell } from "@/components/shell/app-shell";
import { TeacherNav } from "@/components/shell/admin-nav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="teacher" nav={<TeacherNav />}>
      {children}
    </AppShell>
  );
}
