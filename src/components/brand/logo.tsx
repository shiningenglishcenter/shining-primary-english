import { cn } from "@/lib/utils";

/** Sun mark: a marigold disk with eight short rays. */
export function SunMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-8", className)}>
      <g stroke="var(--sun)" strokeWidth="3.5" strokeLinecap="round">
        {rays.map((deg) => (
          <line key={deg} x1="24" y1="3.5" x2="24" y2="9" transform={`rotate(${deg} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="10.5" fill="var(--sun)" />
    </svg>
  );
}

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      <SunMark />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-[0.08em]">SHINING</span>
        {subtitle ? <span className="mt-1 text-xs font-medium text-ink-soft">Primary English</span> : null}
      </span>
    </span>
  );
}
