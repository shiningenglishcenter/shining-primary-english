"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/students", label: "Học sinh" },
  { href: "/admin/teachers", label: "Giáo viên" },
  { href: "/admin/classes", label: "Lớp học" },
] as const;

/** The active tab depends on the URL, which streams in after the static shell. */
export function AdminNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <CurrentNav />
    </Suspense>
  );
}

function CurrentNav() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Quản trị" className="-mb-px flex gap-1 overflow-x-auto">
      {ITEMS.map((item) => {
        const active =
          pathname !== null &&
          ("exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "border-sun text-ink" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
