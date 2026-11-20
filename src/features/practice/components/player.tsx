"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Delete, Lightbulb, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { recordPractice, type QuestionResult } from "@/features/practice/actions";

export type RoundResult = { score: number; maxScore: number; seconds: number; details: QuestionResult[] };
import { Pic, PointPic, pointOf, Stars, Sunny } from "@/features/practice/components/kid-ui";
import {
  DEFAULT_SETTINGS,
  POINTS,
  starsFor,
  type PlaySettings,
  type PracticeKind,
} from "@/features/practice/model";
import {
  letterTiles,
  revealPattern,
  MATCH_PAIRS_WIDE,
  regroupMatches,
  scoreOf,
  sameSentence,
  sameWord,
  type Card,
  type PlayerContext,
  type Question,
} from "@/features/practice/round";
import { useSound, type SoundTip } from "@/features/practice/use-sound";
import { useLang, useT } from "@/features/i18n/client";
import { cn } from "@/lib/utils";

type Sound = ReturnType<typeof useSound>;
type Status = "idle" | "wrong" | "right" | "failed";

const SettingsContext = createContext<PlaySettings>(DEFAULT_SETTINGS);

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

/** Match Vietnamese meanings, choose a sentence's meaning (D47). */
const MEANING_HEADING: [string, string] = ["Match the meanings", "Nối từ với nghĩa tiếng Việt"];
const TRANSLATE_HEADINGS: Record<"en_vi" | "vi_en", [string, string]> = {
  en_vi: ["What does it mean?", "Câu này nghĩa là gì?"],
  vi_en: ["Say it in English", "Chọn câu tiếng Anh đúng nghĩa"],
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
  questions: phoneQuestions,
  contexts = [],
  settings = DEFAULT_SETTINGS,
  record,
  playHref,
  guest,
  maxScore,
  topicHref,
  nextHref,
}: {
  activityId: string;
  kind: PracticeKind;
  title: string;
  questions: Question[];
  contexts?: PlayerContext[];
  settings?: PlaySettings;
  /** Saves the finished round; default: the signed-in student's progress. */
  record?: (r: RoundResult) => Promise<unknown>;
  /** "Play again" target (default /learn/play/<id>). */
  playHref?: string;
  /** Guest link (D35): no topic page, offer to log in instead. */
  guest?: { loginHref: string };
  maxScore: number;
  topicHref: string;
  nextHref: string | null;
}) {
  const t = useT();
  const [soundTip, setSoundTip] = useState<SoundTip | null>(null);
  const sound = useSound({ onTip: setSoundTip });
  const wide = useWideScreen();
  // Match screens hold 4 pairs on phones, up to 6 on tablets/desktops (C5).
  const fullQuestions = useMemo(
    () => (wide ? regroupMatches(phoneQuestions, MATCH_PAIRS_WIDE) : phoneQuestions),
    [wide, phoneQuestions],
  );
  /** C2 (D44): a round of only the questions missed; null = the full round. */
  const [retryQs, setRetryQs] = useState<Question[] | null>(null);
  const questions = retryQs ?? fullQuestions;
  const roundMax = retryQs ? scoreOf(retryQs) : maxScore;
  /** Questions not answered right first time in this round. */
  const [missed, setMissed] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [details, setDetails] = useState<QuestionResult[]>([]);
  const started = useRef<number | null>(null);

  useEffect(() => {
    started.current = Date.now();
  }, []);

  const q = questions[index];
  const advance = (points: number) => {
    setScore((s) => s + points);
    if (q && q.type !== "flash") {
      const r = resultOf(q, points);
      setDetails((d) => [...d, r]);
      if (r.p < r.x) setMissed((m) => [...m, q]);
    }
    if (index + 1 >= questions.length) {
      sound.fanfare();
      setSeconds(started.current ? Math.round((Date.now() - started.current) / 1000) : 0);
      setFinished(true);
    } else {
      sound.swish();
      setIndex(index + 1);
    }
  };
  /** A soft tap sound for every button press inside the game (D34). */
  const onPointerDown = (e: React.PointerEvent) => {
    const button = (e.target as Element).closest("button, a");
    if (button && !(button as HTMLButtonElement).disabled) sound.tap();
  };

  const startRetry = () => {
    setRetryQs(missed);
    setMissed([]);
    setIndex(0);
    setScore(0);
    setDetails([]);
    setSeconds(0);
    started.current = Date.now();
    setFinished(false);
  };

  if (finished) {
    return (
      <Finish
        key={retryQs ? `retry-${retryQs.length}-${details.length}` : "full"}
        activityId={activityId}
        kind={kind}
        retry={retryQs !== null}
        missed={missed}
        onRetry={startRetry}
        score={score}
        maxScore={roundMax}
        seconds={seconds}
        details={details}
        sound={sound}
        record={record}
        playHref={playHref ?? `/learn/play/${activityId}`}
        guest={guest}
        topicHref={topicHref}
        nextHref={nextHref}
      />
    );
  }
  if (!q) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Sunny mood="think" size={96} />
        <p className="text-xl font-black">{t.noQuestions}</p>
        <Link href={topicHref} className="font-extrabold underline">
          {t.backToTopic}
        </Link>
      </div>
    );
  }

  return (
    <SettingsContext value={settings}>
      <div
        className="flex flex-1 flex-col"
        data-testid="player"
        data-kind={kind}
        onPointerDown={onPointerDown}
      >
        <div className="flex items-center gap-3 pt-4 pb-2">
          <Link
            href={topicHref}
            aria-label={t.exit}
            className="kid-press flex size-12 shrink-0 items-center justify-center rounded-full bg-k-surface"
          >
            <X className="size-6" aria-hidden="true" />
          </Link>
          <div
            className="flex flex-1 gap-1.5"
            role="progressbar"
            aria-label={t.progress}
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
            aria-label={sound.muted ? t.soundOn : t.soundOff}
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
        {soundTip ? <SoundTipBanner tip={soundTip} onClose={() => setSoundTip(null)} /> : null}
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
    </SettingsContext>
  );
}

