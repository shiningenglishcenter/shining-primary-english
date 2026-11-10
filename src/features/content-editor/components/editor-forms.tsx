"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { Field, FormStatus, SubmitButton, useKeepValues } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
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
import { codeToEmoji, EMOJI_CODE_PATTERN, emojiSrc, emojiToCode } from "@/features/practice/emoji";
import { KIND_LABEL_VI, PRACTICE_KINDS, WORD_KINDS, type PracticeKind } from "@/features/practice/model";
import type { FormState } from "@/features/people/schemas";

const initial: FormState = {};
type Base = "/admin/content" | "/teacher/content";

function toCode(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const c = EMOJI_CODE_PATTERN.test(v.toLowerCase()) ? v.toLowerCase() : emojiToCode(v);
  return EMOJI_CODE_PATTERN.test(c) ? c : null;
}

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

type Item = { emoji?: string | null; sentence: string; answer?: boolean | string; options?: string[] };

const ITEM_HELP: Partial<Record<PracticeKind, string>> = {
  true_false: "Mỗi câu: một hình, một câu tiếng Anh, và câu đó đúng hay sai với hình.",
  fill_blank: "Viết ___ (3 dấu gạch dưới) ở chỗ trống. Nhập đáp án đúng và 2 đáp án sai.",
  rearrange: "Viết câu đúng, hệ thống tự xáo trộn các từ cho học sinh sắp xếp (2–10 từ).",
};

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
    topicId: string;
  };
  topicWords: { word: string; emoji: string | null }[];
}) {
  const [state, action, pending] = useActionState(updateActivity, initial);
  const keep = useKeepValues(action);
  const [delState, delAction, delPending] = useActionState(deleteActivity, initial);
  const isWordKind = WORD_KINDS.includes(activity.kind);
  const [words, setWords] = useState<string[]>(
    Array.isArray(activity.content.words) ? (activity.content.words as string[]) : [],
  );
  const [items, setItems] = useState<Item[]>(
    Array.isArray(activity.content.items) ? (activity.content.items as Item[]) : [],
  );

  const content = isWordKind
    ? words.length
      ? { words }
      : {}
    : { items: items.map((i) => normalise(activity.kind, i)) };
  const update = (i: number, patch: Partial<Item>) =>
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));

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

        {isWordKind ? (
          <fieldset
            className="flex flex-col gap-3 rounded-lg border border-line p-4"
            data-testid="word-picker"
          >
            <legend className="px-1 text-sm font-semibold">Từ dùng trong bài</legend>
            <p className="text-sm text-ink-soft">
              Không chọn từ nào = dùng tất cả từ có hình của chủ đề. Mỗi lần chơi, hệ thống lấy ngẫu nhiên tối
              đa 8 từ.
            </p>
            <div className="flex flex-wrap gap-2">
              {topicWords.map((w) => {
                const on = words.includes(w.word);
                return (
                  <label
                    key={w.word}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-ink bg-sun-soft" : "border-line bg-surface"}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setWords(e.target.checked ? [...words, w.word] : words.filter((x) => x !== w.word))
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
        ) : (
          <fieldset
            className="flex flex-col gap-3 rounded-lg border border-line p-4"
            data-testid="item-editor"
          >
            <legend className="px-1 text-sm font-semibold">Câu hỏi ({items.length})</legend>
            <p className="text-sm text-ink-soft">{ITEM_HELP[activity.kind]}</p>
            <ol className="flex flex-col gap-3">
              {items.map((it, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-lg bg-paper p-3" data-testid="item-row">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-soft">Câu {i + 1}</span>
                    <ItemEmoji value={it.emoji ?? null} onChange={(emoji) => update(i, { emoji })} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-berry"
                      onClick={() => setItems(items.filter((_, k) => k !== i))}
                      aria-label={`Xoá câu ${i + 1}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <Input
                    value={it.sentence}
                    onChange={(e) => update(i, { sentence: e.target.value })}
                    placeholder={activity.kind === "fill_blank" ? "A ___ can swim." : "This is a dog."}
                    aria-label={`Câu ${i + 1}`}
                    maxLength={200}
                  />
                  {activity.kind === "true_false" ? (
                    <div className="flex gap-4 text-sm">
                      {[true, false].map((v) => (
                        <label key={String(v)} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`answer-${i}`}
                            checked={it.answer === v}
                            onChange={() => update(i, { answer: v })}
                            className="size-4 accent-ink"
                          />
                          {v ? "Đúng với hình (Yes)" : "Sai với hình (No)"}
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {activity.kind === "fill_blank" ? (
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
                            update(i, {
                              options: [typeof it.answer === "string" ? it.answer : "", ...wrong],
                            });
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
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setItems([
                    ...items,
                    activity.kind === "true_false"
                      ? { emoji: null, sentence: "", answer: true }
                      : activity.kind === "fill_blank"
                        ? { emoji: null, sentence: "", answer: "", options: ["", "", ""] }
                        : { emoji: null, sentence: "" },
                  ])
                }
              >
                <Plus aria-hidden="true" />
                Thêm câu
              </Button>
            </div>
          </fieldset>
        )}

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

function wrongOptions(it: Item): string[] {
  const answer = typeof it.answer === "string" ? it.answer : "";
  const opts = it.options ?? [];
  const rest = opts.filter((o, i) => !(i === 0 && o === answer));
  return [rest[0] ?? "", rest[1] ?? ""];
}

function normalise(kind: PracticeKind, it: Item) {
  const emoji = it.emoji ? (toCode(it.emoji) ?? it.emoji) : null;
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
