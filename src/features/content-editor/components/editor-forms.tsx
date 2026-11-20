"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { Field, FormStatus, SubmitButton, useKeepValues } from "@/components/forms/form-parts";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createActivity,
  createTopic,
  deleteActivity,
  deleteWord,
  quickCreateWordActivities,
  saveWord,
  updateActivity,
  updateTopic,
} from "@/features/content-editor/actions";
import { codeToEmoji, emojiSrc } from "@/features/practice/emoji";
import {
  KIND_LABEL_VI,
  PRACTICE_KINDS,
  QUICK_MIN_WORDS,
  QUICK_WORD_KINDS,
  WRITE_HINTS,
  WRITE_HINT_VI,
  type PlaySettings,
  type PracticeKind,
} from "@/features/practice/model";
import {
  ContentFields,
  serializeContent,
  toCode,
  type Content,
} from "@/features/content-editor/components/content-fields";
import type { FormState } from "@/features/people/schemas";
import {
  EmojiPickerButton,
  ImageRule,
  WordImageField,
} from "@/features/content-editor/components/emoji-picker";
import { cn } from "@/lib/utils";

const initial: FormState = {};
type Base = "/admin/content" | "/teacher/content";

/** Paste or type an emoji; shows the 3D picture the children will see. */
export function EmojiInput({
  id,
  name = "emoji",
  defaultCode,
  error,
  label = "Hình (dán emoji)",
}: {
  id: string;
  name?: string;
  defaultCode?: string | null;
  error?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultCode ? codeToEmoji(defaultCode) : "");
  const src = emojiSrc(toCode(value));
  return (
    <Field
      id={id}
      label={label}
      hint="Bấm “Chọn hình” để tìm bằng tiếng Anh hoặc tiếng Việt, hoặc gõ/dán một emoji."
      error={error}
    >
      <div className="flex items-center gap-3">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 text-2xl"
          autoComplete="off"
          aria-invalid={Boolean(error)}
        />
        <span className="flex size-14 items-center justify-center rounded-lg border border-line bg-paper">
          {src ? <Image src={src} alt="" width={44} height={44} unoptimized /> : null}
        </span>
        <EmojiPickerButton onPick={(code) => setValue(codeToEmoji(code))} suggestFor={suggestFrom} />
      </div>
    </Field>
  );
}

export function NewTopicForm({ levelCode, base }: { levelCode: string; base: Base }) {
  const [state, action, pending] = useActionState(createTopic, initial);
  const keep = useKeepValues(action);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={keep} className="flex flex-col gap-4" noValidate data-testid="new-topic-form">
      <input type="hidden" name="levelCode" value={levelCode} />
      <input type="hidden" name="base" value={base} />
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="new-titleEn" label="Tên chủ đề (tiếng Anh)" error={e.titleEn}>
          <Input id="new-titleEn" name="titleEn" maxLength={80} placeholder="Weather" />
        </Field>
        <Field id="new-titleVi" label="Tên chủ đề (tiếng Việt)" error={e.titleVi}>
          <Input id="new-titleVi" name="titleVi" maxLength={80} placeholder="Thời tiết" />
        </Field>
      </div>
      <EmojiInput id="new-emoji" error={e.emoji} />
      <div>
        <SubmitButton pending={pending}>
          <Plus aria-hidden="true" />
          Tạo chủ đề (bản nháp)
        </SubmitButton>
      </div>
    </form>
  );
}

function StatusSelect({ id, defaultValue }: { id: string; defaultValue: string }) {
  return (
    <Field id={id} label="Trạng thái" hint="Học sinh chỉ thấy bài đã xuất bản.">
      <Select id={id} name="status" defaultValue={defaultValue === "published" ? "published" : "draft"}>
        <option value="draft">Bản nháp (học sinh chưa thấy)</option>
        <option value="published">Xuất bản (học sinh thấy)</option>
      </Select>
    </Field>
  );
}

