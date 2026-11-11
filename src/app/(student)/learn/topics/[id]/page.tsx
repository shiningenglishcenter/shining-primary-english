import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { KidPage, Pic, Stars } from "@/features/practice/components/kid-ui";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { KIND_ICON } from "@/features/practice/components/kind-icon";
import { getTopic } from "@/features/practice/queries";

export const metadata: Metadata = { title: "Chủ đề" };

async function TopicView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [, topic] = await Promise.all([requireRole("student"), getTopic(id)]);
  if (!topic) notFound();

  return (
    <KidPage level={topic.level}>
      <Link
        href={`/learn?level=${topic.level.slug}`}
        className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-k-surface px-4 py-2 text-base font-extrabold shadow-[0_3px_0_var(--k-line)]"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        Các chủ đề
      </Link>

      <section className="mt-4 flex items-center gap-4">
        <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-k-surface shadow-[0_4px_0_var(--k-line)]">
          <Pic code={topic.emoji} size={72} className="animate-kid-float" />
        </span>
        <div>
          <h1 className="font-kid-display text-[30px] leading-tight font-bold" data-testid="page-title">
            {topic.titleEn}
          </h1>
          <p className="text-lg font-bold text-k-soft">{topic.titleVi}</p>
        </div>
      </section>

      <ol className="mt-6 flex flex-col gap-3" data-testid="activity-list">
        {topic.activities.map((a, i) => {
          const Icon = KIND_ICON[a.kind];
          return (
            <li key={a.id}>
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
                  <span className="text-xs font-black tracking-wide text-k-soft uppercase">Bài {i + 1}</span>
                  <span className="text-lg leading-tight font-black">{a.titleVi}</span>
                  <span className="text-sm font-bold text-k-soft">{a.titleEn}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <Stars value={a.stars} />
                  <span className="rounded-xl bg-k-primary px-3 py-1 text-sm font-black text-k-primary-ink">
                    {a.stars > 0 ? "Chơi lại" : "Chơi"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </KidPage>
  );
}

export default function TopicPage({ params }: PageProps<"/learn/topics/[id]">) {
  return (
    <Suspense fallback={<KidSkeleton />}>
      <TopicView params={params} />
    </Suspense>
  );
}
