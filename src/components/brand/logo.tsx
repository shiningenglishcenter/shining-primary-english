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

/**
 * Text version of the Shining English logo: "shining" over "en", a tall
 * sunshine "g" with three rays spanning both lines, then "lish".
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Shining English"
      className={cn("inline-flex items-end font-kid-display leading-none font-bold text-k-ink", className)}
    >
      <span className="flex flex-col items-end">
        <span className="text-[15px]">shining</span>
        <span className="text-[24px] leading-[0.9]">en</span>
      </span>
      <span className="relative -mb-[5px] text-[40px] leading-[0.9] text-[#FFB400]">
        g
        <svg viewBox="0 0 40 16" width="28" height="11" aria-hidden="true" className="absolute -top-2 left-0">
          <g stroke="#F28C1B" strokeWidth="3.5" strokeLinecap="round">
            <path d="M20 2v6" />
            <path d="M7 6l4 4" />
            <path d="M33 6l-4 4" />
          </g>
        </svg>
      </span>
      <span className="text-[24px] leading-[0.9]">lish</span>
    </span>
  );
}

/**
 * The SHINING logo used on every screen (staff, pupils, public pages): the
 * "shining english" wordmark. `subtitle` is kept for older call sites and
 * no longer shows anything.
 */
export function Logo({ className }: { className?: string; subtitle?: boolean }) {
  return <Wordmark className={className} />;
}
