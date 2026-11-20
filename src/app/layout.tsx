import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NavProgress } from "@/components/shell/nav-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SHINING Primary English", template: "%s · SHINING" },
  description: "Học tiếng Anh tiểu học tại Trung tâm Anh ngữ SHINING.",
  // Private learning platform: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1f2a5a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-dvh">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
