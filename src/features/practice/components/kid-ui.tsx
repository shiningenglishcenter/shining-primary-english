import Image from "next/image";
import { emojiSrc } from "@/features/practice/emoji";
import { cn } from "@/lib/utils";

/** Sunny, the SHINING sun from the logo, as the children's guide. */
export function Sunny({
  mood = "happy",
  size = 72,
  className,
}: {
  mood?: "happy" | "cheer" | "think";
  size?: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" className={className}>
      <g stroke="#F28C1B" strokeWidth="8" strokeLinecap="round">
        <path d="M60 6v14" />
        <path d="M22 22l10 10" />
        <path d="M98 22l-10 10" />
        <path d="M6 60h14" />
        <path d="M100 60h14" />
      </g>
      <circle cx="60" cy="64" r="34" fill="#FFC61A" />
      {mood === "cheer" ? (
        <>
          <path
            d="M42 58 Q48 51 54 58"
            stroke="#3A3A3C"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M66 58 Q72 51 78 58"
            stroke="#3A3A3C"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M44 70 Q60 90 76 70 Z" fill="#3A3A3C" />
        </>
      ) : (
        <>
          <circle cx="48" cy="58" r="5" fill="#3A3A3C" />
          <circle cx="72" cy="58" r="5" fill="#3A3A3C" />
          {mood === "think" ? (
            <path d="M50 76 H70" stroke="#3A3A3C" strokeWidth="4.5" strokeLinecap="round" />
          ) : (
            <path
              d="M47 72 Q60 84 73 72"
              stroke="#3A3A3C"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </>
      )}
      <circle cx="40" cy="70" r="5" fill="#FF9F80" opacity=".8" />
      <circle cx="80" cy="70" r="5" fill="#FF9F80" opacity=".8" />
    </svg>
  );
}

/**
 * Text version of the Shining English logo: "shining" over "english", the
 * last "g" of shining in sunshine yellow with three rays above it.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Shining English"
      className={cn("inline-flex flex-col font-kid-display leading-[0.95] font-bold text-k-ink", className)}
    >
      <span className="text-[22px]">
        shinin
        <span className="relative text-[#FFB400]">
          g
          <svg
            viewBox="0 0 40 16"
            width="18"
            height="8"
            aria-hidden="true"
            className="absolute -top-1.5 left-1/2 -translate-x-1/2"
          >
            <g stroke="#F28C1B" strokeWidth="4" strokeLinecap="round">
              <path d="M20 2v6" />
              <path d="M7 6l4 4" />
              <path d="M33 6l-4 4" />
            </g>
          </svg>
        </span>
      </span>
      <span className="text-[22px]">english</span>
    </span>
  );
}

export function Pic({
  code,
  size = 64,
  alt = "",
  className,
}: {
  code: string | null | undefined;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const src = emojiSrc(code);
  if (!src) return <span style={{ width: size, height: size }} className={cn("inline-block", className)} />;
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn("pointer-events-none select-none", className)}
    />
  );
}

function StarIcon({ on, size }: { on: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
        className={on ? "fill-k-star" : "fill-k-star-off"}
      />
    </svg>
  );
}

/** `label` is the spoken text, in the student's language (e.g. t.starsOf(value)). */
export function Stars({
  value,
  of = 3,
  size = 18,
  label,
  className,
}: {
  value: number;
  of?: number;
  size?: number;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={label}>
      {Array.from({ length: of }, (_, i) => (
        <StarIcon key={i} on={i < value} size={size} />
      ))}
    </span>
  );
}

export function StarBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-k-surface px-3.5 py-1.5 text-lg font-black text-k-ink shadow-[0_3px_0_var(--k-line)]">
      <StarIcon on size={22} />
      <span data-testid="star-total">{value}</span>
    </span>
  );
}
