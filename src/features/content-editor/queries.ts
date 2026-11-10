import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PracticeKind, PracticeLevel } from "@/features/practice/model";

/** Staff reads (admins and teachers see drafts too; RLS enforces it). */

export type Status = "draft" | "published" | "archived";

export async function getLevelId(level: PracticeLevel): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("id")
    .eq("code", level.code)
    .is("deleted_at", null)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function listTopicsForStaff(level: PracticeLevel) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(
      "id, code, title_en, title_vi, emoji, status, sort_order, level:levels!inner(code), practice_activities(id, deleted_at), vocabulary(id, deleted_at)",
    )
    .eq("level.code", level.code)
    .is("deleted_at", null)
    .order("sort_order")
    .order("title_en");
  if (error) throw new Error(`listTopicsForStaff: ${error.code}`);
  return (data ?? []).map((t) => ({
    id: t.id as string,
    code: t.code as string,
    titleEn: t.title_en as string,
    titleVi: t.title_vi as string,
    emoji: (t.emoji as string | null) ?? null,
    status: t.status as Status,
    sortOrder: t.sort_order as number,
    activityCount: ((t.practice_activities ?? []) as { deleted_at: string | null }[]).filter(
      (a) => !a.deleted_at,
    ).length,
    wordCount: ((t.vocabulary ?? []) as { deleted_at: string | null }[]).filter((v) => !v.deleted_at).length,
  }));
}

export async function getTopicForStaff(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(
      "id, code, title_en, title_vi, emoji, status, sort_order, level:levels!inner(code, name), vocabulary(id, word, meaning_vi, emoji, status, deleted_at), practice_activities(id, kind, title_en, title_vi, status, sort_order, deleted_at)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const level = data.level as unknown as { code: string; name: string };
  return {
    id: data.id as string,
    code: data.code as string,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    emoji: (data.emoji as string | null) ?? null,
    status: data.status as Status,
    sortOrder: data.sort_order as number,
    levelCode: level.code,
    levelName: level.name,
    words: (
      (data.vocabulary ?? []) as {
        id: string;
        word: string;
        meaning_vi: string;
        emoji: string | null;
        status: Status;
        deleted_at: string | null;
      }[]
    )
      .filter((v) => !v.deleted_at)
      .sort((a, b) => a.word.localeCompare(b.word))
      .map((v) => ({ id: v.id, word: v.word, meaningVi: v.meaning_vi, emoji: v.emoji, status: v.status })),
    activities: (
      (data.practice_activities ?? []) as {
        id: string;
        kind: PracticeKind;
        title_en: string;
        title_vi: string;
        status: Status;
        sort_order: number;
        deleted_at: string | null;
      }[]
    )
      .filter((a) => !a.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        id: a.id,
        kind: a.kind,
        titleEn: a.title_en,
        titleVi: a.title_vi,
        status: a.status,
        sortOrder: a.sort_order,
      })),
  };
}

export async function getActivityForStaff(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_activities")
    .select("id, kind, title_en, title_vi, status, sort_order, content, topic_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const topic = await getTopicForStaff(data.topic_id as string);
  if (!topic) return null;
  return {
    id: data.id as string,
    kind: data.kind as PracticeKind,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    status: data.status as Status,
    sortOrder: data.sort_order as number,
    content: (data.content ?? {}) as Record<string, unknown>,
    topic,
  };
}