/** "Turn the sound on" (C4): shown once when audio is blocked, or once per iPhone/iPad. */
function SoundTipBanner({ tip, onClose }: { tip: SoundTip; onClose: () => void }) {
  const t = useT();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const id = window.setTimeout(() => close.current(), 8000);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      role="status"
      data-testid="sound-tip"
      data-tip={tip}
      className="animate-kid-in mb-2 flex items-center gap-2 rounded-2xl bg-k-accent-soft px-3 py-2 text-base font-bold text-k-accent-ink"
    >
      <Volume2 className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{tip === "ios" ? t.soundTipIos : t.soundTip}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.closeTip}
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Wide enough (and tall enough) for 6 match pairs; read once, so a round never regroups mid-way. */
const WIDE_QUERY = "(min-width: 768px) and (min-height: 640px)";
function useWideScreen() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    // Client-only media query, read once after mount (the server renders the phone layout).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWide(typeof window.matchMedia === "function" && window.matchMedia(WIDE_QUERY).matches);
  }, []);
  return wide;
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
  const lang = useLang();
  return (
    <div className="animate-kid-in flex flex-1 flex-col">
      <div className="pt-3 text-center">
        <h1 className="font-kid-display text-[28px] leading-tight font-bold" data-testid="page-title">
          {en}
        </h1>
        {lang === "vi" ? <p className="text-[17px] font-bold text-k-soft">{vi}</p> : null}
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

type Answer = ReturnType<typeof useAnswer>;

/**
 * Feedback banner + continue button (D29). After a wrong answer: tries left
 * and, when hints are on, a 💡 button. Out of tries: the right answer shows
 * and the round moves on by itself.
 */
function Footer({
  a,
  last,
  onNext,
  rightText,
  rightDetail,
  wrongText,
  hint,
  answer,
}: {
  a: Pick<Answer, "status" | "triesLeft" | "hintText" | "hintOn" | "showHint" | "misses"> & {
    points: number;
  };
  last: boolean;
  onNext: () => void;
  rightText?: string;
  rightDetail?: React.ReactNode;
  wrongText?: string;
  /** Automatic hint when the teacher wrote none. */
  hint?: string;
  /** The right answer, shown when out of tries. */
  answer?: React.ReactNode;
}) {
  const next = useRef(onNext);
  useEffect(() => {
    next.current = onNext;
  });
  useEffect(() => {
    if (a.status !== "failed") return;
    const t = window.setTimeout(() => next.current(), AUTO_NEXT_MS);
    return () => window.clearTimeout(t);
  }, [a.status]);
  const t = useT();
  const hintText = a.hintText(hint);
  return (
    <>
      {a.status === "right" ? (
        <div
          className="animate-kid-in flex items-center gap-3 rounded-3xl bg-k-good-soft px-4 py-3"
          role="status"
          data-testid="feedback-right"
        >
          <span className="relative">
            <Sunny mood="cheer" size={56} className="animate-kid-jump" />
            {a.points > 0 ? (
              <span
                className="animate-kid-rise absolute -top-2 left-8 rounded-full bg-k-accent px-2 py-0.5 text-sm font-black whitespace-nowrap text-k-ink shadow"
                aria-hidden="true"
              >
                +{a.points} ⭐
              </span>
            ) : null}
          </span>
          <div>
            <p className="font-kid-display text-2xl font-bold text-k-good">
              {a.misses === 0 ? (rightText ?? t.great) : t.correct}
            </p>
            {rightDetail ? <p className="text-base font-bold">{rightDetail}</p> : null}
          </div>
        </div>
      ) : a.status === "failed" ? (
        <div
          className="animate-kid-in flex items-center gap-3 rounded-3xl bg-k-accent-soft px-4 py-3"
          role="status"
          data-testid="feedback-failed"
        >
          <Sunny mood="think" size={56} />
          <div>
            <p className="font-kid-display text-xl font-bold text-k-accent-ink">{t.failed}</p>
            {answer ? (
              <p className="text-base font-bold">
                {t.rightAnswer} <span data-testid="revealed-answer">{answer}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : a.status === "wrong" ? (
        <div
          className="animate-kid-in flex flex-col gap-2 rounded-3xl bg-k-bad-soft px-4 py-3"
          role="status"
          data-testid="feedback-wrong"
        >
          <div className="flex items-center gap-3">
            <Sunny mood="think" size={48} />
            <div className="flex-1">
              <p className="font-kid-display text-xl font-bold text-k-bad">{wrongText ?? t.tryAgain}</p>
              <p className="text-sm font-bold text-k-soft">{t.triesLeft(a.triesLeft)}</p>
            </div>
            {hintText && !a.hintOn ? (
              <button
                type="button"
                onClick={a.showHint}
                data-testid="hint-button"
                className="kid-press flex shrink-0 items-center gap-1 rounded-2xl bg-k-accent px-3 py-2 text-base font-black text-k-ink [--press:var(--k-accent-shadow)]"
              >
                <Lightbulb className="size-5" aria-hidden="true" />
                {t.hint}
              </button>
            ) : null}
          </div>
          {hintText && a.hintOn ? (
            <p className="flex items-start gap-2 text-base font-bold" data-testid="hint-text">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-k-accent-ink" aria-hidden="true" />
              {hintText}
            </p>
          ) : null}
        </div>
      ) : null}
      {a.status === "right" || a.status === "failed" ? (
        <button
          type="button"
          onClick={onNext}
          data-testid="next"
          className="kid-press h-16 w-full rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)]"
        >
          {last ? t.seeResults : t.nextQuestion}
        </button>
      ) : null}
    </>
  );
}

const AUTO_NEXT_MS = 3000;
/** Yes/No questions: one answer only, whatever the activity's maxTries (C3). */
const YES_NO_TRIES = 1;
/** Pause before an automatic check, so the child sees what they placed or typed. */
const AUTO_CHECK_MS = 400;

/**
 * Tracks one question's answer (D29): points 2 right first time, 1 right
 * after a mistake, 0 when out of tries (`settings.maxTries`). `done` covers
 * both endings, so components reveal the right answer either way.
 */
function useAnswer(
  sound: Sound,
  opts: {
    hint?: string;
    onFail?: () => void;
    /** Overrides the teacher's setting (Yes/No: 1). */ maxTries?: number;
  } = {},
) {
  const ctxSettings = useContext(SettingsContext);
  const settings = opts.maxTries ? { ...ctxSettings, maxTries: opts.maxTries } : ctxSettings;
  const [status, setStatus] = useState<Status>("idle");
  const [misses, setMisses] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  return {
    status,
    misses,
    done: status === "right" || status === "failed",
    points: status === "failed" ? POINTS.none : misses === 0 ? POINTS.first : POINTS.retry,
    triesLeft: Math.max(settings.maxTries - misses, 0),
    shake,
    /** Hint is on only after a mistake and the child asked for it. */
    hintOn: settings.hints && hintOn && status !== "right",
    showHint() {
      sound.hint();
      setHintOn(true);
    },
    /** The teacher's hint, else the automatic one; null when hints are off. */
    hintText(auto?: string): string | null {
      if (!settings.hints) return null;
      return opts.hint ?? auto ?? null;
    },
    right() {
      sound.correct();
      setStatus("right");
    },
    wrong(key: string) {
      sound.wrong();
      const m = misses + 1;
      setMisses(m);
      setShake(key);
      window.setTimeout(() => setShake(null), 400);
      if (m >= settings.maxTries) {
        setStatus("failed");
        opts.onFail?.();
      } else {
        setStatus("wrong");
      }
    },
  };
}

/** What a question was about, for the teacher's "often wrong" list (D32). */
function resultOf(q: Question, points: number): QuestionResult {
  const label = (() => {
    switch (q.type) {
      case "flash":
        return q.card.word;
      case "match":
        return q.pairs.map((c) => c.word).join(", ");
      case "true_false":
        return q.sentence;
      case "fill_blank":
        return `${q.before}${q.answer}${q.after}`.trim();
      case "rearrange":
        return q.answer.join(" ");
      case "choice":
        return q.prompt;
      default:
        return q.answer.word;
    }
  })();
  const max = q.type === "match" ? q.pairs.length * POINTS.first : POINTS.first;
  return { t: q.type, q: label.slice(0, 120), p: points, x: max };
}

/** Letter tile indexes that spell `word` in order. */
function lettersFor(word: string, letters: string[]): number[] {
  const taken: number[] = [];
  for (const ch of word) {
    const i = letters.findIndex((l, k) => l === ch && !taken.includes(k));
    if (i >= 0) taken.push(i);
  }
  return taken;
}

/** Word chip indexes that put `answer` in order (case-insensitive). */
function wordsFor(answer: string[], words: string[]): number[] {
  const taken: number[] = [];
  for (const w of answer) {
    const i = words.findIndex((x, k) => x.toLowerCase() === w.toLowerCase() && !taken.includes(k));
    if (i >= 0) taken.push(i);
  }
  return taken;
}

/** With the hint on, one wrong option (not the one already picked) is taken away. */
function eliminated<T>(a: Answer, options: T[], isAnswer: (o: T) => boolean, picked: T | null): T | null {
  if (!a.hintOn) return null;
  return options.find((o) => !isAnswer(o) && o !== picked) ?? null;
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
  const t = useT();
  // Back of the card: the Vietnamese meaning, in both interface languages (C10).
  const [flipped, setFlipped] = useState(false);
  const say = () => sound.speak(q.card.word);
  useEffect(() => {
    sound.speak(q.card.word);
  }, [q.card.word, sound]);
  const flip = () => {
    say();
    setFlipped((f) => !f);
  };
  return (
    <Frame
      type="flash"
      footer={
        <button
          type="button"
          onClick={() => onDone(POINTS.first)}
          data-testid="next"
          className="kid-press h-16 w-full rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)]"
        >
          {last ? t.flashDone : t.flashNext}
        </button>
      }
    >
      <button
        type="button"
        onClick={flip}
        aria-label={`${t.listenWord(q.card.word)}. ${flipped ? t.flipBack : t.flipCard}`}
        aria-pressed={flipped}
        data-testid="flash-card"
        data-flipped={flipped ? "true" : "false"}
        className="kid-flip w-full max-w-sm"
      >
        <span className="kid-flip-inner block" data-flipped={flipped ? "true" : "false"}>
          <span className="kid-flip-face flex flex-col items-center gap-2 rounded-[2rem] bg-k-surface px-6 py-8 shadow-[0_6px_0_var(--k-line)]">
            <Pic code={q.card.emoji} image={q.card.image} size={176} className="animate-kid-float" />
            <span className="font-kid-display text-5xl font-bold" data-testid="flash-word">
              {q.card.word}
            </span>
          </span>
          <span
            className="kid-flip-face kid-flip-back flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-k-accent-soft px-6 py-8 shadow-[0_6px_0_var(--k-accent-shadow)]"
            aria-hidden={!flipped}
          >
            <Pic code={q.card.emoji} image={q.card.image} size={96} />
            <span className="font-kid-display text-4xl font-bold">{q.card.word}</span>
            <span className="text-3xl font-black text-k-accent-ink" lang="vi" data-testid="flash-meaning">
              {q.card.meaningVi}
            </span>
          </span>
        </span>
      </button>
      <div className="flex items-center gap-3">
        <SpeakButton onClick={say} label={t.listenAgain} />
        <span className="flex items-center gap-1 text-base font-bold text-k-soft">
          <RotateCcw className="size-5" aria-hidden="true" />
          {flipped ? t.flipBack : t.flipCard}
        </span>
      </div>
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
  const t = useT();
  const a = useAnswer(sound, { hint: q.hint });
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sound.speak(q.answer.word), 300);
    return () => window.clearTimeout(t);
  }, [q.answer.word, sound]);
  const gone = eliminated(
    a,
    q.options.map((c) => c.word),
    (w) => w === q.answer.word,
    picked,
  );
  const choose = (c: Card) => {
    if (a.done || c.word === gone) return;
    setPicked(c.word);
    if (c.word === q.answer.word) a.right();
    else a.wrong(c.word);
  };
  return (
    <Frame
      type="listen_choose"
      footer={
        <Footer
          a={a}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={t.wordMeans(q.answer.word, q.answer.meaningVi)}
          hint={t.hintListenChoose}
          answer={`${q.answer.word} (${q.answer.meaningVi})`}
        />
      }
    >
      <SpeakButton big onClick={() => sound.speak(q.answer.word)} label={t.listenAgain} />
      <div className="grid w-full max-w-xl grid-cols-3 gap-3">
        {q.options.map((c) => {
          const isAnswer = c.word === q.answer.word;
          const state = a.done
            ? isAnswer
              ? "right"
              : "dim"
            : c.word === gone
              ? "dim"
              : picked === c.word && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={c.word}
              disabled={c.word === gone}
              type="button"
              onClick={() => choose(c)}
              aria-label={t.picture(c.meaningVi, q.options.indexOf(c) + 1)}
              data-testid="option"
              data-correct={isAnswer ? "true" : undefined}
              className={cn(
                choiceClass(state),
                "flex aspect-square items-center justify-center",
                a.shake === c.word && "animate-kid-shake",
              )}
            >
              <Pic code={c.emoji} image={c.image} size={96} className="h-auto w-[70%]" />
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
  const t = useT();
  const a = useAnswer(sound, { hint: q.hint });
  const [picked, setPicked] = useState<string | null>(null);
  const gone = eliminated(a, q.options, (w) => w === q.answer.word, picked);
  const choose = (w: string) => {
    if (a.done || w === gone) return;
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
          a={a}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={t.wordMeans(q.answer.word, q.answer.meaningVi)}
          hint={t.hintStartsWith(q.answer.word[0]!)}
          answer={q.answer.word}
        />
      }
    >
      <div className="flex size-44 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)] sm:size-52">
        <Pic code={q.answer.emoji} image={q.answer.image} size={150} className="animate-kid-float" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {q.options.map((w) => {
          const isAnswer = w === q.answer.word;
          const state = a.done
            ? isAnswer
              ? "right"
              : "dim"
            : w === gone
              ? "dim"
              : picked === w && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={w}
              disabled={w === gone}
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
  const t = useT();
  const words = useMemo(() => [...q.pairs].sort((x, y) => x.word.localeCompare(y.word)), [q.pairs]);
  const settings = useContext(SettingsContext);
  const [pic, setPic] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  /** Wrong taps per picture; at maxTries the pair is matched for the child (0 points). */
  const [misses, setMisses] = useState<Record<string, number>>({});
  const [shake, setShake] = useState<string | null>(null);
  const done = matched.length === q.pairs.length;
  const points = q.pairs.reduce((n, c) => {
    const m = misses[c.word] ?? 0;
    return n + (m >= settings.maxTries ? POINTS.none : m > 0 ? POINTS.retry : POINTS.first);
  }, 0);
  const anyMiss = Object.keys(misses).length > 0;
  /** 5–6 pairs (wide screens): smaller tiles so the screen still fits. */
  const dense = q.pairs.length > 4;

  const tapPicture = (w: string) => {
    setPic(w);
    // Hint: after a mistake on this picture, tapping it says its name.
    if (settings.hints && (misses[w] ?? 0) > 0) sound.speak(w);
  };
  const tapWord = (w: string) => {
    if (!pic || matched.includes(w)) return;
    sound.speak(w);
    if (pic === w) {
      sound.correct();
      setMatched([...matched, w]);
      setPic(null);
    } else {
      sound.wrong();
      const m = (misses[pic] ?? 0) + 1;
      setMisses({ ...misses, [pic]: m });
      setShake(w);
      window.setTimeout(() => setShake(null), 400);
      if (m >= settings.maxTries) {
        setMatched([...matched, pic]);
        setPic(null);
      }
    }
  };
  return (
    <Frame
      type="match"
      heading={q.meaning ? MEANING_HEADING : undefined}
      footer={
        <Footer
          a={{
            status: done ? "right" : "idle",
            misses: anyMiss ? 1 : 0,
            points,
            triesLeft: 0,
            hintText: () => null,
            hintOn: false,
            showHint: () => {},
          }}
          last={last}
          onNext={() => onDone(points)}
        />
      }
    >
      {anyMiss && settings.hints && !done ? (
        <p className="flex items-center gap-2 text-base font-bold text-k-soft" data-testid="hint-text">
          <Lightbulb className="size-5 text-k-accent-ink" aria-hidden="true" />
          {t.tapPictureToHear}
        </p>
      ) : null}
      <div
        className={cn("grid w-full grid-cols-2 gap-4", dense ? "max-w-2xl" : "max-w-xl")}
        data-testid="match-board"
        data-pairs={q.pairs.length}
      >
        <div className="flex flex-col gap-3">
          {q.pairs.map((c) => {
            const isDone = matched.includes(c.word);
            return (
              <button
                key={c.word}
                type="button"
                disabled={isDone}
                onClick={() => tapPicture(c.word)}
                aria-label={q.meaning ? c.meaningVi : t.picture(c.meaningVi, q.pairs.indexOf(c) + 1)}
                aria-pressed={pic === c.word}
                data-testid="match-picture"
                data-word={c.word}
                className={cn(
                  choiceClass(isDone ? "right" : "idle"),
                  "flex items-center justify-center",
                  dense ? "h-20" : "h-24",
                  pic === c.word && "border-k-accent ring-4 ring-k-accent/40",
                )}
              >
                {q.meaning ? (
                  <span
                    lang="vi"
                    className="px-2 text-lg leading-tight font-black text-k-accent-ink sm:text-xl"
                  >
                    {c.meaningVi}
                  </span>
                ) : (
                  <Pic code={c.emoji} image={c.image} size={dense ? 60 : 72} />
                )}
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
                  "px-2 text-xl font-black sm:text-2xl",
                  dense ? "h-20" : "h-24",
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
  const t = useT();
  const target = q.answer.word.toLowerCase();
  const [used, setUsed] = useState<number[]>([]);
  const a = useAnswer(sound, {
    hint: q.hint,
    // Out of tries: spell it out for the child.
    onFail: () => window.setTimeout(() => setUsed(lettersFor(target, q.letters)), 700),
  });
  const typed = used.map((i) => q.letters[i]).join("");

  const tap = (i: number) => {
    if (a.done || used.includes(i) || used.length >= target.length) return;
    const next = [...used, i];
    setUsed(next);
    const word = next.map((k) => q.letters[k]).join("");
    if (next.length === target.length) {
      if (word === target) {
        a.right();
        sound.speak(q.answer.word);
      } else {
        a.wrong("slots");
        // Clear for another try (the last miss spells the word instead, see onFail).
        if (a.triesLeft > 1) window.setTimeout(() => setUsed([]), 700);
      }
    }
  };
  return (
    <Frame
      type="spell"
      footer={
        <Footer
          a={a}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={t.wordMeans(q.answer.word, q.answer.meaningVi)}
          hint={t.hintStartsLength(target[0]!, target.length)}
          answer={q.answer.word}
        />
      }
    >
      <div className="relative flex size-44 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
        <Pic code={q.answer.emoji} image={q.answer.image} size={140} />
        <span className="absolute -top-3 -right-3">
          <SpeakButton onClick={() => sound.speak(q.answer.word)} label={t.listenAgain} />
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
              a.status === "failed" && "border-k-accent",
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
            disabled={used.includes(i) || a.done}
            onClick={() => tap(i)}
            aria-label={t.letter(l)}
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
          disabled={used.length === 0 || a.done}
          aria-label={t.deleteLetter}
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
  const t = useT();
  // Two options: a second try would always be right, so Yes/No allows one answer (C3, D40).
  const a = useAnswer(sound, { hint: q.hint, maxTries: YES_NO_TRIES });
  const [picked, setPicked] = useState<boolean | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sound.speak(q.sentence), 300);
    return () => window.clearTimeout(t);
  }, [q.sentence, sound]);
  const choose = (v: boolean) => {
    if (a.done) return;
    setPicked(v);
    if (v === q.answer) a.right();
    else a.wrong(String(v));
  };
  const btn = (v: boolean) => {
    const state =
      a.done && v === q.answer
        ? "right"
        : picked === v && a.status !== "right"
          ? "wrong"
          : a.done
            ? "dim"
            : "idle";
    return (
      <button
        type="button"
        onClick={() => choose(v)}
        disabled={a.done}
        aria-pressed={picked === v}
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
          a={a}
          last={last}
          onNext={() => onDone(a.points)}
          hint={t.hintTf(ctxType)}
          answer={q.answer ? "Yes" : "No"}
          rightDetail={t.tfRight(q.answer, Boolean(ctxType))}
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
          <PointPic code={q.emoji} size={ctxType ? 90 : 140} point={pointOf(q.sentence)} />
        </div>
      ) : null}
      <div className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-k-surface p-4">
        <SpeakButton onClick={() => sound.speak(q.sentence)} label={t.listenSentence} />
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
  const t = useT();
  const a = useAnswer(sound, { hint: q.hint });
  const [picked, setPicked] = useState<string | null>(null);
  const gone = eliminated(a, q.options, (w) => w === q.answer, picked);
  const choose = (w: string) => {
    if (a.done || w === gone) return;
    setPicked(w);
    if (w === q.answer) {
      a.right();
      sound.speak(`${q.before}${q.answer}${q.after}`);
    } else a.wrong(w);
  };
  return (
    <Frame
      type="fill_blank"
      footer={
        <Footer a={a} last={last} onNext={() => onDone(a.points)} hint={t.hintFill} answer={q.answer} />
      }
    >
      <div className="flex size-40 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
        <PointPic code={q.emoji} size={128} point={pointOf(q.before)} />
      </div>
      <p
        className="max-w-md text-center font-kid-display text-[26px] leading-relaxed font-bold"
        data-testid="sentence"
      >
        {q.before}
        <span
          className={cn(
            "mx-1 inline-block min-w-24 rounded-xl border-b-4 px-2 text-center",
            a.done ? "border-k-good bg-k-good-soft" : "border-k-accent bg-k-surface",
          )}
        >
          {a.done ? q.answer : " "}
        </span>
        {q.after}
      </p>
      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3">
        {q.options.map((w) => {
          const state = a.done
            ? w === q.answer
              ? "right"
              : "dim"
            : w === gone
              ? "dim"
              : picked === w && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={w}
              type="button"
              disabled={w === gone}
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
  const t = useT();
  const [order, setOrder] = useState<number[]>([]);
  const a = useAnswer(sound, {
    hint: q.hint,
    onFail: () => setOrder(wordsFor(q.answer, q.words)),
  });
  // Checked automatically once every word is placed (owner feedback 2026-11-12).
  const check = (next: number[]) => {
    if (
      sameSentence(
        next.map((i) => q.words[i]!),
        q.answer,
      )
    ) {
      a.right();
      sound.speak(q.answer.join(" "));
    } else a.wrong("line");
  };
  const add = (i: number) => {
    if (a.done || order.includes(i)) return;
    const next = [...order, i];
    setOrder(next);
    if (next.length === q.words.length) window.setTimeout(() => check(next), AUTO_CHECK_MS);
  };
  return (
    <Frame
      type="rearrange"
      footer={
        a.done ? (
          <Footer a={a} last={last} onNext={() => onDone(a.points)} answer={q.answer.join(" ")} />
        ) : (
          <>
            <Footer
              a={a}
              last={last}
              onNext={() => onDone(a.points)}
              wrongText={t.orderTryAgain}
              hint={t.hintOrder(q.answer[0]!)}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOrder([])}
                disabled={order.length === 0}
                className="kid-press flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-k-surface text-xl font-black disabled:opacity-40"
              >
                <RotateCcw className="size-7" aria-hidden="true" />
                {t.restart}
              </button>
            </div>
          </>
        )
      }
    >
      <div className="flex size-36 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
        <PointPic code={q.emoji} size={116} point={pointOf(q.answer.join(" "))} />
      </div>
      <div
        className={cn(
          "flex min-h-20 w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-3xl border-[3px] border-dashed p-3",
          a.done ? "border-k-good bg-k-good-soft" : "border-k-line",
          a.shake === "line" && "animate-kid-shake",
        )}
        data-testid="sentence-line"
        data-answer={q.answer.join(" ")}
      >
        {order.length === 0 ? <span className="text-lg font-bold text-k-soft">{t.tapWords}</span> : null}
        {order.map((wi, pos) => (
          <button
            key={`${wi}-${pos}`}
            type="button"
            disabled={a.done}
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
            disabled={order.includes(i) || a.done}
            onClick={() => add(i)}
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
  const t = useT();
  const { writeHint } = useContext(SettingsContext);
  const [typed, setTyped] = useState("");
  const a = useAnswer(sound, { hint: q.hint, onFail: () => setTyped(q.answer.word) });
  const pattern = useMemo(() => revealPattern(q.answer.word), [q.answer.word]);
  const tiles = useMemo(() => letterTiles(q.answer.word), [q.answer.word]);
  /** Tile indexes used so far (letters mode), so each tile is used once. */
  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sound.speak(q.answer.word), 300);
    return () => window.clearTimeout(t);
  }, [q.answer.word, sound]);
  const timer = useRef<number | null>(null);
  const verify = (value: string) => {
    if (a.done || !value.trim()) return;
    if (sameWord(value, q.answer.word)) {
      a.right();
      sound.speak(q.answer.word);
    } else {
      a.wrong("input");
      if (writeHint === "letters") {
        // Tiles only: clear for another try (the last miss fills in the word, see onFail).
        if (a.triesLeft > 1)
          window.setTimeout(() => {
            setTyped("");
            setUsedTiles([]);
          }, 700);
      } else input.current?.select();
    }
  };
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) window.clearTimeout(timer.current);
    verify(typed);
  };
  // Checked automatically once as many letters as the word has are typed;
  // the Check button / Enter stays for shorter or longer answers.
  const letters = (v: string) => v.replace(/\s+/g, "").length;
  const change = (value: string) => {
    setTyped(value);
    if (timer.current) window.clearTimeout(timer.current);
    if (letters(value) === letters(q.answer.word)) {
      timer.current = window.setTimeout(() => verify(value), AUTO_CHECK_MS);
    }
  };
  return (
    <Frame
      type="listen_type"
      footer={
        <Footer
          a={a}
          last={last}
          onNext={() => onDone(a.points)}
          rightDetail={t.wordMeans(q.answer.word, q.answer.meaningVi)}
          hint={t.hintStartsLength(q.answer.word[0]!, q.answer.word.length)}
          answer={`${q.answer.word} (${q.answer.meaningVi})`}
        />
      }
    >
      {a.done ? (
        <div className="animate-kid-pop flex size-40 items-center justify-center rounded-[2rem] bg-k-surface shadow-[0_6px_0_var(--k-line)]">
          <Pic code={q.answer.emoji} image={q.answer.image} size={120} />
        </div>
      ) : (
        <SpeakButton big onClick={() => sound.speak(q.answer.word)} label={t.listenAgain} />
      )}
      <form onSubmit={check} className="flex w-full max-w-md flex-col gap-3">
        {writeHint === "some" && !a.done ? (
          <p
            className="text-center font-kid-display text-4xl font-bold tracking-[0.3em] text-k-soft"
            aria-label={t.letterHint}
            data-testid="letter-pattern"
          >
            {pattern.map((c) => c ?? "_").join("")}
          </p>
        ) : null}
        <input
          ref={input}
          value={typed}
          onChange={(e) => change(e.target.value)}
          readOnly={a.done || writeHint === "letters"}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode={writeHint === "letters" ? "none" : "text"}
          aria-label={t.writeWord}
          placeholder={writeHint === "slots" ? "_ ".repeat(q.answer.word.length).trim() : undefined}
          data-testid="type-input"
          data-answer={q.answer.word.toLowerCase()}
          className={cn(
            "h-20 w-full rounded-3xl border-[3px] bg-k-surface text-center font-kid-display text-4xl font-bold tracking-wider outline-none focus:border-k-primary",
            a.status === "right" ? "border-k-good" : a.status === "wrong" ? "border-k-bad" : "border-k-line",
            a.shake === "input" && "animate-kid-shake",
          )}
        />
        {writeHint === "letters" && !a.done ? (
          <div className="flex flex-wrap justify-center gap-2" data-testid="letter-tiles">
            {tiles.map((l, i) => (
              <button
                key={i}
                type="button"
                disabled={usedTiles.includes(i)}
                onClick={() => {
                  setUsedTiles([...usedTiles, i]);
                  change(typed + l);
                }}
                aria-label={t.letter(l)}
                data-testid="tile"
                data-letter={l}
                className="kid-press h-14 w-12 rounded-2xl bg-k-primary text-2xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)] disabled:opacity-30"
              >
                {l}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setUsedTiles(usedTiles.slice(0, -1));
                setTyped(typed.slice(0, -1));
              }}
              disabled={!typed}
              aria-label={t.deleteLetter}
              className="kid-press flex h-14 w-12 items-center justify-center rounded-2xl bg-k-surface disabled:opacity-30"
            >
              <Delete className="size-6" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {!a.done ? (
          <button
            type="submit"
            disabled={!typed.trim()}
            data-testid="check"
            className="kid-press h-16 w-full rounded-2xl bg-k-accent text-xl font-black text-k-ink [--press:var(--k-accent-shadow)] disabled:opacity-40"
          >
            {t.check}
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
  const t = useT();
  const a = useAnswer(sound, { hint: q.hint });
  const [picked, setPicked] = useState<string | null>(null);
  const gone = eliminated(a, q.options, (o) => o === q.answer, picked);
  // vi_en: the English is in the choices, so read each choice aloud when tapped.
  const englishPrompt = q.translate !== "vi_en";
  const choose = (o: string) => {
    if (a.done || o === gone) return;
    setPicked(o);
    if (!englishPrompt) sound.speak(o);
    if (o === q.answer) a.right();
    else a.wrong(o);
  };
  return (
    <Frame
      type="choice"
      heading={
        q.translate ? TRANSLATE_HEADINGS[q.translate] : ctxType ? CONTEXT_HEADINGS[ctxType].mc : undefined
      }
      footer={
        <Footer
          a={a}
          last={last}
          onNext={() => onDone(a.points)}
          hint={t.hintChoice(ctxType)}
          answer={q.answer}
        />
      }
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-k-surface p-4">
        {q.emoji ? <Pic code={q.emoji} size={56} className="shrink-0" /> : null}
        <p
          className="flex-1 font-kid-display text-2xl leading-snug font-bold"
          data-testid="sentence"
          lang={englishPrompt ? "en" : "vi"}
        >
          {q.prompt}
        </p>
        {englishPrompt ? (
          <SpeakButton onClick={() => sound.speak(q.prompt)} label={t.listenQuestion} />
        ) : null}
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {q.options.map((o) => {
          const isAnswer = o === q.answer;
          const state = a.done
            ? isAnswer
              ? "right"
              : "dim"
            : o === gone
              ? "dim"
              : picked === o && a.status === "wrong"
                ? "wrong"
                : "idle";
          return (
            <button
              key={o}
              disabled={o === gone}
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
  const t = useT();
  const listening = ctx.type === "listening";
  return (
    <section
      className="mt-2 rounded-3xl bg-k-surface p-3 shadow-[0_3px_0_var(--k-line)]"
      data-testid="context"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-black">
          {ctx.type === "reading" && ctx.emoji ? <Pic code={ctx.emoji} size={28} /> : null}
          {ctx.type === "reading" ? (ctx.title ?? t.readTitle) : t.listenTitle}
        </p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="rounded-full px-3 py-1 text-sm font-extrabold text-k-soft"
        >
          {open ? t.hide(listening) : t.show(listening)}
        </button>
      </div>
      {/* Hidden, not unmounted, so a playing video keeps its place. */}
      <div className={cn("mt-2", !open && "hidden")}>
        {ctx.type === "listening" ? (
          ctx.youtube ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ctx.youtube.videoId}?rel=0&playsinline=1${ctx.youtube.start ? `&start=${ctx.youtube.start}` : ""}`}
                title={t.videoTitle}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="size-full"
                data-testid="youtube"
              />
            </div>
          ) : ctx.audioUrl ? (
            <audio controls preload="metadata" src={ctx.audioUrl} className="w-full" data-testid="audio">
              {t.noAudio}
            </audio>
          ) : (
            <p className="text-sm font-bold text-k-soft">{t.mediaMissing}</p>
          )
        ) : (
          <div className="flex items-start gap-2">
            <p
              className="max-h-56 flex-1 overflow-y-auto text-[19px] leading-relaxed font-bold whitespace-pre-line"
              data-testid="passage"
            >
              {ctx.passage}
            </p>
            <SpeakButton onClick={() => sound.speak(ctx.passage)} label={t.readAloud} />
          </div>
        )}
      </div>
    </section>
  );
}

/** The right answer of a question, in words, for the "let's look again" list (C2). */
function answerText(q: Question): string {
  switch (q.type) {
    case "true_false":
      return `${q.sentence} → ${q.answer ? "Yes" : "No"}`;
    case "fill_blank":
      return `${q.before}${q.answer}${q.after}`.trim();
    case "rearrange":
      return q.answer.join(" ");
    case "choice":
      return `${q.prompt} → ${q.answer}`;
    case "match":
      return q.pairs.map((c) => c.word).join(", ");
    case "flash":
      return q.card.word;
    default:
      return q.answer.word;
  }
}

function answerCard(q: Question): Card | null {
  return "answer" in q && typeof q.answer === "object" && !Array.isArray(q.answer) ? q.answer : null;
}

const REVIEW_SHOWN = 6;

function Review({ missed }: { missed: Question[] }) {
  const t = useT();
  const lang = useLang();
  return (
    <section className="w-full max-w-md rounded-3xl bg-k-surface p-4 text-left" data-testid="review">
      <h2 className="mb-2 font-kid-display text-xl font-bold">{t.reviewTitle}</h2>
      <ul className="flex flex-col gap-2">
        {missed.slice(0, REVIEW_SHOWN).map((q, i) => {
          const card = answerCard(q);
          return (
            <li key={i} className="flex items-center gap-3 text-lg font-bold" data-testid="review-item">
              {card ? (
                <Pic code={card.emoji} image={card.image} size={40} className="shrink-0" />
              ) : "emoji" in q && q.emoji ? (
                <Pic code={q.emoji} size={40} className="shrink-0" />
              ) : (
                <Check className="size-6 shrink-0 text-k-good" aria-hidden="true" />
              )}
              <span>
                {answerText(q)}
                {card && lang === "vi" ? (
                  <span className="block text-base font-semibold text-k-soft">{card.meaningVi}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {missed.length > REVIEW_SHOWN ? (
        <p className="mt-2 text-base font-bold text-k-soft">{t.reviewMore(missed.length - REVIEW_SHOWN)}</p>
      ) : null}
    </section>
  );
}

function Finish({
  activityId,
  kind,
  retry,
  missed,
  onRetry,
  score,
  maxScore,
  seconds,
  details,
  sound,
  record,
  playHref,
  guest,
  topicHref,
  nextHref,
}: {
  activityId: string;
  kind: PracticeKind;
  /** This was a "practise the mistakes" round (C2): no stars, its own message. */
  retry: boolean;
  missed: Question[];
  onRetry: () => void;
  score: number;
  maxScore: number;
  seconds: number;
  details: QuestionResult[];
  sound: Sound;
  record?: (r: RoundResult) => Promise<unknown>;
  playHref: string;
  guest?: { loginHref: string };
  topicHref: string;
  nextHref: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sent = useRef(false);
  const stars = retry ? 0 : starsFor(score, maxScore);
  const fixed = details.filter((d) => d.p > 0).length;

  useEffect(() => {
    if (sent.current || maxScore < 1) return;
    sent.current = true;
    startTransition(async () => {
      const result = { score, maxScore, seconds, details };
      // Retry rounds are kept for the teacher (signed-in pupils only), never as a full round.
      if (retry) {
        if (!guest) await recordPractice({ activityId, ...result, retry: true });
        return;
      }
      await (record ? record(result) : recordPractice({ activityId, ...result }));
    });
  }, [activityId, score, maxScore, seconds, details, record, retry, guest]);

  // One "ding" per star, in time with the stars popping in (globals.css).
  useEffect(() => {
    const timers = Array.from({ length: stars }, (_, i) =>
      window.setTimeout(() => sound.star(i), 900 + i * 400),
    );
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [stars, sound]);

  const message = retry ? t.retryDone(fixed, details.length) : t.cheer(stars);
  const celebrate = retry ? fixed > 0 : stars > 0;

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden py-10 text-center"
      data-testid="finish"
    >
      {celebrate ? (
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
      <Sunny mood={celebrate ? "cheer" : "think"} size={128} className="animate-kid-float" />
      <h1 className="font-kid-display text-4xl font-bold" data-testid="page-title">
        {message}
      </h1>
      {retry ? (
        <p className="text-base font-bold text-k-soft" data-testid="retry-note">
          {t.retryNoStars}
        </p>
      ) : (
        <>
          <Stars value={stars} size={52} label={t.starsOf(stars)} className="kid-stars-reveal" />
          <p className="text-xl font-bold" data-testid="score">
            {kind === "flashcards" ? t.flashSeen(maxScore / POINTS.first) : t.score(score, maxScore)}
          </p>
        </>
      )}
      {missed.length > 0 ? <Review missed={missed} /> : null}
      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        {missed.length > 0 ? (
          <button
            type="button"
            onClick={onRetry}
            data-testid="retry-mistakes"
            className="kid-press h-16 rounded-2xl bg-k-accent text-xl font-black text-k-ink [--press:var(--k-accent-shadow)]"
          >
            {t.retryMistakes(missed.length)}
          </button>
        ) : null}
        {nextHref ? (
          <Link
            href={nextHref}
            className="kid-press flex h-16 items-center justify-center rounded-2xl bg-k-primary text-xl font-black text-k-primary-ink [--press:var(--k-primary-shadow)]"
          >
            {t.nextActivity}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => router.push(`${playHref}?r=${Math.floor(Math.random() * 1e6)}`)}
          className="kid-press h-14 rounded-2xl bg-k-surface text-lg font-black"
        >
          {retry ? t.playFullAgain : t.playAgain}
        </button>
        {guest ? (
          <Link
            href={guest.loginHref}
            className="kid-press flex h-14 items-center justify-center rounded-2xl bg-k-surface text-lg font-black"
            data-testid="guest-login"
          >
            {t.loginToSave}
          </Link>
        ) : (
          <Link
            href={topicHref}
            className="kid-press flex h-14 items-center justify-center rounded-2xl bg-k-surface text-lg font-black"
          >
            {t.aboutTopic}
          </Link>
        )}
      </div>
    </div>
  );
}
