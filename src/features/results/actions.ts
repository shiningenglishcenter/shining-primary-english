"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/features/people/schemas";

const commentSchema = z.object({
  studentId: z.uuid(),
  topicId: z.uuid(),
  body: z.string().trim().max(1000, "Nhận xét tối đa 1000 ký tự."),
});

/**
 * Round 3 (D54): a teacher's comment on one student's work in a topic/unit,
 * for parents. Empty text deletes it. RLS: teachers of the student, admins.
 */
export async function saveTopicComment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("teacher", "admin");
  const parsed = commentSchema.safeParse({
    studentId: formData.get("studentId"),
    topicId: formData.get("topicId"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Không lưu được." };
  const { studentId, topicId, body } = parsed.data;
  const supabase = await createClient();
  const { error } = body
    ? await supabase
        .from("topic_comments")
        .upsert({ student_id: studentId, topic_id: topicId, body }, { onConflict: "student_id,topic_id" })
    : await supabase.from("topic_comments").delete().eq("student_id", studentId).eq("topic_id", topicId);
  if (error) return { error: "Không lưu được. Vui lòng thử lại." };
  refresh();
  return { ok: true, message: body ? "Đã lưu nhận xét." : "Đã xoá nhận xét." };
}
