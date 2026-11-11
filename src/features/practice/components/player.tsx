"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Delete, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { recordPractice } from "@/features/practice/actions";
import { Pic, Stars, Sunny } from "@/features/practice/components/kid-ui";
import { starsFor, type PracticeKind } from "@/features/practice/model";
import {
  sameSentence,
  sameWord,
  type Card,
  type PlayerContext,
  type Question,
} from "@/features/practice/round";
import { useSound } from "@/features/practice/use-sound";
import { cn } from "@/lib/utils";

type Sound = ReturnType<typeof useSound>;
type Status = "idle" | "wrong" | "right";

const INSTRUCTIONS: Record<Question["type"], [string, string]> = {
  flash: ["Look, listen and say", "Nhìn, nghe và đọc theo"],
  listen_choose: ["Listen and choose", "Nghe rồi chọn hình đúng"],
  look_choose: ["Look and choose", "Nhìn hình, chọn từ đúng"],
  match: ["Match", "Chạm một hình, rồi chạm từ đúng với hình đó"],
  spell: ["Look and spell", "Chạm chữ cái để ghép thành từ"],
  true_false: ["Yes or no?", "Câu này đúng hay sai với hình?"],
  fill_blank: ["Choose and complete", "Chọn từ điền vào chỗ trống"],
  rearrange: ["Make a sentence", "Chạm các từ theo đúng thứ tự"],
  listen_type: ["Listen and write", "Nghe rồi viết từ con nghe được"],
  choice: ["Choose the answer", "Chọn câu trả lời đúng"],
};

/** Headings for questions about a recording / a passage. */
const CONTEXT_HEADINGS: Record<PlayerContext["type"], { tf: [string, string]; mc: [string, string] }> = {
  listening: {
    tf: ["Listen. Yes or no?", "Nghe bài, câu này đúng hay sai?"],
    mc: ["Listen and choose", "Nghe bài rồi chọn câu trả lời đúng"],
  },
  reading: {
    tf: ["Read. Yes or no?", "Đọc bài, câu này đúng hay sai?"],
    mc: ["Read and choose", "Đọc bài rồi chọn câu trả lời đúng"],
  },
};

// ------------------------------------------------------------------ shell ---

export function Player({
  activityId,
  kind,
  title,
  questions,
  contexts = [],
  maxScore,
  topicHref,
  nextHref,
}: {
  activityId: string;
  kind: PracticeKind;
  title: string;
  questions: Question[];
  contexts?: PlayerContext[];
  maxScore: number;
  topicHref: string;
  nextHref: string | null;
}) {
  const sound = useSound();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const started = useRef<number | null>(null);

  useEffect(() => {
    started.current = Date.now();
  }, []);

  const q = questions[index];
  const advance = (points: number) => {
    setScore((s) => s + points);
    if (index + 1 >= questions.length) {
      sound.fanfare();
      setSeconds(started.current ? Math.round((Date.now() - started.current) / 1000) : 0);
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (finished) {
    return (
      <Finish
        activityId={activityId}
        kind={kind}
        score={score}
        maxScore={maxScore}
        seconds={seconds}
        topicHref={topicHref}
        nextHref={nextHref}
      />
    );
  }
  if (!q) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Sunny mood="think" size={96} />
        <p className="text-xl font-black">Bài này chưa có câu hỏi.</p>
        <Link href={topicHref} className="font-extrabold underline">
          Quay lại chủ đề
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="player" data-kind={kind}>
      <div className="flex items-center gap-3 pt-4 pb-2">
        <Link
          href={topicHref}
          aria-label="Thoát bài"
          className="kid-press flex size-12 shrink-0 items-center justify-center rounded-full bg-k-surface"
        >
          <X className="size-6" aria-hidden="true" />
        </Link>
        <div
          className="flex flex-1 gap-1.5"
          role="progressbar"
          aria-label="Tiến độ"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index}
        >
          {questions.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-3.5 flex-1 rounded-full",
                i < index ? "bg-k-primary" : i === index ? "bg-k-accent" : "bg-k-line",
              )}
            />
          ))}
        </div>
        <span className="text-base font-black tabular-nums" data-testid="progress-text">
          {index + 1}/{questions.length}
        </span>
        <button
          type="button"
          onClick={sound.toggleMute}
          aria-label={sound.muted ? "Bật âm thanh" : "Tắt âm thanh"}
          aria-pressed={sound.muted}
          className="kid-press flex size-12 shrink-0 items-center justify-center rounded-full bg-k-surface"
        >
          {sound.muted ? (
            <VolumeX className="size-6" aria-hidden="true" />
          ) : (
            <Volume2 className="size-6" aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="sr-only">{title}</p>
      {q.ctx !== undefined && contexts[q.ctx] ? (
        // Keyed by context: the video / passage stays put across its questions.
        <ContextPanel key={`ctx-${q.ctx}`} ctx={contexts[q.ctx]!} sound={sound} />
      ) : null}
      <QuestionView
        key={index}
        q={q}
        ctxType={q.ctx !== undefined ? contexts[q.ctx]?.type : undefined}
        sound={sound}
        last={index + 1 >= questions.length}
        onDone={advance}
      />
    </div>
  );
}

