import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { DIFFICULTY_EN, DIFFICULTY_OF, DIFFICULTY_VI, type PracticeKind } from "@/features/practice/model";
import { ActivityFilter, type ActivityFilterKey } from "@/features/practice/components/activity-filter";
import { LinkPending } from "@/features/practice/components/link-pending";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { KidPage } from "@/features/practice/components/kid-page";
import { Pic, Stars } from "@/features/practice/components/kid-ui";
import { getMessages } from "@/features/i18n/server";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { KIND_ICON } from "@/features/practice/components/kind-icon";
import { getTopic } from "@/features/practice/queries";
import { PatternsCard } from "@/features/practice/components/patterns-card";

export const metadata: Metadata = { title: "Chủ đề" };

async function TopicView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [, topic, { lang, t }] = await Promise.all([requireRole("student"), getTopic(id), getMessages()]);
  if (!topic) notFound();

  return (
    <KidPage level={topic.level}>
      <Link
        href={`/learn?level=${topic.level.slug}`}
        className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-k-surface px-4 py-2 text-base font-extrabold shadow-[0_3px_0_var(--k-line)]"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        {t.back}
        <LinkPending />
      </Link>

      <section className="mt-4 flex items-center gap-4">
        <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-k-surface shadow-[0_4px_0_var(--k-line)]">
          <Pic code={topic.emoji} size={72} className="animate-kid-float" />
        </span>
        <div>
          <h1 className="font-kid-display text-[30px] leading-tight font-bold" data-testid="page-title">
            {topic.titleEn}
          </h1>
          {lang === "vi" ? <p className="text-lg font-bold text-k-soft">{topic.titleVi}</p> : null}
        </div>
      </section>

      <PatternsCard patterns={topic.patterns} voices={topic.voices} />

      <ActivityFilter counts={filterCounts(topic.activities)}>
        <ol className="mt-3 flex flex-col gap-3" data-testid="activity-list">
          {topic.activities.map((a, i) => {
            const Icon = KIND_ICON[a.kind];
            return (
              <li
                key={a.id}
                data-activity
                data-difficulty={DIFFICULTY_OF[a.kind]}
                data-done={a.stars > 0 ? "" : undefined}
              >
                <Link
                  href={`/learn/play/${a.id}`}
                  className="kid-press flex items-center gap-4 rounded-3xl bg-k-surface p-3 pr-4"
                  data-testid="activity"
                  data-kind={a.kind}
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-k-accent-soft text-k-accent-ink">
                    <Icon className="size-7" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 text-xs font-black tracking-wide text-k-soft uppercase">
                      {t.activityN(i + 1)}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 tracking-normal normal-case",
                          DIFFICULTY_OF[a.kind] === "easy"
                            ? "bg-k-good-soft text-k-good"
                            : DIFFICULTY_OF[a.kind] === "medium"
                              ? "bg-k-accent-soft text-k-accent-ink"
                              : "bg-k-bad-soft text-k-bad",
                        )}
                        data-testid="difficulty"
                      >
                        {(lang === "vi" ? DIFFICULTY_VI : DIFFICULTY_EN)[DIFFICULTY_OF[a.kind]]}
                      </span>
                    </span>
                    <span className="text-lg leading-tight font-black">
                      {lang === "vi" ? a.titleVi : a.titleEn}
                    </span>
                    {lang === "vi" ? (
                      <span className="text-sm font-bold text-k-soft">{a.titleEn}</span>
                    ) : null}
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Stars value={a.stars} label={t.starsOf(a.stars)} />
                    <span className="rounded-xl bg-k-primary px-3 py-1 text-sm font-black text-k-primary-ink">
                      {a.stars > 0 ? t.playAgain : t.play}
                    </span>
                  </span>
                  <LinkPending />
                </Link>
              </li>
            );
          })}
        </ol>
      </ActivityFilter>
    </KidPage>
  );
}

function filterCounts(
  activities: { kind: PracticeKind; stars: number }[],
): Record<ActivityFilterKey, number> {
  const n = (f: (a: { kind: PracticeKind; stars: number }) => boolean) => activities.filter(f).length;
  return {
    all: activities.length,
    easy: n((a) => DIFFICULTY_OF[a.kind] === "easy"),
    medium: n((a) => DIFFICULTY_OF[a.kind] === "medium"),
    hard: n((a) => DIFFICULTY_OF[a.kind] === "hard"),
    todo: n((a) => a.stars === 0),
    done: n((a) => a.stars > 0),
  };
}

export default function TopicPage({ params }: PageProps<"/learn/topics/[id]">) {
  return (
    <Suspense fallback={<KidSkeleton />}>
      <TopicView params={params} />
    </Suspense>
  );
}
