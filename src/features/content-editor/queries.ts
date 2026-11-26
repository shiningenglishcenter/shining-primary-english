import "server-only";
import { voicesOf, type Voices } from "@/features/practice/voice";
import { createClient } from "@/lib/supabase/server";
import { settingsOf, type PracticeKind, type PracticeLevel } from "@/features/practice/model";

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

export type TopicRow = {
  id: string;
  code: string;
  titleEn: string;
  titleVi: string;
  emoji: string | null;
  status: Status;
  sortOrder: number;
  updatedAt: string;
  wordCount: number;
  /** Words with neither an emoji nor an uploaded picture: word games skip them. */
  wordsWithoutPicture: number;
  patternCount: number;
  activityCount: number;
  publishedActivities: number;
  /** Sentence activities with fewer than 6 questions (C8). */
  shortActivities: number;
  /** Lower-case words and meanings, for the search box. */
  words: string[];
};

const SENTENCE_LIKE = new Set(["true_false", "fill_blank", "rearrange", "translate", "reading", "listening"]);

export async function listTopicsForStaff(level: PracticeLevel): Promise<TopicRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(
      "id, code, title_en, title_vi, emoji, status, sort_order, updated_at, patterns, level:levels!inner(code), practice_activities(id, kind, status, content, deleted_at), vocabulary(word, meaning_vi, emoji, image_path, deleted_at)",
    )
    .eq("level.code", level.code)
    .is("deleted_at", null)
    .order("sort_order")
    .order("title_en");
  if (error) throw new Error(`listTopicsForStaff: ${error.code}`);
  return (data ?? []).map((t) => {
    const acts = (
      (t.practice_activities ?? []) as {
        kind: string;
        status: string;
        content: { items?: unknown[] } | null;
        deleted_at: string | null;
      }[]
    ).filter((a) => !a.deleted_at);
    const words = (
      (t.vocabulary ?? []) as {
        word: string;
        meaning_vi: string;
        emoji: string | null;
        image_path: string | null;
        deleted_at: string | null;
      }[]
    ).filter((v) => !v.deleted_at);
    return {
      id: t.id as string,
      code: t.code as string,
      titleEn: t.title_en as string,
      titleVi: t.title_vi as string,
      emoji: (t.emoji as string | null) ?? null,
      status: t.status as Status,
      sortOrder: t.sort_order as number,
      updatedAt: t.updated_at as string,
      wordCount: words.length,
      wordsWithoutPicture: words.filter((w) => !w.emoji && !w.image_path).length,
      patternCount: Array.isArray(t.patterns) ? t.patterns.length : 0,
      activityCount: acts.length,
      publishedActivities: acts.filter((a) => a.status === "published").length,
      shortActivities: acts.filter(
        (a) => SENTENCE_LIKE.has(a.kind) && Array.isArray(a.content?.items) && a.content.items.length < 6,
      ).length,
      words: words.flatMap((w) => [w.word.toLowerCase(), w.meaning_vi.toLowerCase()]),
    };
  });
}

/** Topics per level code (not deleted), for the tab counters. */
export async function topicCountsByLevel(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("level:levels!inner(code)").is("deleted_at", null);
  const out = new Map<string, number>();
  for (const r of data ?? []) {
    const code = (r.level as unknown as { code: string }).code;
    out.set(code, (out.get(code) ?? 0) + 1);
  }
  return out;
}

export async function getTopicForStaff(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(
      "id, code, title_en, title_vi, emoji, status, sort_order, patterns, level:levels!inner(code, name), vocabulary(id, word, meaning_vi, emoji, image_path, ipa, status, deleted_at), practice_activities(id, kind, title_en, title_vi, status, sort_order, content, settings, deleted_at)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const level = data.level as unknown as { code: string; name: string };
  // Uploaded word pictures (A1): signed for the editor's previews.
  const paths = (
    (data.vocabulary ?? []) as { image_path: string | null; deleted_at: string | null }[]
  ).flatMap((v) => (v.image_path && !v.deleted_at ? [v.image_path] : []));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("learning-media").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  const changed = await draftIds(((data.practice_activities ?? []) as { id: string }[]).map((a) => a.id));
  return {
    id: data.id as string,
    code: data.code as string,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    emoji: (data.emoji as string | null) ?? null,
    status: data.status as Status,
    sortOrder: data.sort_order as number,
    patterns: Array.isArray(data.patterns) ? (data.patterns as { en: string; vi: string }[]) : [],
    levelCode: level.code,
    levelName: level.name,
    words: (
      (data.vocabulary ?? []) as {
        id: string;
        word: string;
        meaning_vi: string;
        emoji: string | null;
        image_path: string | null;
        ipa: string | null;
        status: Status;
        deleted_at: string | null;
      }[]
    )
      .filter((v) => !v.deleted_at)
      .sort((a, b) => a.word.localeCompare(b.word))
      .map((v) => ({
        id: v.id,
        word: v.word,
        meaningVi: v.meaning_vi,
        emoji: v.emoji,
        imagePath: v.image_path,
        ipa: v.ipa,
        imageUrl: v.image_path ? (signed.get(v.image_path) ?? null) : null,
        status: v.status,
      })),
    activities: (
      (data.practice_activities ?? []) as {
        id: string;
        kind: PracticeKind;
        title_en: string;
        title_vi: string;
        status: Status;
        sort_order: number;
        content: Record<string, unknown> | null;
        settings: unknown;
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
        summary: activitySummary(a.kind, a.content ?? {}, settingsOf(a.settings)),
        questions: Array.isArray(a.content?.items) ? (a.content.items as unknown[]).length : null,
        /** Saved changes pupils don't see yet (D59). */
        changed: changed.has(a.id),
      })),
  };
}

