import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  levelByCode,
  starsFor,
  type PracticeKind,
  type PracticeLevel,
  type VocabWord,
} from "@/features/practice/model";

/**
 * Student-side reads. RLS decides what is visible: published practice
 * content of every level, and the student's own progress.
 */

type Progress = Map<string, number>; // activity id → best stars (0–3)

async function bestStars(activityIds: string[]): Promise<Progress> {
  const best: Progress = new Map();
  if (activityIds.length === 0) return best;
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress_records")
    .select("practice_activity_id, score, max_score")
    .in("practice_activity_id", activityIds);
  for (const r of data ?? []) {
    const id = r.practice_activity_id as string;
    const s = starsFor(Number(r.score ?? 0), Number(r.max_score ?? 0));
    if (s > (best.get(id) ?? 0)) best.set(id, s);
  }
  return best;
}

export type TopicSummary = {
  id: string;
  code: string;
  titleEn: string;
  titleVi: string;
  emoji: string | null;
  activityCount: number;
  stars: number;
  maxStars: number;
  done: number;
};

export async function listTopics(level: PracticeLevel): Promise<TopicSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(
      "id, code, title_en, title_vi, emoji, sort_order, level:levels!inner(code), practice_activities(id, status, deleted_at)",
    )
    .eq("level.code", level.code)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order")
    .order("title_en");
  if (error) throw new Error(`listTopics: ${error.code}`);

  const topics = (data ?? []).map((t) => ({
    t,
    activities: ((t.practice_activities ?? []) as { id: string; status: string; deleted_at: string | null }[])
      .filter((a) => a.status === "published" && !a.deleted_at)
      .map((a) => a.id),
  }));
  const best = await bestStars(topics.flatMap((x) => x.activities));
  return topics.map(({ t, activities }) => ({
    id: t.id as string,
    code: t.code as string,
    titleEn: t.title_en as string,
    titleVi: t.title_vi as string,
    emoji: (t.emoji as string | null) ?? null,
    activityCount: activities.length,
    stars: activities.reduce((n, id) => n + (best.get(id) ?? 0), 0),
    maxStars: activities.length * 3,
    done: activities.filter((id) => (best.get(id) ?? 0) > 0).length,
  }));
}

export type ActivitySummary = {
  id: string;
  kind: PracticeKind;
  titleEn: string;
  titleVi: string;
  stars: number;
};

export async function getTopic(topicId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(
      "id, code, title_en, title_vi, emoji, level:levels!inner(code), practice_activities(id, kind, title_en, title_vi, sort_order, status, deleted_at)",
    )
    .eq("id", topicId)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const level = levelByCode((data.level as unknown as { code: string }).code);
  if (!level) return null;

  const rows = (
    (data.practice_activities ?? []) as {
      id: string;
      kind: PracticeKind;
      title_en: string;
      title_vi: string;
      sort_order: number;
      status: string;
      deleted_at: string | null;
    }[]
  )
    .filter((a) => a.status === "published" && !a.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.title_en.localeCompare(b.title_en));
  const best = await bestStars(rows.map((a) => a.id));
  return {
    id: data.id as string,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    emoji: (data.emoji as string | null) ?? null,
    level,
    activities: rows.map((a): ActivitySummary => ({
      id: a.id,
      kind: a.kind,
      titleEn: a.title_en,
      titleVi: a.title_vi,
      stars: best.get(a.id) ?? 0,
    })),
  };
}

export async function getTopicWords(topicId: string): Promise<VocabWord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary")
    .select("word, meaning_vi, emoji")
    .eq("topic_id", topicId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("word");
  if (error) throw new Error(`getTopicWords: ${error.code}`);
  return (data ?? []).map((w) => ({
    word: w.word as string,
    meaningVi: w.meaning_vi as string,
    emoji: (w.emoji as string | null) ?? null,
  }));
}

export async function getActivity(activityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_activities")
    .select("id, kind, title_en, title_vi, content, topic_id")
    .eq("id", activityId)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const topic = await getTopic(data.topic_id as string);
  if (!topic) return null;
  const index = topic.activities.findIndex((a) => a.id === data.id);
  return {
    id: data.id as string,
    kind: data.kind as PracticeKind,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    content: data.content as unknown,
    topic,
    nextActivityId: topic.activities[index + 1]?.id ?? null,
  };
}
