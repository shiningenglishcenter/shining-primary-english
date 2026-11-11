import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { KidPage } from "@/features/practice/components/kid-ui";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { Player } from "@/features/practice/components/player";
import { getActivity } from "@/features/practice/queries";
import { buildRound } from "@/features/practice/round";

export const metadata: Metadata = { title: "Làm bài" };

async function PlayView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ r?: string | string[] }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  // RLS guards the content read, so it can run alongside the role check.
  const [, activity] = await Promise.all([requireRole("student"), getActivity(id)]);
  if (!activity) notFound();
  // A fresh shuffle on every visit; `r` lets "Chơi lại" force a new round.
  const round = buildRound(activity.kind, activity.content, activity.words);

  return (
    <KidPage level={activity.topic.level} header={false}>
      <Player
        key={typeof sp.r === "string" ? sp.r : "first"}
        activityId={activity.id}
        kind={activity.kind}
        title={`${activity.topic.titleEn}: ${activity.titleVi}`}
        questions={round.questions}
        maxScore={round.maxScore}
        topicHref={`/learn/topics/${activity.topic.id}`}
        nextHref={activity.nextActivityId ? `/learn/play/${activity.nextActivityId}` : null}
      />
    </KidPage>
  );
}

export default function PlayPage({ params, searchParams }: PageProps<"/learn/play/[id]">) {
  return (
    <Suspense fallback={<KidSkeleton />}>
      <PlayView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
