"use client";

import { useMemo, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Player } from "@/features/practice/components/player";
import type { PlaySettings, PracticeKind, VocabWord } from "@/features/practice/model";
import { buildRound, type PlayerContext, type RoundContext } from "@/features/practice/round";
import { usePathname } from "next/navigation";

/** Audio files need a signed URL from the server: the preview shows the questions without them. */
function toPlayerContext(c: RoundContext): PlayerContext {
  if (c.type === "reading") return c;
  return {
    type: "listening",
    youtube: c.media.source === "youtube" ? { videoId: c.media.videoId, start: c.media.start ?? 0 } : null,
    audioUrl: null,
    gate: false,
  };
}

const noRecord = async () => null;

/**
 * D56: the activity as a pupil sees it, built from the unsaved draft and
 * rebuilt while the teacher types. Started on demand (the round is shuffled,
 * so it can't be server-rendered); nothing is recorded.
 */
export function ActivityPreview({
  activityId,
  kind,
  title,
  content,
  settings,
  words,
}: {
  activityId: string;
  kind: PracticeKind;
  title: string;
  content: unknown;
  settings: PlaySettings;
  words: VocabWord[];
}) {
  const path = usePathname();
  const [run, setRun] = useState(0);
  const json = JSON.stringify(content);
  const round = useMemo(
    () => (run ? buildRound(kind, JSON.parse(json) as unknown, words) : null),
    // `run` reshuffles on "Chơi lại từ đầu".
    [run, kind, json, words],
  );
  return (
    <aside className="flex flex-col gap-3" aria-label="Xem trước" data-testid="activity-preview">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Xem trước (như học sinh thấy)</h2>
        {run ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setRun((r) => r + 1)}>
            <RotateCcw aria-hidden="true" />
            Chơi lại từ đầu
          </Button>
        ) : null}
      </div>
      <div className="mx-auto h-[640px] w-full max-w-[380px] overflow-hidden rounded-[2rem] border-8 border-ink bg-paper shadow-lg">
        {round === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink-soft">
              Xem bài như học sinh, kể cả phần chưa lưu. Kết quả xem thử không được ghi lại.
            </p>
            <Button type="button" onClick={() => setRun(1)} data-testid="preview-start">
              <Play aria-hidden="true" />
              Xem thử
            </Button>
          </div>
        ) : round.questions.length === 0 ? (
          <p
            className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-soft"
            data-testid="preview-empty"
          >
            Chưa có câu hỏi nào để xem. Thêm câu (hoặc từ có hình) rồi xem lại.
          </p>
        ) : (
          <div className="h-full overflow-y-auto">
            <Player
              key={`${run}:${json}:${JSON.stringify(settings)}`}
              activityId={activityId}
              kind={kind}
              title={title}
              questions={round.questions}
              contexts={round.contexts.map(toPlayerContext)}
              settings={settings}
              maxScore={round.maxScore}
              record={noRecord}
              playHref={path}
              topicHref="#"
              nextHref={null}
            />
          </div>
        )}
      </div>
      <p className="text-center text-xs text-ink-soft">
        Bài nghe bằng file âm thanh: phần âm thanh chỉ phát khi học sinh làm bài thật.
      </p>
    </aside>
  );
}
