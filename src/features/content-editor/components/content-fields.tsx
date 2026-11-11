"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { codeToEmoji, EMOJI_CODE_PATTERN, emojiSrc, emojiToCode } from "@/features/practice/emoji";
import {
  AUDIO_MAX_BYTES,
  AUDIO_TYPES,
  isSentenceKind,
  KIND_LABEL_VI,
  MIXED_MAX_STEPS,
  parseYouTube,
  STEP_KINDS,
  WORD_KINDS,
  emptyContentFor,
  type Media,
  type PracticeKind,
} from "@/features/practice/model";
import { createClient } from "@/lib/supabase/browser";

/**
 * Per-kind content editors for one practice activity. Each edits a plain
 * object; `serializeContent` tidies it for the save action, which validates
 * it again on the server (model.ts `contentSchemaFor`).
 */

export type Content = Record<string, unknown>;
export type TopicWord = { word: string; emoji: string | null };

export function toCode(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const c = EMOJI_CODE_PATTERN.test(v.toLowerCase()) ? v.toLowerCase() : emojiToCode(v);
  return EMOJI_CODE_PATTERN.test(c) ? c : null;
}

const box = "flex flex-col gap-3 rounded-lg border border-line p-4";

// ------------------------------------------------------------ dispatcher ---

export function ContentFields({
  kind,
  content,
  onChange,
  topicWords,
}: {
  kind: PracticeKind;
  content: Content;
  onChange: (c: Content) => void;
  topicWords: TopicWord[];
}) {
  if (WORD_KINDS.includes(kind)) {
    return (
      <WordPicker
        topicWords={topicWords}
        value={Array.isArray(content.words) ? (content.words as string[]) : []}
        onChange={(words) => onChange(words.length ? { words } : {})}
      />
    );
  }
  if (isSentenceKind(kind)) {
    return (
      <SentenceItems
        kind={kind}
        items={(content.items as SentenceDraft[] | undefined) ?? []}
        onChange={(items) => onChange({ items })}
      />
    );
  }
  if (kind === "listening") {
    return (
      <div className="flex flex-col gap-4">
        <MediaField
          value={(content.media as Media | undefined) ?? null}
          onChange={(media) => onChange({ ...content, media: media ?? undefined })}
        />
        <QuizItems
          items={(content.items as QuizDraft[] | undefined) ?? []}
          onChange={(items) => onChange({ ...content, items })}
          help="Câu hỏi về nội dung bài nghe, theo đúng thứ tự trong bài."
        />
      </div>
    );
  }
  if (kind === "reading") {
    return (
      <div className="flex flex-col gap-4">
        <fieldset className={box} data-testid="passage-editor">
          <legend className="px-1 text-sm font-semibold">Đoạn văn</legend>
          <div className="flex flex-wrap items-center gap-2">
            <ItemEmoji
              value={(content.emoji as string | null | undefined) ?? null}
              onChange={(emoji) => onChange({ ...content, emoji })}
            />
            <Input
              value={(content.title as string | undefined) ?? ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="Tiêu đề (không bắt buộc), ví dụ: My pet"
              aria-label="Tiêu đề đoạn văn"
              maxLength={80}
              className="min-w-48 flex-1"
            />
          </div>
          <textarea
            value={(content.passage as string | undefined) ?? ""}
            onChange={(e) => onChange({ ...content, passage: e.target.value })}
            placeholder={"Hello! My name is Lan. I have a cat. It is black and white…"}
            aria-label="Đoạn văn"
            maxLength={1500}
            rows={6}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base"
            data-testid="passage-input"
          />
          <p className="text-xs text-ink-soft">
            3–8 câu ngắn là vừa. Tối đa 1500 ký tự. Học sinh xem đoạn văn ở trên mỗi câu hỏi.
          </p>
        </fieldset>
        <QuizItems
          items={(content.items as QuizDraft[] | undefined) ?? []}
          onChange={(items) => onChange({ ...content, items })}
          help="Câu hỏi về đoạn văn: Đúng/Sai hoặc chọn 1 đáp án."
        />
      </div>
    );
  }
  return (
    <MixedSteps
      steps={(content.steps as StepDraft[] | undefined) ?? []}
      onChange={(steps) => onChange({ steps })}
      topicWords={topicWords}
    />
  );
}

/** Tidies editor drafts into the stored shape (trimmed text, emoji codes). */
export function serializeContent(kind: PracticeKind, content: Content): Content {
  if (WORD_KINDS.includes(kind)) {
    const words = Array.isArray(content.words) ? (content.words as string[]) : [];
    return words.length ? { words } : {};
  }
  if (isSentenceKind(kind)) {
    return {
      items: ((content.items as SentenceDraft[] | undefined) ?? []).map((i) => normaliseSentence(kind, i)),
    };
  }
  const items = ((content.items as QuizDraft[] | undefined) ?? []).map(normaliseQuiz);
  if (kind === "listening") return content.media ? { media: content.media, items } : { items };
  if (kind === "reading") {
    const title = String(content.title ?? "").trim();
    return {
      emoji: toCode(String(content.emoji ?? "")) ?? (content.emoji as string | null | undefined) ?? null,
      ...(title ? { title } : {}),
      passage: String(content.passage ?? "").trim(),
      items,
    };
  }
  return {
    steps: ((content.steps as StepDraft[] | undefined) ?? []).map((s) => ({
      kind: s.kind,
      content: serializeContent(s.kind, s.content),
    })),
  };
}

// ----------------------------------------------------------- word picker ---

function WordPicker({
  topicWords,
  value,
  onChange,
}: {
  topicWords: TopicWord[];
  value: string[];
  onChange: (words: string[]) => void;
}) {
  return (
    <fieldset className={box} data-testid="word-picker">
      <legend className="px-1 text-sm font-semibold">Từ dùng trong bài</legend>
      <p className="text-sm text-ink-soft">
        Không chọn từ nào = dùng tất cả từ có hình của chủ đề. Mỗi lần chơi, hệ thống lấy ngẫu nhiên tối đa 8
        từ.
      </p>
      <div className="flex flex-wrap gap-2">
        {topicWords.map((w) => {
          const on = value.includes(w.word);
          return (
            <label
              key={w.word}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-ink bg-sun-soft" : "border-line bg-surface"}`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  onChange(e.target.checked ? [...value, w.word] : value.filter((x) => x !== w.word))
                }
                className="size-4 accent-ink"
              />
              {emojiSrc(w.emoji) ? (
                <Image src={emojiSrc(w.emoji)!} alt="" width={22} height={22} unoptimized />
              ) : null}
              {w.word}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// -------------------------------------------------------- sentence items ---

type SentenceDraft = {
  emoji?: string | null;
  sentence: string;
  answer?: boolean | string;
  options?: string[];
};

const SENTENCE_HELP: Record<string, string> = {
  true_false: "Mỗi câu: một hình, một câu tiếng Anh, và câu đó đúng hay sai với hình.",
  fill_blank: "Viết ___ (3 dấu gạch dưới) ở chỗ trống. Nhập đáp án đúng và 2 đáp án sai.",
  rearrange: "Viết câu đúng, hệ thống tự xáo trộn các từ cho học sinh sắp xếp (2–10 từ).",
};

function SentenceItems({
  kind,
  items,
  onChange,
}: {
  kind: PracticeKind;
  items: SentenceDraft[];
  onChange: (items: SentenceDraft[]) => void;
}) {
  const update = (i: number, patch: Partial<SentenceDraft>) =>
    onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  return (
    <fieldset className={box} data-testid="item-editor">
      <legend className="px-1 text-sm font-semibold">Câu hỏi ({items.length})</legend>
      <p className="text-sm text-ink-soft">{SENTENCE_HELP[kind]}</p>
      <ol className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={i} className="flex flex-col gap-2 rounded-lg bg-paper p-3" data-testid="item-row">
            <ItemHeader n={i + 1} onRemove={() => onChange(items.filter((_, k) => k !== i))}>
              <ItemEmoji value={it.emoji ?? null} onChange={(emoji) => update(i, { emoji })} />
            </ItemHeader>
            <Input
              value={it.sentence}
              onChange={(e) => update(i, { sentence: e.target.value })}
              placeholder={kind === "fill_blank" ? "A ___ can swim." : "This is a dog."}
              aria-label={`Câu ${i + 1}`}
              maxLength={200}
            />
            {kind === "true_false" ? (
              <YesNo
                name={`answer-${i}`}
                value={it.answer === true}
                onChange={(answer) => update(i, { answer })}
                yes="Đúng với hình (Yes)"
                no="Sai với hình (No)"
              />
            ) : null}
            {kind === "fill_blank" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={typeof it.answer === "string" ? it.answer : ""}
                  onChange={(e) => update(i, { answer: e.target.value })}
                  placeholder="Đáp án đúng"
                  aria-label={`Đáp án đúng câu ${i + 1}`}
                  className="border-leaf"
                />
                {[0, 1].map((k) => (
                  <Input
                    key={k}
                    value={wrongOptions(it)[k] ?? ""}
                    onChange={(e) => {
                      const wrong = [...wrongOptions(it)];
                      wrong[k] = e.target.value;
                      update(i, { options: [typeof it.answer === "string" ? it.answer : "", ...wrong] });
                    }}
                    placeholder={`Đáp án sai ${k + 1}`}
                    aria-label={`Đáp án sai ${k + 1} câu ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <AddButton
        onClick={() =>
          onChange([
            ...items,
            kind === "true_false"
              ? { emoji: null, sentence: "", answer: true }
              : kind === "fill_blank"
                ? { emoji: null, sentence: "", answer: "", options: ["", "", ""] }
                : { emoji: null, sentence: "" },
          ])
        }
      />
    </fieldset>
  );
}

function wrongOptions(it: SentenceDraft): string[] {
  const answer = typeof it.answer === "string" ? it.answer : "";
  const opts = it.options ?? [];
  const rest = opts.filter((o, i) => !(i === 0 && o === answer));
  return [rest[0] ?? "", rest[1] ?? ""];
}

function emojiCode(e: string | null | undefined): string | null {
  return e ? (toCode(e) ?? e) : null;
}

function normaliseSentence(kind: PracticeKind, it: SentenceDraft) {
  const emoji = emojiCode(it.emoji);
  const sentence = it.sentence.trim();
  if (kind === "true_false") return { emoji, sentence, answer: it.answer === true };
  if (kind === "fill_blank") {
    const answer = typeof it.answer === "string" ? it.answer.trim() : "";
    const wrong = wrongOptions(it)
      .map((o) => o.trim())
      .filter(Boolean);
    return { emoji, sentence, answer, options: [answer, ...wrong] };
  }
  return { emoji, sentence };
}

// ------------------------------------------------------------ quiz items ---

type QuizDraft =
  | { type: "tf"; emoji?: string | null; sentence: string; answer: boolean }
  | { type: "mc"; emoji?: string | null; question: string; answer: string; options: string[] };

function normaliseQuiz(it: QuizDraft) {
  const emoji = emojiCode(it.emoji);
  if (it.type === "tf") return { type: "tf", emoji, sentence: it.sentence.trim(), answer: it.answer };
  const answer = it.answer.trim();
  const wrong = it.options
    .slice(1)
    .map((o) => o.trim())
    .filter(Boolean);
  return { type: "mc", emoji, question: it.question.trim(), answer, options: [answer, ...wrong] };
}

function QuizItems({
  items,
  onChange,
  help,
}: {
  items: QuizDraft[];
  onChange: (items: QuizDraft[]) => void;
  help: string;
}) {
  const set = (i: number, item: QuizDraft) => onChange(items.map((it, k) => (k === i ? item : it)));
  return (
    <fieldset className={box} data-testid="quiz-editor">
      <legend className="px-1 text-sm font-semibold">Câu hỏi ({items.length})</legend>
      <p className="text-sm text-ink-soft">{help}</p>
      <ol className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={i} className="flex flex-col gap-2 rounded-lg bg-paper p-3" data-testid="item-row">
            <ItemHeader n={i + 1} onRemove={() => onChange(items.filter((_, k) => k !== i))}>
              <ItemEmoji value={it.emoji ?? null} onChange={(emoji) => set(i, { ...it, emoji })} />
              <span className="text-xs text-ink-soft">(hình không bắt buộc)</span>
            </ItemHeader>
            {it.type === "tf" ? (
              <>
                <Input
                  value={it.sentence}
                  onChange={(e) => set(i, { ...it, sentence: e.target.value })}
                  placeholder="Lan has a black cat."
                  aria-label={`Câu ${i + 1}`}
                  maxLength={200}
                />
                <YesNo
                  name={`quiz-${i}`}
                  value={it.answer}
                  onChange={(answer) => set(i, { ...it, answer })}
                  yes="Đúng theo bài (Yes)"
                  no="Sai theo bài (No)"
                />
              </>
            ) : (
              <>
                <Input
                  value={it.question}
                  onChange={(e) => set(i, { ...it, question: e.target.value })}
                  placeholder="What colour is the cat?"
                  aria-label={`Câu hỏi ${i + 1}`}
                  maxLength={200}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((k) => (
                    <Input
                      key={k}
                      value={k === 0 ? it.answer : (it.options[k] ?? "")}
                      onChange={(e) => {
                        const options = [it.answer, it.options[1] ?? "", it.options[2] ?? ""];
                        options[k] = e.target.value;
                        set(i, { ...it, answer: options[0]!, options });
                      }}
                      placeholder={k === 0 ? "Đáp án đúng" : `Đáp án sai ${k}`}
                      aria-label={k === 0 ? `Đáp án đúng câu ${i + 1}` : `Đáp án sai ${k} câu ${i + 1}`}
                      className={k === 0 ? "border-leaf" : undefined}
                      maxLength={80}
                    />
                  ))}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <AddButton
          label="Thêm câu Đúng/Sai"
          onClick={() => onChange([...items, { type: "tf", emoji: null, sentence: "", answer: true }])}
        />
        <AddButton
          label="Thêm câu chọn đáp án"
          onClick={() =>
            onChange([...items, { type: "mc", emoji: null, question: "", answer: "", options: ["", "", ""] }])
          }
        />
      </div>
    </fieldset>
  );
}

// ----------------------------------------------------------------- media ---

function MediaField({ value, onChange }: { value: Media | null; onChange: (m: Media | null) => void }) {
  const [link, setLink] = useState(
    value?.source === "youtube"
      ? `https://youtu.be/${value.videoId}${value.start ? `?t=${value.start}` : ""}`
      : "",
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const applyLink = (text: string) => {
    setLink(text);
    if (!text.trim()) {
      setLinkError(null);
      if (value?.source === "youtube") onChange(null);
      return;
    }
    const yt = parseYouTube(text);
    setLinkError(yt ? null : "Không đọc được link. Dán link dạng youtube.com/watch?v=… hoặc youtu.be/…");
    if (yt) onChange({ source: "youtube", ...yt });
  };

  const upload = async (file: File) => {
    setUploadError(null);
    const ext = AUDIO_TYPES[file.type as keyof typeof AUDIO_TYPES];
    if (!ext) return setUploadError("Chỉ nhận file mp3, m4a hoặc wav.");
    if (file.size > AUDIO_MAX_BYTES) return setUploadError("File lớn hơn 10 MB. Hãy cắt ngắn hoặc nén lại.");
    setUploading(true);
    const path = `practice/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient()
      .storage.from("learning-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setUploadError("Không tải lên được. Vui lòng thử lại.");
    setLink("");
    setLinkError(null);
    onChange({ source: "file", path, name: file.name.slice(0, 120) });
  };

  return (
    <fieldset className={box} data-testid="media-editor">
      <legend className="px-1 text-sm font-semibold">Bài nghe</legend>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Link YouTube
        <Input
          value={link}
          onChange={(e) => applyLink(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={linkError ? true : undefined}
          data-testid="youtube-input"
        />
      </label>
      {linkError ? <p className="text-sm text-berry">{linkError}</p> : null}
      <p className="text-center text-xs font-semibold text-ink-soft">— hoặc —</p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Tải file audio của thầy cô (mp3, m4a, wav · tối đa 10 MB)
        <span className="flex items-center gap-2">
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,.mp3,.m4a,.wav"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5"
            data-testid="audio-input"
          />
          {uploading ? <Loader2 className="size-4 animate-spin" aria-label="Đang tải lên" /> : null}
        </span>
      </label>
      {uploadError ? <p className="text-sm text-berry">{uploadError}</p> : null}
      <p className="text-sm" data-testid="media-current">
        {value?.source === "youtube" ? (
          <>
            Đang dùng video YouTube <code>{value.videoId}</code>
            {value.start ? ` (bắt đầu từ giây ${value.start})` : ""}.
          </>
        ) : value?.source === "file" ? (
          <span className="inline-flex items-center gap-1">
            <Upload className="size-4" aria-hidden="true" /> Đang dùng file: {value.name ?? "audio"}
          </span>
        ) : (
          <span className="text-ink-soft">Chưa có bài nghe.</span>
        )}
      </p>
    </fieldset>
  );
}

// ----------------------------------------------------------------- mixed ---

type StepDraft = { kind: Exclude<PracticeKind, "mixed">; content: Content };

function MixedSteps({
  steps,
  onChange,
  topicWords,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
  topicWords: TopicWord[];
}) {
  const [nextKind, setNextKind] = useState<StepDraft["kind"]>("listen_choose");
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const copy = [...steps];
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    onChange(copy);
  };
  return (
    <div className="flex flex-col gap-4" data-testid="mixed-editor">
      <p className="text-sm text-ink-soft">
        Ghép 2–{MIXED_MAX_STEPS} chặng thành một bài, ví dụ: Nghe chọn hình → Đọc hiểu → Sắp xếp câu → Nghe và
        viết từ. Mỗi chặng lấy tối đa 3 câu (dạng Nối: 1 lượt). Sao tính chung cho cả bài.
      </p>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="rounded-lg border-2 border-sky-soft p-3" data-testid="mixed-step">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-sky-soft px-2 py-1 text-sm font-semibold">
                Chặng {i + 1}: {KIND_LABEL_VI[step.kind]}
              </span>
              <span className="ml-auto flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)} aria-label="Lên">
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)} aria-label="Xuống">
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-berry"
                  onClick={() => onChange(steps.filter((_, k) => k !== i))}
                  aria-label={`Xoá chặng ${i + 1}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </span>
            </div>
            <ContentFields
              kind={step.kind}
              content={step.content}
              topicWords={topicWords}
              onChange={(content) => onChange(steps.map((s, k) => (k === i ? { ...s, content } : s)))}
            />
          </li>
        ))}
      </ol>
      {steps.length < MIXED_MAX_STEPS ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={nextKind}
            onChange={(e) => setNextKind(e.target.value as StepDraft["kind"])}
            aria-label="Dạng của chặng mới"
            className="w-auto"
          >
            {STEP_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL_VI[k]}
              </option>
            ))}
          </Select>
          <AddButton
            label="Thêm chặng"
            onClick={() => onChange([...steps, { kind: nextKind, content: emptyContentFor(nextKind) }])}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- pieces ---

function ItemHeader({
  n,
  onRemove,
  children,
}: {
  n: number;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-ink-soft">Câu {n}</span>
      {children}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto text-berry"
        onClick={onRemove}
        aria-label={`Xoá câu ${n}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

function YesNo({
  name,
  value,
  onChange,
  yes,
  no,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <div className="flex gap-4 text-sm">
      {[true, false].map((v) => (
        <label key={String(v)} className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={value === v}
            onChange={() => onChange(v)}
            className="size-4 accent-ink"
          />
          {v ? yes : no}
        </label>
      ))}
    </div>
  );
}

function AddButton({ onClick, label = "Thêm câu" }: { onClick: () => void; label?: string }) {
  return (
    <div>
      <Button type="button" variant="outline" onClick={onClick}>
        <Plus aria-hidden="true" />
        {label}
      </Button>
    </div>
  );
}

function ItemEmoji({ value, onChange }: { value: string | null; onChange: (code: string | null) => void }) {
  const [text, setText] = useState(value && EMOJI_CODE_PATTERN.test(value) ? codeToEmoji(value) : "");
  const src = emojiSrc(toCode(text));
  return (
    <span className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(toCode(e.target.value));
        }}
        aria-label="Emoji của câu"
        placeholder="🐶"
        className="h-10 w-16 px-2 text-center text-xl"
        autoComplete="off"
      />
      <span className="flex size-10 items-center justify-center rounded-md border border-line bg-surface">
        {src ? <Image src={src} alt="" width={30} height={30} unoptimized /> : null}
      </span>
    </span>
  );
}
