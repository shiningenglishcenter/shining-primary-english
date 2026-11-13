import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  levelByCode,
  PRACTICE_LEVELS,
  type PracticeKind,
  type PracticeLevel,
} from "@/features/practice/model";
import type { PracticeRecord } from "@/features/results/summary";

/**
 * Reads for the results pages. RLS decides what is visible: a teacher sees
 * only classes they teach and those students' records; admins see all.
 */

export type ClassOption = { id: string; code: string; name: string };

export async function listResultClasses(): Promise<ClassOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, code, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("code");
  if (error) throw new Error(`listResultClasses: ${error.code}`);
  return (data ?? []) as ClassOption[];
}

export type StudentRow = { id: string; code: string; name: string };

type StudentJoin = { id: string; student_code: string; full_name: string; english_name: string | null };

function studentRow(s: StudentJoin): StudentRow {
  return {
    id: s.id,
    code: s.student_code,
    name: s.english_name ? `${s.full_name} (${s.english_name})` : s.full_name,
  };
}

export async function classStudents(classId: string): Promise<StudentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_students")
    .select("student:students!inner(id, student_code, full_name, english_name, deleted_at)")
    .eq("class_id", classId)
    .is("left_at", null);
  if (error) throw new Error(`classStudents: ${error.code}`);
  return (data ?? [])
    .map((r) => r.student as unknown as StudentJoin & { deleted_at: string | null })
    .filter((s) => s && !s.deleted_at)
    .map(studentRow)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function getStudent(studentId: string): Promise<StudentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, student_code, full_name, english_name")
    .eq("id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  return data ? studentRow(data as StudentJoin) : null;
}

export type ActivityInfo = {
  id: string;
  kind: PracticeKind;
  titleVi: string;
  topicId: string;
  topicEn: string;
  level: PracticeLevel | null;
  sortKey: string;
};

export type TopicInfo = {
  id: string;
  titleEn: string;
  level: PracticeLevel | null;
  sortKey: string;
  /** Every published activity of the topic, in order (done or not). */
  activityIds: string[];
};

const MAX_RECORDS = 10_000;

type TopicJoin = { id: string; title_en: string; sort_order: number; level: { code: string } };

/**
 * Practice records of these students since a date, plus every published
 * activity of the topics they touched (so pages can show what is not done
 * yet). `levelCode` keeps only that level.
 */
export async function practiceRecords(
  studentIds: string[],
  sinceIso: string | null,
  levelCode: string | null,
): Promise<{ records: PracticeRecord[]; activities: Map<string, ActivityInfo>; topics: TopicInfo[] }> {
  const activities = new Map<string, ActivityInfo>();
  const empty = { records: [], activities, topics: [] };
  if (studentIds.length === 0) return empty;
  const supabase = await createClient();
  let q = supabase
    .from("progress_records")
    .select("student_id, practice_activity_id, score, max_score, recorded_at, duration_seconds, details")
    .in("student_id", studentIds)
    .not("practice_activity_id", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(MAX_RECORDS);
  if (sinceIso) q = q.gte("recorded_at", sinceIso);
  const { data, error } = await q;
  if (error) throw new Error(`practiceRecords: ${error.code}`);
  const done = [...new Set((data ?? []).map((r) => r.practice_activity_id as string))];
  if (done.length === 0) return empty;

  // Topics of the activities done, then all their published activities.
  const { data: touched, error: tErr } = await supabase
    .from("practice_activities")
    .select("topic_id")
    .in("id", done);
  if (tErr) throw new Error(`practiceRecords/topics: ${tErr.code}`);
  const topicIds = [...new Set((touched ?? []).map((r) => r.topic_id as string))];
  const { data: acts, error: aErr } = await supabase
    .from("practice_activities")
    .select(
      "id, kind, title_vi, sort_order, status, deleted_at, topic:topics!inner(id, title_en, sort_order, level:levels!inner(code))",
    )
    .in("topic_id", topicIds);
  if (aErr) throw new Error(`practiceRecords/activities: ${aErr.code}`);

  const doneSet = new Set(done);
  const topics = new Map<string, TopicInfo>();
  for (const a of acts ?? []) {
    const topic = a.topic as unknown as TopicJoin;
    if (levelCode && topic.level.code !== levelCode) continue;
    // Unpublished activities only matter if the student did them earlier.
    const live = a.status === "published" && !a.deleted_at;
    if (!live && !doneSet.has(a.id as string)) continue;
    const level = levelByCode(topic.level.code);
    const topicKey = [PRACTICE_LEVELS.findIndex((l) => l.code === topic.level.code), topic.sort_order]
      .map((n) => String(n + 1).padStart(6, "0"))
      .join("-");
    activities.set(a.id as string, {
      id: a.id as string,
      kind: a.kind as PracticeKind,
      titleVi: a.title_vi as string,
      topicId: topic.id,
      topicEn: topic.title_en,
      level,
      sortKey: `${topicKey}-${String((a.sort_order as number) + 1).padStart(6, "0")}`,
    });
    const t = topics.get(topic.id) ?? {
      id: topic.id,
      titleEn: topic.title_en,
      level,
      sortKey: topicKey,
      activityIds: [],
    };
    t.activityIds.push(a.id as string);
    topics.set(topic.id, t);
  }
  for (const t of topics.values()) {
    t.activityIds.sort((x, y) => activities.get(x)!.sortKey.localeCompare(activities.get(y)!.sortKey));
  }
  const records = (data ?? [])
    .filter((r) => activities.has(r.practice_activity_id as string))
    .map((r) => ({
      studentId: r.student_id as string,
      activityId: r.practice_activity_id as string,
      score: Number(r.score ?? 0),
      maxScore: Number(r.max_score ?? 0),
      recordedAt: r.recorded_at as string,
      seconds: Number(r.duration_seconds ?? 0),
      details: Array.isArray(r.details) ? (r.details as PracticeRecord["details"]) : null,
    }));
  return {
    records,
    activities,
    topics: [...topics.values()].sort((x, y) => x.sortKey.localeCompare(y.sortKey)),
  };
}

export type GuestAttempt = {
  id: string;
  name: string;
  activityTitle: string;
  kind: PracticeKind;
  topicEn: string;
  level: PracticeLevel | null;
  ratio: number;
  seconds: number;
  recordedAt: string;
};

/** Rounds played through guest links (D35); staff only (RLS). Empty before migration 0022. */
export async function guestAttempts(
  sinceIso: string | null,
  levelCode: string | null,
): Promise<GuestAttempt[]> {
  const supabase = await createClient();
  let q = supabase
    .from("guest_attempts")
    .select(
      "id, player_name, score, max_score, duration_seconds, recorded_at, activity:practice_activities!inner(title_vi, kind, topic:topics!inner(title_en, level:levels!inner(code)))",
    )
    .order("recorded_at", { ascending: false })
    .limit(2000);
  if (sinceIso) q = q.gte("recorded_at", sinceIso);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).flatMap((r) => {
    const a = r.activity as unknown as {
      title_vi: string;
      kind: PracticeKind;
      topic: { title_en: string; level: { code: string } };
    };
    if (levelCode && a.topic.level.code !== levelCode) return [];
    return [
      {
        id: r.id as string,
        name: r.player_name as string,
        activityTitle: a.title_vi,
        kind: a.kind,
        topicEn: a.topic.title_en,
        level: levelByCode(a.topic.level.code),
        ratio: Number(r.score) / Number(r.max_score),
        seconds: Number(r.duration_seconds ?? 0),
        recordedAt: r.recorded_at as string,
      },
    ];
  });
}
