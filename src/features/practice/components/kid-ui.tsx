import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { emojiSrc } from "@/features/practice/emoji";
import { levelsOf, PROGRAMS, type PracticeLevel } from "@/features/practice/model";
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
 * Text version of the Shining English logo: "shinin" over "en", a tall
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
        <span className="text-[15px]">shinin</span>
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

export function Stars({ value, of = 3, size = 18 }: { value: number; of?: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} trên ${of} sao`}>
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

/** Full-bleed page for students, in the shared kid theme (D27). */
export function KidPage({
  level,
  children,
  header = true,
}: {
  level: PracticeLevel;
  children: React.ReactNode;
  header?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-k-bg font-kid text-k-ink" data-level={level.slug}>
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 sm:px-6">
        {header ? (
          <header className="flex items-center justify-between gap-3 pt-4 pb-2">
            <Link href={`/learn?level=${level.slug}`} aria-label="Về trang chủ" className="rounded-lg">
              <Wordmark />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                data-testid="sign-out"
                className="flex h-11 items-center gap-2 rounded-full bg-k-surface px-4 text-sm font-extrabold text-k-ink shadow-[0_3px_0_var(--k-line)]"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Thoát
              </button>
            </form>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Programme tabs (Cambridge / Global Success), then that programme's levels. */
export function LevelTabs({ current }: { current: PracticeLevel }) {
  return (
    <div className="flex flex-col gap-2">
      <nav
        aria-label="Chọn chương trình"
        className="flex gap-2 rounded-full bg-k-surface p-1 shadow-[0_3px_0_var(--k-line)]"
      >
        {PROGRAMS.map((p) => {
          const active = p.code === current.program;
          return (
            <Link
              key={p.code}
              href={`/learn?level=${levelsOf(p.code)[0].slug}`}
              aria-current={active ? "page" : undefined}
              data-testid="program-tab"
              className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-full text-[16px] font-black transition-colors",
                active ? "bg-k-primary text-k-primary-ink" : "text-k-soft",
              )}
            >
              {p.name}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Chọn trình độ" className="flex gap-2">
        {levelsOf(current.program).map((l) => {
          const active = l.slug === current.slug;
          return (
            <Link
              key={l.slug}
              href={`/learn?level=${l.slug}`}
              aria-current={active ? "page" : undefined}
              data-testid="level-tab"
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-full text-[17px] font-black transition-colors",
                active
                  ? "kid-press bg-k-accent text-k-ink [--press:var(--k-accent-shadow)]"
                  : "border-2 border-k-line bg-k-surface text-k-ink",
              )}
            >
              {l.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
