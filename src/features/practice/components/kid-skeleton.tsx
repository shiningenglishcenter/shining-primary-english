export function KidSkeleton() {
  return (
    <div className="min-h-dvh bg-k-bg" aria-label="Đang tải">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-6">
        <div className="h-12 w-40 animate-pulse rounded-2xl bg-k-line" />
        <div className="h-24 animate-pulse rounded-3xl bg-k-line" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-k-line" />
          ))}
        </div>
      </div>
    </div>
  );
}
