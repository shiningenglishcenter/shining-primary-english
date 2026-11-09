import { AppShell } from "@/components/shell/app-shell";
import { AdminNav } from "@/components/shell/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="admin" nav={<AdminNav />}>
      {children}
    </AppShell>
  );
}