type QProps = {
  q: Question;
  ctxType?: PlayerContext["type"];
  sound: Sound;
  last: boolean;
  onDone: (points: number) => void;
};

function QuestionView(props: QProps) {
  switch (props.q.type) {
    case "flash":
      return <FlashQ {...props} q={props.q} />;
    case "listen_choose":
      return <ListenQ {...props} q={props.q} />;
    case "look_choose":
      return <LookQ {...props} q={props.q} />;
    case "match":
      return <MatchQ {...props} q={props.q} />;
    case "spell":
      return <SpellQ {...props} q={props.q} />;
    case "true_false":
      return <TrueFalseQ {...props} q={props.q} />;
    case "fill_blank":
      return <FillQ {...props} q={props.q} />;
    case "rearrange":
      return <OrderQ {...props} q={props.q} />;
    case "listen_type":
      return <ListenTypeQ {...props} q={props.q} />;
    case "choice":
      return <ChoiceQ {...props} q={props.q} />;
  }
}

// ---------------------------------------------------------------- pieces ----

function Frame({
  type,
  heading,
  children,
  footer,
}: {
  type: Question["type"];
  heading?: [string, string];
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [en, vi] = heading ?? INSTRUCTIONS[type];
  return (
    <div className="animate-kid-in flex flex-1 flex-col">
      <div className="pt-3 text-center">
        <h1 className="font-kid-display text-[28px] leading-tight font-bold" data-testid="page-title">
          {en}
        </h1>
        <p className="text-[17px] font-bold text-k-soft">{vi}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">{children}</div>
      <div className="sticky bottom-0 flex flex-col gap-3 bg-k-bg pt-2 pb-4">{footer}</div>
    </div>
  );
}

function SpeakButton({
  onClick,
  big = false,
  label = "Nghe",
}: {
  onClick: () => void;
  big?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "kid-press flex shrink-0 items-center justify-center rounded-full bg-k-primary text-k-primary-ink [--press:var(--k-primary-shadow)]",
        big ? "size-28" : "size-14",
      )}
    >
      <Volume2 className={big ? "size-14" : "size-7"} aria-hidden="true" />
    </button>
  );
}

/** Feedback banner + continue button. Points: 1 on a first try, else 0. */
function Footer({
  status,
  last,
  onNext,
  rightText = "Giỏi quá!",
  rightDetail,
  wrongText = "Gần đúng rồi! Thử lại nhé.",
  hint,
}: {
  status: Status;
  last: boolean;
  onNext: () => void;
  rightText?: string;
  rightDetail?: React.ReactNode;
  wrongText?: string;
  hint?: React.ReactNode;
}) {
  return (
    <>
      {status === "right" ? (
        <div
          className="animate-kid-in flex items-center gap-3 rounded-3xl bg-k-good-soft px-4 py-3"
          role="status"
          data-testid="feedback-right"
        >
          <Sunny mood="cheer" size={56} />
          <div>
            <p className="font-kid-display text-2xl font-bold text-k-good">{rightText}</p>
            {rightDetail ? <p className="text-base font-bold">{rightDetail}</p> : null}
          </div>
        </div>
      ) : status === "wrong" ? (
        <div
          className="animate-kid-in flex items-center gap-3 rounded-3xl bg-k-bad-soft px-4 py-3"
          role="status"
          data-testid="feedback-wrong"
        >
          <Sunny mood="think" size={56} />
          <div>
            <p className="font-kid-display text-2xl font-bold text-k-bad">{wrongText}</p>
            {hint ? <p className="text-base font-bold">{hint}</p> : null}
          </div>
        </div>
      ) : null}
      {status === "right" ? (
        <button
          type="button"
          onClick={onNext}
          data-testid="next"
          className="kid-press h-16 w-full rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)]"
        >
          {last ? "Xem kết quả" : "Câu tiếp theo"}
        </button>
      ) : null}
    </>
  );
}

