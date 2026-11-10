import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KidPage, LevelTabs, Pic, StarBadge, Stars, Sunny } from "@/features/practice/components/kid-ui";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { levelByCode, levelBySlug, PRACTICE_LEVELS } from "@/features/practice/model";
import { listTopics } from "@/features/practice/queries";

export const metadata: Metadata = { title: "Học bài" };

type SearchParams = Promise<{ level?: string | string[] }>;

/** Without ?level=, open the level of the student's class (else Starters). */
async function defaultLevelSlug(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("level:levels!classes_primary_level_id_fkey(code)")
    .eq("is_active", true)
    .limit(5);
  for (const row of data ?? []) {
    const lvl = levelByCode((row.level as unknown as { code: string } | null)?.code);
    if (lvl) return lvl.slug;
  }
  return PRACTICE_LEVELS[0].slug;
}

async function StudentHome({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student");
  const sp = await searchParams;
  const requested = typeof sp.level === "string" ? sp.level : undefined;
  const level = levelBySlug(requested ?? (await defaultLevelSlug()));
  const topics = await listTopics(level);
  const name = user.displayName ?? user.fullName;
  const totalStars = topics.reduce((n, t) => n + t.stars, 0);
  const done = topics.reduce((n, t) => n + t.done, 0);
  const total = topics.reduce((n, t) => n + t.activityCount, 0);

  return (
    <KidPage level={level}>
      <section className="mt-2 flex items-center gap-3 rounded-3xl bg-k-surface p-3 shadow-[0_3px_0_var(--k-line)] sm:p-4">
        <Sunny size={72} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-k-soft">Sunny chào con!</p>
          <h1
            className="font-kid-display text-[22px] leading-tight font-bold break-words sm:text-[26px]"
            data-testid="page-title"
          >
            Hello, {name}!
          </h1>
        </div>
        <StarBadge value={totalStars} />
      </section>

      <div className="mt-4">
        <LevelTabs current={level} />
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h2 className="font-kid-display text-[22px] font-bold">Chủ đề {level.name}</h2>
        {total > 0 ? (
          <span className="text-[15px] font-bold text-k-soft">
            {done}/{total} bài đã làm
          </span>
        ) : null}
      </div>

      {topics.length === 0 ? (
        <div
          className="mt-4 flex flex-col items-center gap-3 rounded-3xl bg-k-surface p-8 text-center"
          data-testid="no-topics"
        >
          <Sunny mood="think" size={96} />
          <p className="font-kid-display text-2xl font-bold">Bài luyện {level.name} sắp có!</p>
          <p className="max-w-sm text-base font-bold text-k-soft">
            Thầy cô đang chuẩn bị bài. Trong lúc chờ, con luyện{" "}
            <Link href="/learn?level=starters" className="underline">
              Starters
            </Link>{" "}
            nhé.
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="topic-list">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/learn/topics/${t.id}`}
                className="kid-press flex h-full flex-col items-center gap-1 rounded-3xl bg-k-surface px-2 pt-3 pb-3 text-center"
                data-testid="topic"
              >
                <span className="flex size-20 items-center justify-center rounded-full bg-k-tile">
                  <Pic code={t.emoji} size={60} />
                </span>
                <span className="mt-1 text-[19px] leading-tight font-black">{t.titleEn}</span>
                <span className="text-sm font-bold text-k-soft">{t.titleVi}</span>
                <Stars value={t.maxStars ? Math.round((t.stars / t.maxStars) * 3) : 0} />
                <span className="text-xs font-bold text-k-soft">
                  {t.done}/{t.activityCount} bài
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </KidPage>
  );
}

export default function StudentDashboardPage({ searchParams }: PageProps<"/learn">) {
  return (
    <Suspense fallback={<KidSkeleton />}>
      <StudentHome searchParams={searchParams} />
    </Suspense>
  );
}
