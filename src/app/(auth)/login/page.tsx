import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

const NOTICES: Record<string, { text: string; variant: "info" | "destructive" }> = {
  expired: { text: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", variant: "info" },
  signed_out: { text: "Bạn đã đăng xuất.", variant: "info" },
  inactive: { text: "Tài khoản này đã bị tạm khoá. Vui lòng liên hệ trung tâm.", variant: "destructive" },
};

async function ReasonNotice({ searchParams }: { searchParams: Promise<{ reason?: string | string[] }> }) {
  const { reason } = await searchParams;
  const notice = typeof reason === "string" ? NOTICES[reason] : undefined;
  if (!notice) return null;
  return (
    <Alert variant={notice.variant} data-testid="login-notice">
      {notice.text}
    </Alert>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel: the one bold moment in the product. */}
      <section
        aria-hidden="true"
        className="relative flex min-h-44 overflow-hidden bg-ink px-6 pt-8 text-white lg:min-h-dvh lg:px-12 lg:pt-14"
      >
        <div className="relative z-10 max-w-[13.5rem] sm:max-w-sm">
          <p className="text-2xl leading-snug font-semibold lg:text-[2.441rem] lg:leading-[1.15]">
            Mỗi ngày một chút, tiếng Anh sáng lên.
          </p>
          <p className="mt-3 hidden text-white/75 lg:block">Starters, Movers, Flyers và Global Success</p>
        </div>
        {/* Phones: sun rises at the right edge, clear of the headline. Desktop: fills the panel's base. */}
        <div className="animate-sun-rise pointer-events-none absolute -right-20 -bottom-32 aspect-square w-64 lg:right-auto lg:-bottom-[22%] lg:-left-[12%] lg:w-[115%]">
          <div className="absolute inset-0 rounded-full bg-sun/15" />
          <div className="absolute inset-[11%] rounded-full bg-sun/25" />
          <div className="absolute inset-[22%] rounded-full bg-sun" />
        </div>
      </section>

      <section className="flex items-start justify-center px-5 py-10 sm:items-center lg:px-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-8" />
          <h1 className="mb-6 text-2xl font-semibold">Đăng nhập</h1>
          <div className="flex flex-col gap-5">
            <Suspense fallback={null}>
              <ReasonNotice searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<div className="h-80" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