/** Activities with an unpublished draft (D59); none before migration 0034. */
async function draftIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("activity_drafts").select("activity_id").in("activity_id", ids);
  return new Set((data ?? []).map((d) => d.activity_id as string));
}

export type ActivityDraft = {
  titleEn: string;
  titleVi: string;
  content: Record<string, unknown>;
  settings: ReturnType<typeof settingsOf>;
  updatedAt: string;
};

async function draftOf(id: string): Promise<ActivityDraft | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_drafts")
    .select("title_en, title_vi, content, settings, updated_at")
    .eq("activity_id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    content: (data.content ?? {}) as Record<string, unknown>,
    settings: settingsOf(data.settings),
    updatedAt: data.updated_at as string,
  };
}

/** One line about an activity for the topic page (D56): size and the settings that differ from usual. */
export function activitySummary(
  kind: PracticeKind,
  content: Record<string, unknown>,
  settings: ReturnType<typeof settingsOf>,
): string {
  const parts: string[] = [];
  const items = Array.isArray(content.items) ? content.items.length : null;
  const steps = Array.isArray(content.steps) ? content.steps.length : null;
  const words = Array.isArray(content.words) ? content.words.length : null;
  const units = Array.isArray(content.units) ? content.units.length : null;
  if (items !== null) parts.push(`${items} câu`);
  else if (steps !== null) parts.push(`${steps} chặng`);
  else if (units) parts.push(`từ của ${units} unit`);
  else if (words) parts.push(`${words} từ đã chọn`);
  else parts.push("mọi từ có hình");
  if (kind === "flashcards") {
    if (settings.ipa) parts.push("hiện phiên âm");
  } else {
    if (kind === "true_false") parts.push(settings.yesNo === "full" ? "trả lời đầy đủ" : "chọn 1 lần");
    else parts.push(`sai ${settings.maxTries} lần`);
    if (!settings.hints) parts.push("tắt gợi ý");
  }
  if (kind === "listen_type" && settings.writeHint !== "slots")
    parts.push(`gợi ý chữ: ${settings.writeHint}`);
  if (kind === "listening" && content.gate) parts.push("xem hết mới mở câu hỏi");
  return parts.join(" · ");
}

export async function getActivityForStaff(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_activities")
    .select("id, kind, title_en, title_vi, status, sort_order, content, settings, public_token, topic_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error?.code === "42703") return getActivityForStaffWithoutToken(id); // before migration 0022
  if (error || !data) return null;
  const [topic, draft] = await Promise.all([getTopicForStaff(data.topic_id as string), draftOf(id)]);
  if (!topic) return null;
  return {
    id: data.id as string,
    kind: data.kind as PracticeKind,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    status: data.status as Status,
    sortOrder: data.sort_order as number,
    content: (data.content ?? {}) as Record<string, unknown>,
    settings: settingsOf(data.settings),
    publicToken: ((data as { public_token?: string | null }).public_token ?? null) as string | null,
    topic,
    draft,
  };
}

async function getActivityForStaffWithoutToken(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_activities")
    .select("id, kind, title_en, title_vi, status, sort_order, content, settings, topic_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const [topic, draft] = await Promise.all([getTopicForStaff(data.topic_id as string), draftOf(id)]);
  if (!topic) return null;
  return {
    id: data.id as string,
    kind: data.kind as PracticeKind,
    titleEn: data.title_en as string,
    titleVi: data.title_vi as string,
    status: data.status as Status,
    sortOrder: data.sort_order as number,
    content: (data.content ?? {}) as Record<string, unknown>,
    settings: settingsOf(data.settings),
    publicToken: null as string | null,
    topic,
    draft,
  };
}

/** A topic's or activity's teacher recordings (D67); {} before migration 0044. */
export async function voicesFor(table: "topics" | "practice_activities", id: string): Promise<Voices> {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("voices").eq("id", id).maybeSingle();
  return voicesOf((data as { voices?: unknown } | null)?.voices);
}
