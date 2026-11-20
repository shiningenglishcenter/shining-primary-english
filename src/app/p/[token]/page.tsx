import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { KidPage } from "@/features/practice/components/kid-page";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { Sunny } from "@/features/practice/components/kid-ui";
import { GuestPlay } from "@/features/guest/components/guest-play";
import { getPublicActivity } from "@/features/guest/queries";
import { getMessages } from "@/features/i18n/server";
import { levelBySlug } from "@/features/practice/model";
import { resolveContexts } from "@/features/practice/queries";
import { buildRound } from "@/features/practice/round";

export const metadata: Metadata = { title: "Làm bài" };

/** Guest link (D35): play one activity without an account. */
async function GuestView({ params, searchParams }: PageProps<"/p/[token]">) {
  await connection();
  const [{ token }, sp, { lang, t }] = await Promise.all([params, searchParams, getMessages()]);
  const activity = await getPublicActivity(token);
  if (!activity) {
    return (
      <KidPage level={levelBySlug("starters")} guest={{ loginHref: "/login" }}>
        <div
          className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-k-surface p-8 text-center"
          data-testid="guest-link-off"
        >
          <Sunny mood="think" size={96} />
          <p className="font-kid-display text-2xl font-bold">{t.linkOff}</p>
          <p className="max-w-sm text-base font-bold text-k-soft">{t.linkOffHint}</p>
        </div>
      </KidPage>
    );
  }
  // A fresh shuffle on every visit; `r` lets "Play again" force a new round.
  const round = buildRound(activity.kind, activity.content, activity.words);
  const contexts = await resolveContexts(round.contexts, { guest: true });
  const loginHref = `/login?next=${encodeURIComponent(`/learn/play/${activity.id}`)}`;
  const title = `${activity.topic.titleEn}: ${lang === "vi" ? activity.titleVi : activity.titleEn}`;
  return (
    <KidPage level={activity.topic.level} guest={{ loginHref }}>
      <GuestPlay
        key={typeof sp.r === "string" ? sp.r : "first"}
        token={token}
        activityId={activity.id}
        kind={activity.kind}
        title={title}
        questions={round.questions}
        contexts={contexts}
        settings={activity.settings}
        maxScore={round.maxScore}
        loginHref={loginHref}
        again={typeof sp.r === "string"}
      />
    </KidPage>
  );
}

export default function GuestPage(props: PageProps<"/p/[token]">) {
  return (
    <Suspense fallback={<KidSkeleton />}>
      <GuestView {...props} />
    </Suspense>
  );
}
