"use client";

import { ConfirmSubmit } from "@/components/ui/confirm-dialog";
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
  KIND_GROUPS,
  KIND_LABEL_VI,
  QUICK_MIN_WORDS,
  QUICK_WORD_KINDS,
  WORD_KINDS,
  WRITE_HINTS,
  WRITE_HINT_VI,
  type PlaySettings,
  type PracticeKind,
  type VocabWord,
} from "@/features/practice/model";
import { ActivityPreview } from "@/features/content-editor/components/activity-preview";
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
      <input type="hidden" name="status" value={topic.status} />
      <div className="grid gap-4 sm:grid-cols-2">
        <EmojiInput id="topic-emoji" defaultCode={topic.emoji} error={e.emoji} />
        <Field id="sortOrder" label="Thứ tự" hint="Số nhỏ hiện trước.">
          <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={topic.sortOrder} />
        </Field>
      </div>
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
        <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-4">
          <WordImageField defaultPath={word.imagePath} defaultUrl={word.imageUrl} />
          <label className="flex items-center gap-1 text-sm text-ink-soft">
            Phiên âm
            <Input
              name="ipa"
              defaultValue={word.ipa ?? ""}
              aria-label={`Phiên âm của ${word.word}`}
              placeholder="kæt"
              maxLength={80}
              className="h-9 w-40"
            />
          </label>
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
          <ConfirmSubmit
            pending={delPending}
            pendingText="…"
            variant="ghost"
            size="sm"
            className="text-berry"
            aria-label={`Xoá từ ${word.word}`}
            confirm={{
              title: `Xoá từ “${word.word}”?`,
              body: "Từ sẽ không còn trong các bài luyện của chủ đề này.",
            }}
          >
            <Trash2 aria-hidden="true" />
            Xoá
          </ConfirmSubmit>
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
  ipa: string | null;
};