export function TopicForm({
  topic,
}: {
  topic: {
    id: string;
    titleEn: string;
    titleVi: string;
    emoji: string | null;
    status: string;
    sortOrder: number;
    patterns: { en: string; vi: string }[];
  };
}) {
  const [state, action, pending] = useActionState(updateTopic, initial);
  const keep = useKeepValues(action);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={keep} className="flex flex-col gap-4" noValidate data-testid="topic-form">
      <input type="hidden" name="id" value={topic.id} />
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="titleEn" label="Tên tiếng Anh" error={e.titleEn}>
          <Input id="titleEn" name="titleEn" defaultValue={topic.titleEn} maxLength={80} />
        </Field>
        <Field id="titleVi" label="Tên tiếng Việt" error={e.titleVi}>
          <Input id="titleVi" name="titleVi" defaultValue={topic.titleVi} maxLength={80} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <EmojiInput id="topic-emoji" defaultCode={topic.emoji} error={e.emoji} />
        <Field id="sortOrder" label="Thứ tự" hint="Số nhỏ hiện trước.">
          <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={topic.sortOrder} />
        </Field>
        <StatusSelect id="topic-status" defaultValue={topic.status} />
      </div>
      <Field
        id="topic-patterns"
        label="Mẫu câu của chủ đề"
        hint="Mỗi dòng một câu: Tiếng Anh | Nghĩa tiếng Việt. Học sinh thấy ở đầu trang chủ đề, có giọng đọc. Tối đa 10."
        error={e.patterns}
      >
        <textarea
          id="topic-patterns"
          name="patterns"
          rows={4}
          defaultValue={topic.patterns.map((p) => (p.vi ? `${p.en} | ${p.vi}` : p.en)).join("\n")}
          placeholder={"I have got a cat. | Tớ có một con mèo.\nWhat colour is it? | Nó màu gì?"}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          data-testid="patterns-input"
        />
      </Field>
      <div>
        <SubmitButton pending={pending}>Lưu chủ đề</SubmitButton>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ words ---

function WordRow({ topicId, word }: { topicId: string; word: WordItem }) {
  const [state, action, pending] = useActionState(saveWord, initial);
  const keep = useKeepValues(action);
  const [delState, delAction, delPending] = useActionState(deleteWord, initial);
  const e = state.fieldErrors ?? {};
  return (
    <li className="flex flex-col gap-2 py-3" data-testid="word-row">
      <form
        onSubmit={keep}
        className="grid grid-cols-[auto_1fr] items-start gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"
      >
        <input type="hidden" name="topicId" value={topicId} />
        <input type="hidden" name="id" value={word.id} />
        <EmojiInputCompact defaultCode={word.emoji} />
        <Input
          name="word"
          defaultValue={word.word}
          aria-label="Từ"
          maxLength={80}
          aria-invalid={Boolean(e.word)}
        />
        <Input
          name="meaningVi"
          defaultValue={word.meaningVi}
          aria-label="Nghĩa"
          maxLength={300}
          className="col-span-2 sm:col-span-1"
        />
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <SubmitButton pending={pending} variant="outline" className="h-12">
            Lưu
          </SubmitButton>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <WordImageField defaultPath={word.imagePath} defaultUrl={word.imageUrl} />
        </div>
      </form>
      <div className="flex items-center gap-3">
        {e.word || e.emoji || e.imagePath || state.error ? (
          <p className="text-sm text-berry">{e.word ?? e.emoji ?? e.imagePath ?? state.error}</p>
        ) : state.ok ? (
          <p className="text-sm text-leaf">{state.message}</p>
        ) : null}
        <form action={delAction} className="ml-auto">
          <input type="hidden" name="id" value={word.id} />
          <SubmitButton
            pending={delPending}
            pendingText="…"
            variant="ghost"
            size="sm"
            className="text-berry"
            aria-label={`Xoá từ ${word.word}`}
            onClick={(ev) => {
              if (!confirm(`Xoá từ “${word.word}”?`)) ev.preventDefault();
            }}
          >
            <Trash2 aria-hidden="true" />
            Xoá
          </SubmitButton>
        </form>
        {delState.error ? <p className="text-sm text-berry">{delState.error}</p> : null}
      </div>
    </li>
  );
}

/** The English word typed in the same form: what the picker suggests pictures for. */
function suggestFrom(this: void): string {
  const form = document.activeElement?.closest("form");
  for (const name of ["word", "titleEn"]) {
    const el = form?.elements.namedItem(name);
    if (el instanceof HTMLInputElement && el.value.trim()) return el.value;
  }
  return "";
}

function EmojiInputCompact({ defaultCode }: { defaultCode?: string | null }) {
  const [value, setValue] = useState(defaultCode ? codeToEmoji(defaultCode) : "");
  const src = emojiSrc(toCode(value));
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="flex size-12 items-center justify-center rounded-lg border border-line bg-paper">
        {src ? <Image src={src} alt="" width={36} height={36} unoptimized /> : null}
      </span>
      <Input
        name="emoji"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Emoji"
        className="w-16 px-2 text-center text-xl"
        autoComplete="off"
      />
      <EmojiPickerButton size="sm" onPick={(code) => setValue(codeToEmoji(code))} suggestFor={suggestFrom} />
    </span>
  );
}

