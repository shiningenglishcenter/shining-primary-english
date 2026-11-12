"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { Field, FormStatus, SubmitButton, useKeepValues } from "@/components/forms/form-parts";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createActivity,
  createTopic,
  deleteActivity,
  deleteWord,
  saveWord,
  updateActivity,
  updateTopic,
} from "@/features/content-editor/actions";
import { codeToEmoji, emojiSrc } from "@/features/practice/emoji";
import {
  KIND_LABEL_VI,
  PRACTICE_KINDS,
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
      hint="Gõ hoặc dán một emoji (bàn phím điện thoại, hoặc Win + . trên Windows)."
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
      <div>
        <SubmitButton pending={pending}>Lưu chủ đề</SubmitButton>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ words ---

function WordRow({
  topicId,
  word,
}: {
  topicId: string;
  word: { id: string; word: string; meaningVi: string; emoji: string | null };
}) {
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
      </form>
      <div className="flex items-center gap-3">
        {e.word || e.emoji || state.error ? (
          <p className="text-sm text-berry">{e.word ?? e.emoji ?? state.error}</p>
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

function EmojiInputCompact({ defaultCode }: { defaultCode?: string | null }) {
  const [value, setValue] = useState(defaultCode ? codeToEmoji(defaultCode) : "");
  const src = emojiSrc(toCode(value));
  return (
    <span className="flex items-center gap-2">
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
    </span>
  );
}

export function WordsEditor({
  topicId,
  words,
}: {
  topicId: string;
  words: { id: string; word: string; meaningVi: string; emoji: string | null }[];
}) {
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
        {e.word || e.meaningVi || e.emoji || state.error ? (
          <p className="text-sm text-berry" data-testid="add-word-error">
            {e.word ?? e.meaningVi ?? e.emoji ?? state.error}
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
          </fieldset>
        ) : (
          <input type="hidden" name="maxTries" value={activity.settings.maxTries} />
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
