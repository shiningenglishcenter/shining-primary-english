import type { LucideIcon } from "lucide-react";

/** An empty screen tells the person what will appear here and what to do. */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line bg-surface p-6">
      <span className="flex size-11 items-center justify-center rounded-full bg-sun-soft text-ink">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-1 max-w-prose text-sm text-ink-soft">{children}</div>
      </div>
    </div>
  );
}

export function PageHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.953rem] leading-tight font-semibold" data-testid="page-title">
        {title}
      </h1>
      {children ? <p className="mt-2 max-w-prose text-ink-soft">{children}</p> : null}
    </div>
  );
}

export function SectionSkeleton() {
  return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-label="Đang tải" />;
}

/** Route-level fallback for staff pages (`loading.tsx`): heading + content blocks. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Đang tải" aria-busy="true" data-testid="page-skeleton">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
