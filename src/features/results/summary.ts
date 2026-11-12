import { starsFor } from "@/features/practice/model";

/**
 * Pure aggregation of practice records for the teacher results pages
 * (D29). Every figure uses each activity's LATEST attempt (owner decision
 * 2026-11-12); attempts counts every try.
 */

export type PracticeRecord = {
  studentId: string;
  activityId: string;
  score: number;
  maxScore: number;
  recordedAt: string; // ISO
};

export type ActivityResult = {
  activityId: string;
  attempts: number;
  /** 0–1, latest attempt */
  ratio: number;
  stars: 0 | 1 | 2 | 3;
  lastAt: string;
};

export type StudentSummary = {
  studentId: string;
  done: number;
  stars: number;
  /** Mean of latest ratios, 0–1; null when nothing done. */
  average: number | null;
  attempts: number;
  lastAt: string | null;
  needsSupport: boolean;
};

export const INACTIVE_DAYS = 7;
export const LOW_AVERAGE = 0.5;

/** Latest attempt per (student, activity). */
export function latestByActivity(records: PracticeRecord[]): Map<string, Map<string, ActivityResult>> {
  const out = new Map<string, Map<string, ActivityResult>>();
  for (const r of records) {
    if (r.maxScore <= 0) continue;
    let perStudent = out.get(r.studentId);
    if (!perStudent) out.set(r.studentId, (perStudent = new Map()));
    const prev = perStudent.get(r.activityId);
    const newer = !prev || r.recordedAt > prev.lastAt;
    perStudent.set(r.activityId, {
      activityId: r.activityId,
      attempts: (prev?.attempts ?? 0) + 1,
      ratio: newer ? r.score / r.maxScore : prev!.ratio,
      stars: newer ? starsFor(r.score, r.maxScore) : prev!.stars,
      lastAt: newer ? r.recordedAt : prev!.lastAt,
    });
  }
  return out;
}

export function summariseStudents(
  studentIds: string[],
  records: PracticeRecord[],
  now: Date = new Date(),
): StudentSummary[] {
  const latest = latestByActivity(records);
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 86_400_000).toISOString();
  return studentIds.map((studentId) => {
    const results = [...(latest.get(studentId)?.values() ?? [])];
    const done = results.length;
    const average = done ? results.reduce((n, r) => n + r.ratio, 0) / done : null;
    const lastAt = results.reduce<string | null>((m, r) => (m && m > r.lastAt ? m : r.lastAt), null);
    return {
      studentId,
      done,
      stars: results.reduce((n, r) => n + r.stars, 0),
      average,
      attempts: results.reduce((n, r) => n + r.attempts, 0),
      lastAt,
      needsSupport: !lastAt || lastAt < cutoff || (average !== null && average < LOW_AVERAGE),
    };
  });
}

export type ActivitySummary = { activityId: string; students: number; average: number };

/** Per activity: how many students did it and their mean latest score. */
export function summariseActivities(records: PracticeRecord[]): ActivitySummary[] {
  const per = new Map<string, number[]>();
  for (const results of latestByActivity(records).values()) {
    for (const r of results.values()) {
      const list = per.get(r.activityId) ?? [];
      list.push(r.ratio);
      per.set(r.activityId, list);
    }
  }
  return [...per].map(([activityId, ratios]) => ({
    activityId,
    students: ratios.length,
    average: ratios.reduce((n, x) => n + x, 0) / ratios.length,
  }));
}
