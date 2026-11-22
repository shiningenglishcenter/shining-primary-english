"use client";

import { Player, type RoundResult } from "@/features/practice/components/player";
import type { Question } from "@/features/practice/round";

const noRecord: (r: RoundResult) => Promise<null> = async () => null;

/** "Ôn lại từ hay sai" (D64): a normal round that earns no stars and is not saved. */
export function ReviewPlayer({
  title,
  questions,
  maxScore,
}: {
  title: string;
  questions: Question[];
  maxScore: number;
}) {
  return (
    <Player
      activityId="review"
      kind="mixed"
      title={title}
      questions={questions}
      maxScore={maxScore}
      record={noRecord}
      playHref="/learn/review"
      topicHref="/learn"
      nextHref={null}
    />
  );
}