/** Tracks right/wrong and whether the first attempt was right. */
function useAnswer(sound: Sound) {
  const [status, setStatus] = useState<Status>("idle");
  const [missed, setMissed] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  return {
    status,
    points: missed ? 0 : 1,
    shake,
    right() {
      sound.correct();
      setStatus("right");
    },
    wrong(key: string) {
      sound.wrong();
      setMissed(true);
      setStatus("wrong");
      setShake(key);
      window.setTimeout(() => setShake(null), 400);
    },
  };
}

function choiceClass(state: "idle" | "right" | "wrong" | "dim") {
  return cn(
    "kid-press rounded-3xl border-[3px] bg-k-surface transition-colors",
    state === "right" && "border-k-good [--press:var(--k-good)] animate-kid-pop",
    state === "wrong" && "border-k-bad [--press:var(--k-bad)]",
    state === "idle" && "border-k-line",
    state === "dim" && "border-k-line opacity-50",
  );
}

// ------------------------------------------------------------- questions ----

function FlashQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "flash" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const say = () => sound.speak(q.card.word);
  useEffect(() => {
    sound.speak(q.card.word);
  }, [q.card.word, sound]);
  return (
    <Frame
      type="flash"
      footer={
        <button
          type="button"
          onClick={() => onDone(1)}
          data-testid="next"
          className="kid-press h-16 w-full rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)]"
        >
          {last ? "Xong rồi!" : "Thẻ tiếp theo"}
        </button>
      }
    >
      <button
        type="button"
        onClick={say}
        aria-label={`Nghe từ ${q.card.word}`}
        className="kid-press flex w-full max-w-sm flex-col items-center gap-2 rounded-[2rem] bg-k-surface px-6 py-8"
      >
        <Pic code={q.card.emoji} size={176} className="animate-kid-float" />
        <span className="font-kid-display text-5xl font-bold" data-testid="flash-word">
          {q.card.word}
        </span>
        <span className="text-xl font-bold text-k-soft">{q.card.meaningVi}</span>
      </button>
      <SpeakButton onClick={say} label="Nghe lại" />
    </Frame>
  );
}

function ListenQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "listen_choose" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sound.speak(q.answer.word), 300);
    return () => window.clearTimeout(t);
  }, [q.answer.word, sound]);
  const choose = (c: Card) => {
    if (a.status === "right") return;
    setPicked(c.word);
    if (c.word === q.answer.word) a.right();
    else a.wrong(c.word);
  };
  return (
    <Frame
      type="listen_choose"
      footer={
        <Footer
          status={a.status}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={`“${q.answer.word}” là ${q.answer.meaningVi}`}
          hint="Bấm nút loa để nghe lại."
        />
      }
    >
      <SpeakButton big onClick={() => sound.speak(q.answer.word)} label="Nghe lại" />
      <div className="grid w-full max-w-xl grid-cols-3 gap-3">
        {q.options.map((c) => {
          const isAnswer = c.word === q.answer.word;
          const state =
            a.status === "right"
              ? isAnswer
                ? "right"
                : "dim"
              : picked === c.word && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={c.word}
              type="button"
              onClick={() => choose(c)}
              aria-label={`Hình ${c.meaningVi}`}
              data-testid="option"
              data-correct={isAnswer ? "true" : undefined}
              className={cn(
                choiceClass(state),
                "flex aspect-square items-center justify-center",
                a.shake === c.word && "animate-kid-shake",
              )}
            >
              <Pic code={c.emoji} size={96} className="h-auto w-[70%]" />
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

function LookQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "look_choose" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (w: string) => {
    if (a.status === "right") return;
    setPicked(w);
    sound.speak(w);
    if (w === q.answer.word) a.right();
    else a.wrong(w);
  };
  return (
    <Frame
      type="look_choose"
      footer={
        <Footer
          status={a.status}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={`“${q.answer.word}” là ${q.answer.meaningVi}`}
        />
      }
    >
      <div className="flex size-44 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)] sm:size-52">
        <Pic code={q.answer.emoji} size={150} className="animate-kid-float" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {q.options.map((w) => {
          const isAnswer = w === q.answer.word;
          const state =
            a.status === "right"
              ? isAnswer
                ? "right"
                : "dim"
              : picked === w && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={w}
              type="button"
              onClick={() => choose(w)}
              data-testid="option"
              data-correct={isAnswer ? "true" : undefined}
              className={cn(
                choiceClass(state),
                "h-16 text-2xl font-black",
                a.shake === w && "animate-kid-shake",
              )}
            >
              {w}
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

function MatchQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "match" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const words = useMemo(() => [...q.pairs].sort((x, y) => x.word.localeCompare(y.word)), [q.pairs]);
  const [pic, setPic] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const done = matched.length === q.pairs.length;

  const tapWord = (w: string) => {
    if (!pic || matched.includes(w)) return;
    sound.speak(w);
    if (pic === w) {
      sound.correct();
      setMatched([...matched, w]);
      setPic(null);
    } else {
      sound.wrong();
      if (!missed.includes(pic)) setMissed([...missed, pic]);
      setShake(w);
      window.setTimeout(() => setShake(null), 400);
    }
  };
  return (
    <Frame
      type="match"
      footer={
        <Footer
          status={done ? "right" : "idle"}
          last={last}
          onNext={() => onDone(q.pairs.length - missed.length)}
          rightText={missed.length === 0 ? "Giỏi quá!" : "Xong rồi!"}
        />
      }
    >
      <div className="grid w-full max-w-xl grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {q.pairs.map((c) => {
            const isDone = matched.includes(c.word);
            return (
              <button
                key={c.word}
                type="button"
                disabled={isDone}
                onClick={() => setPic(c.word)}
                aria-label={`Hình ${c.meaningVi}`}
                aria-pressed={pic === c.word}
                data-testid="match-picture"
                data-word={c.word}
                className={cn(
                  choiceClass(isDone ? "right" : "idle"),
                  "flex h-24 items-center justify-center",
                  pic === c.word && "border-k-accent ring-4 ring-k-accent/40",
                )}
              >
                <Pic code={c.emoji} size={72} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {words.map((c) => {
            const isDone = matched.includes(c.word);
            return (
              <button
                key={c.word}
                type="button"
                disabled={isDone}
                onClick={() => tapWord(c.word)}
                data-testid="match-word"
                data-word={c.word}
                className={cn(
                  choiceClass(isDone ? "right" : "idle"),
                  "h-24 px-2 text-xl font-black sm:text-2xl",
                  !pic && !isDone && "opacity-80",
                  shake === c.word && "animate-kid-shake",
                )}
              >
                {c.word}
              </button>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

function SpellQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "spell" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [used, setUsed] = useState<number[]>([]);
  const target = q.answer.word.toLowerCase();
  const typed = used.map((i) => q.letters[i]).join("");

  const tap = (i: number) => {
    if (a.status === "right" || used.includes(i) || used.length >= target.length) return;
    const next = [...used, i];
    setUsed(next);
    const word = next.map((k) => q.letters[k]).join("");
    if (next.length === target.length) {
      if (word === target) {
        a.right();
        sound.speak(q.answer.word);
      } else {
        a.wrong("slots");
        window.setTimeout(() => setUsed([]), 700);
      }
    }
  };
  return (
    <Frame
      type="spell"
      footer={
        <Footer
          status={a.status}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={`“${q.answer.word}” là ${q.answer.meaningVi}`}
          hint="Nghe lại và xếp chữ lần nữa."
        />
      }
    >
      <div className="relative flex size-44 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
        <Pic code={q.answer.emoji} size={140} />
        <span className="absolute -top-3 -right-3">
          <SpeakButton onClick={() => sound.speak(q.answer.word)} label="Nghe từ" />
        </span>
      </div>
      <div
        className={cn("flex flex-wrap justify-center gap-2", a.shake === "slots" && "animate-kid-shake")}
        data-testid="spell-slots"
        data-answer={target}
      >
        {target.split("").map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-16 w-12 items-center justify-center rounded-2xl border-[3px] text-3xl font-black sm:w-14",
              typed[i] ? "border-k-surface bg-k-surface" : "border-dashed border-k-line",
              a.status === "right" && "border-k-good",
            )}
          >
            {typed[i] ?? ""}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {q.letters.map((l, i) => (
          <button
            key={i}
            type="button"
            disabled={used.includes(i) || a.status === "right"}
            onClick={() => tap(i)}
            aria-label={`Chữ ${l}`}
            data-testid="letter"
            data-letter={l}
            className="kid-press h-16 w-14 rounded-2xl bg-k-primary text-3xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)] disabled:opacity-30"
          >
            {l}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setUsed(used.slice(0, -1))}
          disabled={used.length === 0 || a.status === "right"}
          aria-label="Xoá chữ vừa chọn"
          className="kid-press flex h-16 w-14 items-center justify-center rounded-2xl bg-k-surface disabled:opacity-30"
        >
          <Delete className="size-7" aria-hidden="true" />
        </button>
      </div>
    </Frame>
  );
}

function TrueFalseQ({
  q,
  ctxType,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "true_false" }>;
  ctxType?: PlayerContext["type"];
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [picked, setPicked] = useState<boolean | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sound.speak(q.sentence), 300);
    return () => window.clearTimeout(t);
  }, [q.sentence, sound]);
  const choose = (v: boolean) => {
    if (a.status === "right") return;
    setPicked(v);
    if (v === q.answer) a.right();
    else a.wrong(String(v));
  };
  const btn = (v: boolean) => {
    const state =
      a.status === "right"
        ? v === q.answer
          ? "right"
          : "dim"
        : picked === v && a.status === "wrong"
          ? "wrong"
          : "idle";
    return (
      <button
        type="button"
        onClick={() => choose(v)}
        data-testid="option"
        data-correct={v === q.answer ? "true" : undefined}
        className={cn(
          choiceClass(state),
          "flex h-20 flex-1 items-center justify-center gap-2 text-2xl font-black",
          a.shake === String(v) && "animate-kid-shake",
        )}
      >
        {v ? (
          <Check className="size-8 text-k-good" aria-hidden="true" />
        ) : (
          <X className="size-8 text-k-bad" aria-hidden="true" />
        )}
        {v ? "Yes" : "No"}
      </button>
    );
  };
  return (
    <Frame
      type="true_false"
      heading={ctxType ? CONTEXT_HEADINGS[ctxType].tf : undefined}
      footer={
        <Footer
          status={a.status}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={
            ctxType
              ? q.answer
                ? "Câu này đúng theo bài."
                : "Câu này không đúng theo bài."
              : q.answer
                ? "Câu này đúng với hình."
                : "Câu này không đúng với hình."
          }
        />
      }
    >
      {!ctxType || q.emoji ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]",
            ctxType ? "size-28" : "size-44",
          )}
        >
          <Pic code={q.emoji} size={ctxType ? 90 : 140} />
        </div>
      ) : null}
      <div className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-k-surface p-4">
        <SpeakButton onClick={() => sound.speak(q.sentence)} label="Nghe câu" />
        <p className="font-kid-display text-2xl leading-snug font-bold" data-testid="sentence">
          {q.sentence}
        </p>
      </div>
      <div className="flex w-full max-w-md gap-3">
        {btn(true)}
        {btn(false)}
      </div>
    </Frame>
  );
}

function FillQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "fill_blank" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (w: string) => {
    if (a.status === "right") return;
    setPicked(w);
    if (w === q.answer) {
      a.right();
      sound.speak(`${q.before}${q.answer}${q.after}`);
    } else a.wrong(w);
  };
  return (
    <Frame
      type="fill_blank"
      footer={<Footer status={a.status} last={last} onNext={() => onDone(a.points)} />}
    >
      <div className="flex size-40 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
        <Pic code={q.emoji} size={128} />
      </div>
      <p
        className="max-w-md text-center font-kid-display text-[26px] leading-relaxed font-bold"
        data-testid="sentence"
      >
        {q.before}
        <span
          className={cn(
            "mx-1 inline-block min-w-24 rounded-xl border-b-4 px-2 text-center",
            a.status === "right" ? "border-k-good bg-k-good-soft" : "border-k-accent bg-k-surface",
          )}
        >
          {a.status === "right" ? q.answer : " "}
        </span>
        {q.after}
      </p>
      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3">
        {q.options.map((w) => {
          const state =
            a.status === "right"
              ? w === q.answer
                ? "right"
                : "dim"
              : picked === w && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={w}
              type="button"
              onClick={() => choose(w)}
              data-testid="option"
              data-correct={w === q.answer ? "true" : undefined}
              className={cn(
                choiceClass(state),
                "h-16 px-3 text-xl font-black",
                a.shake === w && "animate-kid-shake",
              )}
            >
              {w}
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

function OrderQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "rearrange" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [order, setOrder] = useState<number[]>([]);
  const placed = order.map((i) => q.words[i]!);
  const full = order.length === q.words.length;
  const check = () => {
    if (sameSentence(placed, q.answer)) {
      a.right();
      sound.speak(q.answer.join(" "));
    } else a.wrong("line");
  };
  return (
    <Frame
      type="rearrange"
      footer={
        a.status === "right" ? (
          <Footer status="right" last={last} onNext={() => onDone(a.points)} />
        ) : (
          <>
            {a.status === "wrong" ? (
              <div
                className="rounded-3xl bg-k-bad-soft px-4 py-3 text-center font-kid-display text-xl font-bold text-k-bad"
                role="status"
                data-testid="feedback-wrong"
              >
                Chưa đúng thứ tự. Thử lại nhé!
              </div>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOrder([])}
                aria-label="Xếp lại từ đầu"
                className="kid-press flex size-16 shrink-0 items-center justify-center rounded-2xl bg-k-surface"
              >
                <RotateCcw className="size-7" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={check}
                disabled={!full}
                data-testid="check"
                className="kid-press h-16 flex-1 rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)] disabled:opacity-40"
              >
                Kiểm tra
              </button>
            </div>
          </>
        )
      }
    >
      <div className="flex size-36 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
        <Pic code={q.emoji} size={116} />
      </div>
      <div
        className={cn(
          "flex min-h-20 w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-3xl border-[3px] border-dashed p-3",
          a.status === "right" ? "border-k-good bg-k-good-soft" : "border-k-line",
          a.shake === "line" && "animate-kid-shake",
        )}
        data-testid="sentence-line"
        data-answer={q.answer.join(" ")}
      >
        {placed.length === 0 ? (
          <span className="text-lg font-bold text-k-soft">Chạm các từ bên dưới</span>
        ) : null}
        {order.map((wi, pos) => (
          <button
            key={`${wi}-${pos}`}
            type="button"
            disabled={a.status === "right"}
            onClick={() => setOrder(order.filter((_, p) => p !== pos))}
            className="rounded-2xl bg-k-surface px-4 py-2 text-xl font-black shadow-[0_3px_0_var(--k-line)]"
          >
            {q.words[wi]}
          </button>
        ))}
      </div>
      <div className="flex w-full max-w-xl flex-wrap justify-center gap-3">
        {q.words.map((w, i) => (
          <button
            key={i}
            type="button"
            disabled={order.includes(i) || a.status === "right"}
            onClick={() => setOrder([...order, i])}
            data-testid="word-chip"
            data-word={w}
            className="kid-press rounded-2xl bg-k-primary px-5 py-3 text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)] disabled:opacity-25"
          >
            {w}
          </button>
        ))}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- finish ----

const CONFETTI_COLORS = ["#FFC61A", "#F28C1B", "#FF8FB1", "#7EE8C7", "#7ED957", "#B9A6FF", "#4CC9F0"];

function ListenTypeQ({
  q,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "listen_type" }>;
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [typed, setTyped] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sound.speak(q.answer.word), 300);
    return () => window.clearTimeout(t);
  }, [q.answer.word, sound]);
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (a.status === "right" || !typed.trim()) return;
    if (sameWord(typed, q.answer.word)) {
      a.right();
      sound.speak(q.answer.word);
    } else {
      a.wrong("input");
      input.current?.select();
    }
  };
  return (
    <Frame
      type="listen_type"
      footer={
        <Footer
          status={a.status}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={`“${q.answer.word}” là ${q.answer.meaningVi}`}
          hint={`Từ có ${q.answer.word.length} chữ cái. Bấm loa để nghe lại.`}
        />
      }
    >
      {a.status === "right" ? (
        <div className="animate-kid-pop flex size-40 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
          <Pic code={q.answer.emoji} size={120} />
        </div>
      ) : (
        <SpeakButton big onClick={() => sound.speak(q.answer.word)} label="Nghe lại" />
      )}
      <form onSubmit={check} className="flex w-full max-w-md flex-col gap-3">
        <input
          ref={input}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          readOnly={a.status === "right"}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-label="Viết từ con nghe được"
          placeholder={"_ ".repeat(q.answer.word.length).trim()}
          data-testid="type-input"
          data-answer={q.answer.word.toLowerCase()}
          className={cn(
            "h-20 w-full rounded-3xl border-[3px] bg-k-surface text-center font-kid-display text-4xl font-bold tracking-wider outline-none focus:border-k-primary",
            a.status === "right" ? "border-k-good" : a.status === "wrong" ? "border-k-bad" : "border-k-line",
            a.shake === "input" && "animate-kid-shake",
          )}
        />
        {a.status !== "right" ? (
          <button
            type="submit"
            disabled={!typed.trim()}
            data-testid="check"
            className="kid-press h-16 w-full rounded-2xl bg-k-accent text-xl font-black text-k-ink [--press:var(--k-accent-shadow)] disabled:opacity-40"
          >
            Kiểm tra
          </button>
        ) : null}
      </form>
    </Frame>
  );
}

function ChoiceQ({
  q,
  ctxType,
  sound,
  last,
  onDone,
}: {
  q: Extract<Question, { type: "choice" }>;
  ctxType?: PlayerContext["type"];
  sound: Sound;
  last: boolean;
  onDone: (p: number) => void;
}) {
  const a = useAnswer(sound);
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (o: string) => {
    if (a.status === "right") return;
    setPicked(o);
    if (o === q.answer) a.right();
    else a.wrong(o);
  };
  return (
    <Frame
      type="choice"
      heading={ctxType ? CONTEXT_HEADINGS[ctxType].mc : undefined}
      footer={<Footer status={a.status} last={last} onNext={() => onDone(a.points)} />}
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-k-surface p-4">
        {q.emoji ? <Pic code={q.emoji} size={56} className="shrink-0" /> : null}
        <p className="flex-1 font-kid-display text-2xl leading-snug font-bold" data-testid="sentence">
          {q.prompt}
        </p>
        <SpeakButton onClick={() => sound.speak(q.prompt)} label="Nghe câu hỏi" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {q.options.map((o) => {
          const isAnswer = o === q.answer;
          const state =
            a.status === "right"
              ? isAnswer
                ? "right"
                : "dim"
              : picked === o && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={o}
              type="button"
              onClick={() => choose(o)}
              data-testid="option"
              data-correct={isAnswer ? "true" : undefined}
              className={cn(
                choiceClass(state),
                "min-h-16 px-4 py-3 text-xl font-black",
                a.shake === o && "animate-kid-shake",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

/** The recording or passage a run of questions is about; stays mounted between them. */
function ContextPanel({ ctx, sound }: { ctx: PlayerContext; sound: Sound }) {
  const [open, setOpen] = useState(true);
  const label = ctx.type === "listening" ? "bài nghe" : "bài đọc";
  return (
    <section
      className="mt-2 rounded-3xl bg-k-surface p-3 shadow-[0_3px_0_var(--k-line)]"
      data-testid="context"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-black">
          {ctx.type === "reading" && ctx.emoji ? <Pic code={ctx.emoji} size={28} /> : null}
          {ctx.type === "reading" ? (ctx.title ?? "Đọc bài") : "Nghe bài"}
        </p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="rounded-full px-3 py-1 text-sm font-extrabold text-k-soft"
        >
          {open ? `Ẩn ${label}` : `Mở ${label}`}
        </button>
      </div>
      {/* Hidden, not unmounted, so a playing video keeps its place. */}
      <div className={cn("mt-2", !open && "hidden")}>
        {ctx.type === "listening" ? (
          ctx.youtube ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ctx.youtube.videoId}?rel=0&playsinline=1${ctx.youtube.start ? `&start=${ctx.youtube.start}` : ""}`}
                title="Video bài nghe"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="size-full"
                data-testid="youtube"
              />
            </div>
          ) : ctx.audioUrl ? (
            <audio controls preload="metadata" src={ctx.audioUrl} className="w-full" data-testid="audio">
              Trình duyệt không phát được audio.
            </audio>
          ) : (
            <p className="text-sm font-bold text-k-soft">Không mở được bài nghe. Hỏi thầy cô nhé.</p>
          )
        ) : (
          <div className="flex items-start gap-2">
            <p
              className="max-h-56 flex-1 overflow-y-auto text-[19px] leading-relaxed font-bold whitespace-pre-line"
              data-testid="passage"
            >
              {ctx.passage}
            </p>
            <SpeakButton onClick={() => sound.speak(ctx.passage)} label="Đọc to bài" />
          </div>
        )}
      </div>
    </section>
  );
}

function Finish({
  activityId,
  kind,
  score,
  maxScore,
  seconds,
  topicHref,
  nextHref,
}: {
  activityId: string;
  kind: PracticeKind;
  score: number;
  maxScore: number;
  seconds: number;
  topicHref: string;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sent = useRef(false);
  const stars = starsFor(score, maxScore);

  useEffect(() => {
    if (sent.current || maxScore < 1) return;
    sent.current = true;
    startTransition(async () => {
      await recordPractice({ activityId, score, maxScore, seconds });
    });
  }, [activityId, score, maxScore, seconds]);

  const message =
    stars === 3 ? "Xuất sắc!" : stars === 2 ? "Giỏi lắm!" : stars === 1 ? "Cố lên nào!" : "Mình thử lại nhé!";

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden py-10 text-center"
      data-testid="finish"
    >
      {stars > 0 ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className="kid-confetti"
              style={{
                left: `${(i * 37) % 100}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 7) * 0.12}s`,
              }}
            />
          ))}
        </div>
      ) : null}
      <Sunny mood={stars > 0 ? "cheer" : "think"} size={128} className="animate-kid-float" />
      <h1 className="font-kid-display text-4xl font-bold" data-testid="page-title">
        {message}
      </h1>
      <Stars value={stars} size={52} />
      <p className="text-xl font-bold" data-testid="score">
        {kind === "flashcards" ? `Con đã xem ${maxScore} thẻ từ` : `Đúng ngay lần đầu: ${score}/${maxScore}`}
      </p>
      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        {nextHref ? (
          <Link
            href={nextHref}
            className="kid-press flex h-16 items-center justify-center rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)]"
          >
            Bài tiếp theo
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => router.push(`/learn/play/${activityId}?r=${Math.floor(Math.random() * 1e6)}`)}
          className="kid-press h-14 rounded-2xl bg-k-surface text-lg font-black"
        >
          Chơi lại
        </button>
        <Link
          href={topicHref}
          className="kid-press flex h-14 items-center justify-center rounded-2xl bg-k-surface text-lg font-black"
        >
          Về chủ đề
        </Link>
      </div>
    </div>
  );
}
