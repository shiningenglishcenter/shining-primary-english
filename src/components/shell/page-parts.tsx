import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Page title with an optional action on the right (e.g. "Thêm học sinh"). */
export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-sky hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.953rem] leading-tight font-semibold" data-testid="page-title">
            {title}
          </h1>
          {description ? <p className="mt-2 max-w-prose text-ink-soft">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6" data-testid={testId}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Wide data table that scrolls sideways on phones instead of breaking the page. */
export function DataTable({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-left text-sm" data-testid={testId}>
        {children}
      </table>
    </div>
  );
}

export const th =
  "border-b border-line bg-muted/60 px-4 py-3 text-xs font-semibold tracking-wide text-ink-soft uppercase";
export const td = "border-b border-line px-4 py-3 align-middle";
