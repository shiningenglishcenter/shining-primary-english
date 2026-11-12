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

const MAX_RECORDS = 10_000;

/**
 * Practice records of these students since a date, with what each activity
 * is. `levelCode` keeps only activities of that level.
 */
export async function practiceRecords(
  studentIds: string[],
  sinceIso: string | null,
  levelCode: string | null,
): Promise<{ records: PracticeRecord[]; activities: Map<string, ActivityInfo> }> {
  const activities = new Map<string, ActivityInfo>();
  if (studentIds.length === 0) return { records: [], activities };
  const supabase = await createClient();
  let q = supabase
    .from("progress_records")
    .select("student_id, practice_activity_id, score, max_score, recorded_at")
    .in("student_id", studentIds)
    .not("practice_activity_id", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(MAX_RECORDS);
  if (sinceIso) q = q.gte("recorded_at", sinceIso);
  const { data, error } = await q;
  if (error) throw new Error(`practiceRecords: ${error.code}`);

  const ids = [...new Set((data ?? []).map((r) => r.practice_activity_id as string))];
  if (ids.length) {
    const { data: acts, error: aErr } = await supabase
      .from("practice_activities")
      .select(
        "id, kind, title_vi, sort_order, topic:topics!inner(id, title_en, sort_order, level:levels!inner(code))",
      )
      .in("id", ids);
    if (aErr) throw new Error(`practiceRecords/activities: ${aErr.code}`);
    for (const a of acts ?? []) {
      const topic = a.topic as unknown as {
        id: string;
        title_en: string;
        sort_order: number;
        level: { code: string };
      };
      const level = levelByCode(topic.level.code);
      if (levelCode && topic.level.code !== levelCode) continue;
      activities.set(a.id as string, {
        id: a.id as string,
        kind: a.kind as PracticeKind,
        titleVi: a.title_vi as string,
        topicId: topic.id,
        topicEn: topic.title_en,
        level,
        sortKey: [
          PRACTICE_LEVELS.findIndex((l) => l.code === topic.level.code),
          topic.sort_order,
          a.sort_order,
        ]
          .map((n) => String(n + 1).padStart(6, "0"))
          .join("-"),
      });
    }
  }
  const records = (data ?? [])
    .filter((r) => activities.has(r.practice_activity_id as string))
    .map((r) => ({
      studentId: r.student_id as string,
      activityId: r.practice_activity_id as string,
      score: Number(r.score ?? 0),
      maxScore: Number(r.max_score ?? 0),
      recordedAt: r.recorded_at as string,
    }));
  return { records, activities };
}
