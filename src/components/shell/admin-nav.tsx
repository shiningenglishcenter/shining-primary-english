"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; exact?: boolean };

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/students", label: "Học sinh" },
  { href: "/admin/teachers", label: "Giáo viên" },
  { href: "/admin/classes", label: "Lớp học" },
  { href: "/admin/content", label: "Bài luyện" },
  { href: "/admin/results", label: "Kết quả" },
];

const TEACHER_ITEMS: NavItem[] = [
  { href: "/teacher", label: "Lớp của tôi", exact: true },
  { href: "/teacher/results", label: "Kết quả" },
  { href: "/teacher/content", label: "Bài luyện" },
];

/** The active tab depends on the URL, which streams in after the static shell. */
export function AdminNav() {
  return <StaffNav items={ADMIN_ITEMS} />;
}

export function TeacherNav() {
  return <StaffNav items={TEACHER_ITEMS} />;
}

function StaffNav({ items }: { items: NavItem[] }) {
  return (
    <Suspense fallback={<NavLinks items={items} pathname={null} />}>
      <CurrentNav items={items} />
    </Suspense>
  );
}

function CurrentNav({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <nav aria-label="Điều hướng" className="-mb-px flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active =
          pathname !== null &&
          (item.exact
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
