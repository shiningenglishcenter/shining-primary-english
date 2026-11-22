import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { KidPage } from "@/features/practice/components/kid-page";
import { KidSkeleton } from "@/features/practice/components/kid-skeleton";
import { ReviewPlayer } from "@/features/practice/components/review-player";
import { Sunny } from "@/features/practice/components/kid-ui";
import { getLevelCatalog } from "@/features/practice/catalog";
import { getMessages } from "@/features/i18n/server";
import { missedWords, reviewWords } from "@/features/practice/review";
import { buildRound } from "@/features/practice/round";

export const metadata: Metadata = { title: "Ôn lại từ hay sai" };

/** D64: listen, spell and write the words the pupil missed lately. */
async function ReviewView({ searchParams }: { searchParams: Promise<{ r?: string | string[] }> }) {
  const [, sp, cat, { t: m }] = await Promise.all([
    requireRole("student"),
    searchParams,
    getLevelCatalog(),
    getMessages(),
  ]);
  const { words, targets } = await reviewWords(await missedWords());
  const level = cat.levels[0]!;
  if (targets.length === 0) {
    return (
      <KidPage level={level}>
        <div
          className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-k-surface p-8 text-center"
          data-testid="review-empty"
        >
          <Sunny mood="cheer" size={96} />
          <p className="font-kid-display text-2xl font-bold">{m.missedNone}</p>
          <Link href="/learn" className="underline">
            {m.backHome}
          </Link>
        </div>
      </KidPage>
    );
  }
  const content = {
    steps: [
      { kind: "listen_choose", content: { words: targets } },
      { kind: "look_choose", content: { words: targets } },
      { kind: "spell", content: { words: targets } },
      { kind: "listen_type", content: { words: targets } },
    ],
  };
  const round = buildRound("mixed", content, words);
  return (
    <KidPage level={level} header={false}>
      <ReviewPlayer
        key={typeof sp.r === "string" ? sp.r : "first"}
        title={m.missedTitle}
        questions={round.questions}
        maxScore={round.maxScore}
      />
    </KidPage>
  );
}

export default function ReviewPage({ searchParams }: { searchParams: Promise<{ r?: string | string[] }> }) {
  return (
    <Suspense fallback={<KidSkeleton />}>
      <ReviewView searchParams={searchParams} />
    </Suspense>
  );
}
