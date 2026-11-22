import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KidPage, LevelTabs } from "@/features/practice/components/kid-page";
import { Pic, StarBadge, Stars, Sunny } from "@/features/practice/components/kid-ui";
import { getMessages } from "@/features/i18n/server";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { levelByCode, levelBySlug, topicNoun, type LevelCatalog } from "@/features/practice/model";
import { getLevelCatalog } from "@/features/practice/catalog";
import { listTopics } from "@/features/practice/queries";
import { missedWords } from "@/features/practice/review";

export const metadata: Metadata = { title: "Học bài" };

type SearchParams = Promise<{ level?: string | string[] }>;

/** Without ?level=, open the level of the student's class (else Starters). */
async function defaultLevelSlug(cat: LevelCatalog): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("level:levels!classes_primary_level_id_fkey(code)")
    .eq("is_active", true)
    .limit(5);
  for (const row of data ?? []) {
    const lvl = levelByCode((row.level as unknown as { code: string } | null)?.code, cat);
    if (lvl) return lvl.slug;
  }
  return cat.levels[0]!.slug;
}

async function StudentHome({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const requested = typeof sp.level === "string" ? sp.level : undefined;
  // Independent round trips run together (RLS still guards the class read).
  const cat = await getLevelCatalog();
  const [user, slug] = await Promise.all([requireRole("student"), requested ?? defaultLevelSlug(cat)]);
  const level = levelBySlug(slug, cat);
  const [topics, { lang, t: m }, missed] = await Promise.all([
    listTopics(level),
    getMessages(),
    missedWords(),
  ]);
  const name = user.displayName ?? user.fullName;
  const totalStars = topics.reduce((n, t) => n + t.stars, 0);
  const done = topics.reduce((n, t) => n + t.done, 0);
  const total = topics.reduce((n, t) => n + t.activityCount, 0);

  return (
    <KidPage level={level}>
      <section className="mt-2 flex items-center gap-3 rounded-3xl bg-k-surface p-3 shadow-[0_3px_0_var(--k-line)] sm:p-4">
        <Sunny size={72} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-k-soft">{m.greeting}</p>
          <h1
            className="font-kid-display text-[22px] leading-tight font-bold break-words sm:text-[26px]"
            data-testid="page-title"
          >
            {m.hello(name)}
          </h1>
        </div>
        <StarBadge value={totalStars} />
      </section>

      <div className="mt-4">
        <LevelTabs current={level} />
      </div>

      {missed.length > 0 ? (
        <Link
          href="/learn/review"
          className="kid-press mt-4 flex items-center gap-3 rounded-3xl bg-k-accent-soft px-4 py-3"
          data-testid="review-card"
        >
          <Sunny mood="think" size={48} className="shrink-0" />
          <span className="flex-1">
            <span className="block font-kid-display text-lg font-bold">{m.missedCard(missed.length)}</span>
            <span className="text-sm font-bold text-k-soft">{m.missedCardHint}</span>
          </span>
          <span aria-hidden="true" className="text-2xl">
            →
          </span>
        </Link>
      ) : null}

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h2 className="font-kid-display text-[22px] font-bold">
          {m.topicsOf(topicNoun(level) === "Unit" ? "unit" : "topic", level.name)}
        </h2>
        {total > 0 ? (
          <span className="text-[15px] font-bold text-k-soft">{m.doneOf(done, total)}</span>
        ) : null}
      </div>

      {topics.length === 0 ? (
        <div
          className="mt-4 flex flex-col items-center gap-3 rounded-3xl bg-k-surface p-8 text-center"
          data-testid="no-topics"
        >
          <Sunny mood="think" size={96} />
          <p className="font-kid-display text-2xl font-bold">{m.comingSoon(level.name)}</p>
          <p className="max-w-sm text-base font-bold text-k-soft">
            {m.comingSoonHint}{" "}
            <Link href="/learn?level=starters" className="underline">
              Starters
            </Link>{" "}
            {m.comingSoonOr}{" "}
            <Link href="/learn?level=g1" className="underline">
              G1
            </Link>
            .
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
                {lang === "vi" ? <span className="text-sm font-bold text-k-soft">{t.titleVi}</span> : null}
                <TopicStars
                  value={t.maxStars ? Math.round((t.stars / t.maxStars) * 3) : 0}
                  label={m.starsOf}
                />
                <span className="text-xs font-bold text-k-soft">
                  {m.activitiesOf(t.done, t.activityCount)}
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

function TopicStars({ value, label }: { value: number; label: (n: number) => string }) {
  return <Stars value={value} label={label(value)} />;
}
