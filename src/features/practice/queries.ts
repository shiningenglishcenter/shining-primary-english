import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlayerContext, RoundContext } from "@/features/practice/round";
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

type ActivityRow = {
  id: string;
  status: string;
  deleted_at: string | null;
  progress_records?: { score: number | null; max_score: number | null }[] | null;
};

/** Embedded with each activity: RLS returns only the student's own rows. */
const PROGRESS_EMBED = "progress_records(score, max_score)";

/** Best stars (0–3) a student earned on an activity, from its embedded progress rows. */
function bestStarsOf(a: ActivityRow): number {
  let best = 0;
  for (const r of a.progress_records ?? []) {
    best = Math.max(best, starsFor(Number(r.score ?? 0), Number(r.max_score ?? 0)));
  }
  return best;
}

const isLive = (a: ActivityRow) => a.status === "published" && !a.deleted_at;

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
      `id, code, title_en, title_vi, emoji, sort_order, level:levels!inner(code), practice_activities(id, status, deleted_at, ${PROGRESS_EMBED})`,
    )
    .eq("level.code", level.code)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order")
    .order("title_en");
  if (error) throw new Error(`listTopics: ${error.code}`);

  return (data ?? []).map((t) => {
    const stars = ((t.practice_activities ?? []) as ActivityRow[]).filter(isLive).map(bestStarsOf);
    return {
      id: t.id as string,
      code: t.code as string,
      titleEn: t.title_en as string,
      titleVi: t.title_vi as string,
      emoji: (t.emoji as string | null) ?? null,
      activityCount: stars.length,
      stars: stars.reduce((n, x) => n + x, 0),
      maxStars: stars.length * 3,
      done: stars.filter((x) => x > 0).length,
    };
  });
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
      `id, code, title_en, title_vi, emoji, level:levels!inner(code), practice_activities(id, kind, title_en, title_vi, sort_order, status, deleted_at, ${PROGRESS_EMBED})`,
    )
    .eq("id", topicId)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const level = levelByCode((data.level as unknown as { code: string }).code);
  if (!level) return null;

  const rows = (
    (data.practice_activities ?? []) as (ActivityRow & {
      kind: PracticeKind;
      title_en: string;
      title_vi: string;
      sort_order: number;
    })[]
  )
    .filter(isLive)
    .sort((a, b) => a.sort_order - b.sort_order || a.title_en.localeCompare(b.title_en));
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
      stars: bestStarsOf(a),
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
  // The topic (with stars) and its words only need the topic id: fetch together.
  const [topic, words] = await Promise.all([
    getTopic(data.topic_id as string),
    getTopicWords(data.topic_id as string),
  ]);
  if (!topic) return null;
  const index = topic.activities.findIndex((a) => a.id === data.id);
  return {
    id: data.id as string,
    kind: data.kind as PracticeKind,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    content: data.content as unknown,
    topic,
    words,
    nextActivityId: topic.activities[index + 1]?.id ?? null,
  };
}

const AUDIO_URL_SECONDS = 2 * 60 * 60;

/**
 * Turns a round's contexts into what the player needs: uploaded audio gets
 * a short-lived signed URL (the bucket is private; RLS lets any signed-in
 * user read it).
 */
export async function resolveContexts(contexts: RoundContext[]): Promise<PlayerContext[]> {
  const paths = contexts.flatMap((c) =>
    c.type === "listening" && c.media.source === "file" ? [c.media.path] : [],
  );
  const urls = new Map<string, string>();
  if (paths.length) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("learning-media").createSignedUrls(paths, AUDIO_URL_SECONDS);
    for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  }
  return contexts.map((c): PlayerContext => {
    if (c.type === "reading") return c;
    if (c.media.source === "youtube") {
      return {
        type: "listening",
        youtube: { videoId: c.media.videoId, start: c.media.start ?? 0 },
        audioUrl: null,
      };
    }
    return { type: "listening", youtube: null, audioUrl: urls.get(c.media.path) ?? null };
  });
}