type WordItem = {
  id: string;
  word: string;
  meaningVi: string;
  emoji: string | null;
  imagePath: string | null;
  imageUrl: string | null;
};

export function WordsEditor({ topicId, words }: { topicId: string; words: WordItem[] }) {
  const [state, action, pending] = useActionState(saveWord, initial);
  const [round, setRound] = useState(0);
  const e = state.fieldErrors ?? {};
  return (
    <div className="flex flex-col gap-4" data-testid="words-editor">
      {words.length === 0 ? (
        <p className="text-sm text-ink-soft">Chưa có từ nào. Thêm từ bên dưới.</p>
      ) : (
        <ul className="divide-y divide-line">
          {words.map((w) => (
            <WordRow key={w.id} topicId={topicId} word={w} />
          ))}
        </ul>
      )}
      <form
        key={round}
        action={async (fd) => {
          action(fd);
          setRound((r) => r + 1);
        }}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-line p-4"
        data-testid="add-word-form"
      >
        <p className="text-sm font-semibold">Thêm từ mới</p>
        <input type="hidden" name="topicId" value={topicId} />
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
          <EmojiInputCompact />
          <Input name="word" placeholder="Từ tiếng Anh (vd. cat)" aria-label="Từ mới" maxLength={80} />
          <Input
            name="meaningVi"
            placeholder="Nghĩa (vd. con mèo)"
            aria-label="Nghĩa của từ mới"
            maxLength={300}
          />
        </div>
        <WordImageField />
        <ImageRule />
        {e.word || e.meaningVi || e.emoji || e.imagePath || state.error ? (
          <p className="text-sm text-berry" data-testid="add-word-error">
            {e.word ?? e.meaningVi ?? e.emoji ?? e.imagePath ?? state.error}
          </p>
        ) : state.ok ? (
          <p className="text-sm text-leaf" data-testid="add-word-ok">
            {state.message}
          </p>
        ) : null}
        <div>
          <SubmitButton pending={pending}>
            <Plus aria-hidden="true" />
            Thêm từ
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------- activities ---

/**
 * A2 (D40): after the word list, a clear next step — make practice from the
 * words in one click (draft word games), or add activities one by one.
 */
export function NextStepCard({
  topicId,
  wordsWithPicture,
  existingKinds,
}: {
  topicId: string;
  wordsWithPicture: number;
  existingKinds: PracticeKind[];
}) {
  const [state, action, pending] = useActionState(quickCreateWordActivities, initial);
  const enough = wordsWithPicture >= QUICK_MIN_WORDS;
  const missing = QUICK_WORD_KINDS.filter((k) => !existingKinds.includes(k));
  return (
    <section
      className="rounded-xl border-2 border-sky/40 bg-sky-soft p-5"
      aria-labelledby="next-step-title"
      data-testid="next-step"
    >
      <h2 id="next-step-title" className="flex items-center gap-2 text-lg font-bold">
        <ArrowRight className="size-5 text-sky" aria-hidden="true" />
        Bước tiếp theo: tạo bài luyện
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {enough
          ? `Chủ đề có ${wordsWithPicture} từ có hình. Tạo nhanh các trò chơi từ vựng từ danh sách này (dạng nháp), xem lại rồi xuất bản.`
          : `Thêm ít nhất ${QUICK_MIN_WORDS} từ có hình để tạo bài từ vựng (hiện có ${wordsWithPicture}).`}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Các dạng bài sẽ tạo">
        {QUICK_WORD_KINDS.map((k) => {
          const has = existingKinds.includes(k);
          return (
            <li
              key={k}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-sm",
                has ? "border-leaf/40 bg-leaf-soft text-leaf" : "border-line bg-surface",
              )}
            >
              {has ? <Check className="size-4" aria-hidden="true" /> : null}
              {KIND_LABEL_VI[k]}
              {has ? <span className="sr-only"> (đã có)</span> : null}
            </li>
          );
        })}
      </ul>
      <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="topicId" value={topicId} />
        <SubmitButton
          pending={pending}
          disabled={pending || !enough || missing.length === 0}
          className="h-11"
          data-testid="quick-create"
        >
          <Sparkles aria-hidden="true" />
          {missing.length === 0 ? "Đã có đủ bài từ vựng" : `Tạo nhanh ${missing.length} bài từ danh sách từ`}
        </SubmitButton>
        <a href="#topic-activities" className="text-sm font-semibold text-sky underline underline-offset-4">
          hoặc thêm từng bài
        </a>
      </form>
      <FormStatus state={state} />
    </section>
  );
}

