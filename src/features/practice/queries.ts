import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getLevelCatalog } from "@/features/practice/catalog";
import type { PlayerContext, RoundContext } from "@/features/practice/round";
import {
  levelByCode,
  settingsOf,
  starsFor,
  type PracticeKind,
  type PracticeLevel,
  type VocabWord,
} from "@/features/practice/model";

/**
 * Student-side reads. RLS decides what is visible: published practice
 * content of every level, and the student's own progress.
 */

type ActivityRow = { id: string; status: string; deleted_at: string | null };

/**
 * Stars (0–3) of the student's LATEST attempt at each activity (owner decision
 * 2026-11-12, D29). Read flat, in one query on the (student, activity) index,
 * instead of embedded per activity: embedding made the unit list ~1 s slower.
 * "Practise the mistakes" rounds never set stars (C2).
 */
async function myStars(): Promise<Map<string, number>> {
  const [supabase, user] = await Promise.all([createClient(), getCurrentUser()]);
  const stars = new Map<string, number>();
  if (!user) return stars;
  const { data } = await supabase
    .from("progress_records")
    .select("practice_activity_id, score, max_score, student:students!inner(profile_id)")
    .eq("student.profile_id", user.id)
    .eq("is_retry", false)
    .not("practice_activity_id", "is", null)
    .order("recorded_at", { ascending: false });
  for (const r of data ?? []) {
    const id = r.practice_activity_id as string;
    if (!stars.has(id)) stars.set(id, starsFor(Number(r.score ?? 0), Number(r.max_score ?? 0)));
  }
  return stars;
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
  const [{ data, error }, mine] = await Promise.all([
    supabase
      .from("topics")
      .select(
        "id, code, title_en, title_vi, emoji, sort_order, level:levels!inner(code), practice_activities(id, status, deleted_at)",
      )
      .eq("level.code", level.code)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("sort_order")
      .order("title_en"),
    myStars(),
  ]);
  if (error) throw new Error(`listTopics: ${error.code}`);

  return (data ?? []).map((t) => {
    const stars = ((t.practice_activities ?? []) as ActivityRow[])
      .filter(isLive)
      .map((a) => mine.get(a.id) ?? 0);
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
  const [{ data, error }, mine] = await Promise.all([
    supabase
      .from("topics")
      .select(
        "id, code, title_en, title_vi, emoji, patterns, level:levels!inner(code), practice_activities(id, kind, title_en, title_vi, sort_order, status, deleted_at)",
      )
      .eq("id", topicId)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle(),
    myStars(),
  ]);
  if (error || !data) return null;
  const level = levelByCode((data.level as unknown as { code: string }).code, await getLevelCatalog());
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
    patterns: patternsOf(data.patterns),
    level,
    activities: rows.map((a): ActivitySummary => ({
      id: a.id,
      kind: a.kind,
      titleEn: a.title_en,
      titleVi: a.title_vi,
      stars: mine.get(a.id) ?? 0,
    })),
  };
}

export type Pattern = { en: string; vi: string };
export function patternsOf(raw: unknown): Pattern[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p) =>
    p && typeof p === "object" && typeof (p as Pattern).en === "string"
      ? [{ en: (p as Pattern).en, vi: typeof (p as Pattern).vi === "string" ? (p as Pattern).vi : "" }]
      : [],
  );
}

/** Topic codes a review activity draws its words from (D51), anywhere in its content. */
export function unitsOf(content: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "units" && Array.isArray(x)) x.forEach((u) => typeof u === "string" && out.add(u));
        else walk(x);
      }
    }
  };
  walk(content);
  return [...out];
}

/** Words of a topic, or (review activities) of other topics of the same level. */
export async function getTopicWords(
  topicId: string,
  units: string[] = [],
  levelCode?: string,
): Promise<VocabWord[]> {
  const supabase = await createClient();
  const base = supabase
    .from("vocabulary")
    .select(
      "word, meaning_vi, emoji, image_path, ipa, topic:topics!inner(code, deleted_at, level:levels!inner(code))",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .is("topic.deleted_at", null)
    .order("word");
  const { data, error } =
    units.length && levelCode
      ? await base.in("topic.code", units).eq("topic.level.code", levelCode)
      : await base.eq("topic_id", topicId);
  if (error) throw new Error(`getTopicWords: ${error.code}`);
  return withImages(
    (data ?? []).map((w) => ({
      word: w.word as string,
      meaningVi: w.meaning_vi as string,
      emoji: (w.emoji as string | null) ?? null,
      ipa: (w.ipa as string | null) ?? null,
      imagePath: (w.image_path as string | null) ?? null,
    })),
  );
}

const IMAGE_URL_SECONDS = 2 * 60 * 60;

/**
 * Uploaded word pictures (A1, D42) → short-lived signed URLs. Guests have no
 * session: their verified public activity's pictures are signed with the
 * service role (as guest audio, D35); without that key the emoji shows.
 */
export async function withImages(
  words: (VocabWord & { imagePath: string | null })[],
  opts: { guest?: boolean } = {},
): Promise<VocabWord[]> {
  const paths = words.flatMap((w) => (w.imagePath ? [w.imagePath] : []));
  const urls = new Map<string, string>();
  if (paths.length) {
    const supabase = opts.guest ? (adminConfigured() ? createAdminClient() : null) : await createClient();
    const { data } = supabase
      ? await supabase.storage.from("learning-media").createSignedUrls(paths, IMAGE_URL_SECONDS)
      : { data: [] };
    for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  }
  return words.map(({ imagePath, ...w }) => ({
    ...w,
    image: imagePath ? (urls.get(imagePath) ?? null) : null,
  }));
}

export async function getActivity(activityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_activities")
    .select(
      "id, kind, title_en, title_vi, content, settings, topic_id, topic:topics!inner(level:levels!inner(code))",
    )
    .eq("id", activityId)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  // The topic (with stars) and its words only need the topic id: fetch together.
  const levelCode = (data.topic as unknown as { level: { code: string } }).level.code;
  const [topic, words] = await Promise.all([
    getTopic(data.topic_id as string),
    getTopicWords(data.topic_id as string, unitsOf(data.content), levelCode),
  ]);
  if (!topic) return null;
  const index = topic.activities.findIndex((a) => a.id === data.id);
  return {
    id: data.id as string,
    kind: data.kind as PracticeKind,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    content: data.content as unknown,
    settings: settingsOf(data.settings),
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
export async function resolveContexts(
  contexts: RoundContext[],
  opts: { guest?: boolean } = {},
): Promise<PlayerContext[]> {
  const paths = contexts.flatMap((c) =>
    c.type === "listening" && c.media.source === "file" ? [c.media.path] : [],
  );
  const urls = new Map<string, string>();
  if (paths.length) {
    // Guests have no session: their audio of a verified public activity (D35) is
    // signed with the service role; without that key the player says it can't open.
    const supabase = opts.guest ? (adminConfigured() ? createAdminClient() : null) : await createClient();
    const { data } = supabase
      ? await supabase.storage.from("learning-media").createSignedUrls(paths, AUDIO_URL_SECONDS)
      : { data: [] };
    for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  }
  return contexts.map((c): PlayerContext => {
    if (c.type === "reading") return c;
    if (c.media.source === "youtube") {
      return {
        type: "listening",
        youtube: { videoId: c.media.videoId, start: c.media.start ?? 0 },
        audioUrl: null,
        gate: c.gate,
      };
    }
    return { type: "listening", youtube: null, audioUrl: urls.get(c.media.path) ?? null, gate: c.gate };
  });
}
