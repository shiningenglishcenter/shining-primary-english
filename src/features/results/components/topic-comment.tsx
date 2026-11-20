"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormStatus, SubmitButton } from "@/components/forms/form-parts";
import { saveTopicComment } from "@/features/results/actions";
import type { FormState } from "@/features/people/schemas";

const initial: FormState = {};

/** The parent message: the student's figures for the topic, then the teacher's comment (D54). */
export function parentMessage(summary: string, comment: string): string {
  const c = comment.trim();
  return c ? `${summary}\nNhận xét của thầy cô: ${c}` : summary;
}

/** Teacher comment on a topic + "copy for parents" (Zalo), on the student's results page. */
export function TopicComment({
  studentId,
  topicId,
  initialBody,
  summary,
}: {
  studentId: string;
  topicId: string;
  initialBody: string;
  /** Figures for parents, written by the server (name, topic, done, average, to review). */
  summary: string;
}) {
  const [state, action, pending] = useActionState(saveTopicComment, initial);
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = parentMessage(summary, body);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Sao chép tin nhắn:", text);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };
  return (
    <form
      action={action}
      className="flex flex-col gap-2 border-t border-line bg-paper p-4"
      data-testid="topic-comment"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="topicId" value={topicId} />
      <label htmlFor={`comment-${topicId}`} className="text-sm font-semibold">
        Nhận xét gửi phụ huynh
      </label>
      <textarea
        id={`comment-${topicId}`}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Ví dụ: Con nhớ từ vựng tốt; cần luyện thêm câu “I have got…”. Ở nhà con nghe lại bài hát 2 lần nhé."
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pending={pending} size="sm" variant="outline">
          Lưu nhận xét
        </SubmitButton>
        <Button type="button" size="sm" onClick={copy} data-testid="copy-parent-message">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Đã sao chép" : "Sao chép tin nhắn gửi phụ huynh"}
        </Button>
      </div>
      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer">Xem trước tin nhắn</summary>
        <pre className="mt-1 font-sans whitespace-pre-wrap" data-testid="parent-message">
          {parentMessage(summary, body)}
        </pre>
      </details>
      <FormStatus state={state} />
    </form>
  );
}