export function NewActivityForm({ topicId, base }: { topicId: string; base: Base }) {
  const [state, action, pending] = useActionState(createActivity, initial);
  return (
    <form
      action={action}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      data-testid="new-activity-form"
    >
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="base" value={base} />
      <div className="flex-1">
        <Field id="new-kind" label="Dạng bài mới" error={state.fieldErrors?.kind ?? state.error}>
          <Select id="new-kind" name="kind" defaultValue="">
            <option value="" disabled>
              — Chọn dạng bài —
            </option>
            {PRACTICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL_VI[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton pending={pending} className="h-12">
        <Plus aria-hidden="true" />
        Thêm bài
      </SubmitButton>
    </form>
  );
}

export function ActivityEditor({
  base,
  activity,
  topicWords,
}: {
  base: Base;
  activity: {
    id: string;
    kind: PracticeKind;
    titleEn: string;
    titleVi: string;
    status: string;
    sortOrder: number;
    content: Record<string, unknown>;
    settings: PlaySettings;
    topicId: string;
  };
  topicWords: { word: string; emoji: string | null }[];
}) {
  const [state, action, pending] = useActionState(updateActivity, initial);
  const keep = useKeepValues(action);
  const [delState, delAction, delPending] = useActionState(deleteActivity, initial);
  const [draft, setDraft] = useState<Content>(activity.content);
  const content = serializeContent(activity.kind, draft);

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={keep} className="flex flex-col gap-5" noValidate data-testid="activity-form">
        <input type="hidden" name="id" value={activity.id} />
        <input type="hidden" name="content" value={JSON.stringify(content)} />
        <FormStatus state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="act-titleVi" label="Tên bài (tiếng Việt)" error={state.fieldErrors?.titleVi}>
            <Input id="act-titleVi" name="titleVi" defaultValue={activity.titleVi} maxLength={120} />
          </Field>
          <Field id="act-titleEn" label="Tên bài (tiếng Anh)" error={state.fieldErrors?.titleEn}>
            <Input id="act-titleEn" name="titleEn" defaultValue={activity.titleEn} maxLength={80} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusSelect id="act-status" defaultValue={activity.status} />
          <Field id="act-sort" label="Thứ tự trong chủ đề">
            <Input id="act-sort" name="sortOrder" type="number" min={0} defaultValue={activity.sortOrder} />
          </Field>
        </div>

        {activity.kind !== "flashcards" ? (
          <fieldset
            className="flex flex-col gap-3 rounded-lg border border-line p-4"
            data-testid="play-settings"
          >
            <legend className="px-1 text-sm font-semibold">Khi học sinh trả lời sai</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="hints"
                defaultChecked={activity.settings.hints}
                className="size-4 accent-ink"
              />
              Cho xem gợi ý 💡 (gợi ý của thầy cô ở từng câu, nếu không có thì hệ thống tự gợi ý)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="explain"
                value="on"
                defaultChecked={activity.settings.explain}
                className="size-4 accent-ink"
                data-testid="explain-toggle"
              />
              Hiện giải thích 📘 sau khi trả lời (câu nào thầy cô có viết giải thích). Tắt cho lớp chưa đọc
              được.
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              Sai
              <Select name="maxTries" defaultValue={String(activity.settings.maxTries)} className="w-20">
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              lần thì hiện đáp án và tự sang câu tiếp theo.
            </label>
            <p className="text-xs text-ink-soft">
              Điểm mỗi câu: đúng ngay lần đầu 2 điểm, đúng sau khi sai 1 điểm, hết lượt 0 điểm.
            </p>
            {activity.kind === "listen_type" || activity.kind === "mixed" ? (
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Gợi ý chữ khi nghe và viết:
                <Select
                  name="writeHint"
                  defaultValue={activity.settings.writeHint}
                  className="w-auto"
                  data-testid="write-hint"
                >
                  {WRITE_HINTS.map((h) => (
                    <option key={h} value={h}>
                      {WRITE_HINT_VI[h]}
                    </option>
                  ))}
                </Select>
              </label>
            ) : (
              <input type="hidden" name="writeHint" value={activity.settings.writeHint} />
            )}
            {activity.kind === "true_false" || activity.kind === "mixed" ? (
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Câu Đúng/Sai theo hình:
                <Select
                  name="yesNo"
                  defaultValue={activity.settings.yesNo}
                  className="w-auto"
                  data-testid="yes-no-style"
                >
                  <option value="short">Chọn Yes / No</option>
                  <option value="full">Câu hỏi + câu trả lời đầy đủ (Is this a dog? → Yes, it is.)</option>
                </Select>
              </label>
            ) : (
              <input type="hidden" name="yesNo" value={activity.settings.yesNo} />
            )}
            {["true_false", "listening", "reading", "mixed"].includes(activity.kind) ? (
              <p className="text-xs text-ink-soft" data-testid="yes-no-note">
                Câu Đúng/Sai (Yes/No) chỉ được chọn 1 lần: chỉ có 2 đáp án nên thử lại luôn đoán đúng. Chọn
                sai thì hiện đáp án đúng rồi sang câu tiếp theo.
              </p>
            ) : null}
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="maxTries" value={activity.settings.maxTries} />
            <input type="hidden" name="writeHint" value={activity.settings.writeHint} />
            <input type="hidden" name="yesNo" value={activity.settings.yesNo} />
            {activity.settings.explain ? <input type="hidden" name="explain" value="on" /> : null}
          </>
        )}

        <ContentFields kind={activity.kind} content={draft} onChange={setDraft} topicWords={topicWords} />

        <div>
          <SubmitButton pending={pending}>Lưu bài</SubmitButton>
        </div>
      </form>

      <form action={delAction} className="border-t border-line pt-4">
        <input type="hidden" name="id" value={activity.id} />
        <input type="hidden" name="topicId" value={activity.topicId} />
        <input type="hidden" name="base" value={base} />
        <SubmitButton
          pending={delPending}
          variant="ghost"
          className="text-berry"
          onClick={(ev) => {
            if (!confirm("Xoá bài này? Học sinh sẽ không thấy bài nữa.")) ev.preventDefault();
          }}
        >
          <Trash2 aria-hidden="true" />
          Xoá bài
        </SubmitButton>
        {delState.error ? <p className="mt-2 text-sm text-berry">{delState.error}</p> : null}
      </form>
    </div>
  );
}