export function WordsEditor({ topicId, words }: { topicId: string; words: WordItem[] }) {
  const [state, action, pending] = useActionState(saveWord, initial);
  const [round, setRound] = useState(0);
  const [q, setQ] = useState("");
  const e = state.fieldErrors ?? {};
  const f = q.trim().toLowerCase();
  const shown = f
    ? words.filter((w) => w.word.toLowerCase().includes(f) || w.meaningVi.toLowerCase().includes(f))
    : words;
  return (
    <div className="flex flex-col gap-4" data-testid="words-editor">
      {words.length > 6 ? (
        <Input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder="Tìm từ hoặc nghĩa…"
          aria-label="Tìm từ"
          className="max-w-sm"
          data-testid="word-search"
        />
      ) : null}
      {words.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Chưa có từ nào. Thêm từ bên dưới hoặc “Nhập nhiều từ một lúc”.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((w) => (
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
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Phiên âm
            <Input
              name="ipa"
              placeholder="kæt"
              aria-label="Phiên âm của từ mới"
              maxLength={80}
              className="h-9 w-40"
              data-testid="new-word-ipa"
            />
          </label>
          <span className="text-xs text-ink-soft">Để trống: hệ thống tự điền nếu biết từ này.</span>
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
        <a href="#new-kind" className="text-sm font-semibold text-sky underline underline-offset-4">
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
            {KIND_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.kinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL_VI[k]}
                  </option>
                ))}
              </optgroup>
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

type EditorTab = "questions" | "settings" | "share";

/** The play settings currently in the form (live preview). */
function readSettings(form: HTMLFormElement, prev: PlaySettings): PlaySettings {
  const fd = new FormData(form);
  const v = (k: string) => fd.get(k);
  return {
    ...prev,
    hints: form.elements.namedItem("hints") ? v("hints") === "on" : prev.hints,
    explain: v("explain") === "on",
    ipa: v("ipa") === "on",
    maxTries: Number(v("maxTries") ?? prev.maxTries) || prev.maxTries,
    writeHint: (v("writeHint") as PlaySettings["writeHint"]) ?? prev.writeHint,
    yesNo: (v("yesNo") as PlaySettings["yesNo"]) ?? prev.yesNo,
  };
}

/**
 * D56: one form with tabs Câu hỏi / Cài đặt (+ Chia sẻ outside the form),
 * a save bar that stays at the bottom, and a live preview of the draft.
 */
export function ActivityEditor({
  base,
  activity,
  topicWords,
  previewWords,
  share,
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
  previewWords: VocabWord[];
  share: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(updateActivity, initial);
  const keep = useKeepValues(action);
  const [delState, delAction, delPending] = useActionState(deleteActivity, initial);
  const [draft, setDraft] = useState<Content>(activity.content);
  const [tab, setTab] = useState<EditorTab>("questions");
  const [settings, setSettings] = useState<PlaySettings>(activity.settings);
  const content = serializeContent(activity.kind, draft);
  const published = activity.status === "published";
  const tabs: { key: EditorTab; label: string }[] = [
    { key: "questions", label: WORD_KINDS.includes(activity.kind) ? "Nội dung" : "Câu hỏi" },
    { key: "settings", label: "Cài đặt" },
    { key: "share", label: "Chia sẻ" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div
          role="tablist"
          aria-label="Phần của bài"
          className="flex gap-1 border-b border-line"
          data-testid="activity-tabs"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`act-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`act-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={cn(
                "border-b-3 px-4 py-3 text-sm font-semibold",
                tab === t.key ? "border-sky text-ink" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={keep}
          onChange={(e) => {
            const form = e.currentTarget;
            setSettings((p) => readSettings(form, p));
          }}
          className="flex flex-col gap-5"
          noValidate
          data-testid="activity-form"
          hidden={tab === "share"}
        >
          <input type="hidden" name="id" value={activity.id} />
          <input type="hidden" name="content" value={JSON.stringify(content)} />
          <input type="hidden" name="sortOrder" value={activity.sortOrder} />
          <FormStatus state={state} />

          <div
            role="tabpanel"
            id="act-panel-questions"
            aria-labelledby="act-tab-questions"
            hidden={tab !== "questions"}
            className="flex flex-col gap-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="act-titleVi" label="Tên bài (tiếng Việt)" error={state.fieldErrors?.titleVi}>
                <Input id="act-titleVi" name="titleVi" defaultValue={activity.titleVi} maxLength={120} />
              </Field>
              <Field id="act-titleEn" label="Tên bài (tiếng Anh)" error={state.fieldErrors?.titleEn}>
                <Input id="act-titleEn" name="titleEn" defaultValue={activity.titleEn} maxLength={80} />
              </Field>
            </div>
            <ContentFields kind={activity.kind} content={draft} onChange={setDraft} topicWords={topicWords} />
          </div>

          <div
            role="tabpanel"
            id="act-panel-settings"
            aria-labelledby="act-tab-settings"
            hidden={tab !== "settings"}
            className="flex flex-col gap-5"
          >
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
                  Hiện giải thích 📘 sau khi trả lời (câu nào thầy cô có viết giải thích). Tắt cho lớp chưa
                  đọc được.
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
                      <option value="full">
                        Câu hỏi + câu trả lời đầy đủ (Is this a dog? → Yes, it is.)
                      </option>
                    </Select>
                  </label>
                ) : (
                  <input type="hidden" name="yesNo" value={activity.settings.yesNo} />
                )}
                {["true_false", "listening", "reading", "mixed"].includes(activity.kind) ? (
                  <p className="text-xs text-ink-soft" data-testid="yes-no-note">
                    Câu Đúng/Sai (Yes/No) chỉ được chọn 1 lần: chỉ có 2 đáp án nên thử lại luôn đoán đúng.
                    Chọn sai thì hiện đáp án đúng rồi sang câu tiếp theo.
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

            {activity.kind === "flashcards" ? (
              <label className="flex items-center gap-2 text-sm" data-testid="ipa-toggle">
                <input
                  type="checkbox"
                  name="ipa"
                  defaultChecked={activity.settings.ipa}
                  className="size-4 accent-ink"
                />
                Hiện phiên âm (IPA, giọng Anh) dưới từ — cho lớp lớn. Phiên âm sửa ở danh sách từ của chủ đề.
              </label>
            ) : activity.settings.ipa ? (
              <input type="hidden" name="ipa" value="on" />
            ) : null}
          </div>

          <div
            className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-line bg-surface/95 px-1 py-3 backdrop-blur"
            data-testid="save-bar"
          >
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                published ? "bg-leaf-soft text-leaf" : "bg-muted text-ink-soft",
              )}
            >
              {published ? "Đang xuất bản" : "Bản nháp"}
            </span>
            <a
              href={`${base}/topics/${activity.topicId}?tab=activities`}
              className="ml-auto inline-flex h-10 items-center rounded-md px-3 text-sm font-semibold text-ink-soft hover:bg-muted"
            >
              Huỷ
            </a>
            <SubmitButton pending={pending} variant="outline" name="status" value="draft">
              {published ? "Chuyển về nháp" : "Lưu nháp"}
            </SubmitButton>
            <SubmitButton pending={pending} name="status" value="published">
              {published ? "Lưu" : "Lưu & xuất bản"}
            </SubmitButton>
          </div>
        </form>

        <div
          role="tabpanel"
          id="act-panel-share"
          aria-labelledby="act-tab-share"
          hidden={tab !== "share"}
          className="flex flex-col gap-4"
        >
          {share}
        </div>

        <form action={delAction} className="border-t border-line pt-4">
          <input type="hidden" name="id" value={activity.id} />
          <input type="hidden" name="topicId" value={activity.topicId} />
          <input type="hidden" name="base" value={base} />
          <ConfirmSubmit
            pending={delPending}
            variant="ghost"
            className="text-berry"
            confirm={{ title: `Xoá bài “${activity.titleVi}”?`, body: "Học sinh sẽ không thấy bài này nữa." }}
          >
            <Trash2 aria-hidden="true" />
            Xoá bài
          </ConfirmSubmit>
          {delState.error ? <p className="mt-2 text-sm text-berry">{delState.error}</p> : null}
        </form>
      </div>

      <div className="lg:sticky lg:top-4">
        <ActivityPreview
          activityId={activity.id}
          kind={activity.kind}
          title={activity.titleVi}
          content={content}
          settings={settings}
          words={previewWords}
        />
      </div>
    </div>
  );
}
