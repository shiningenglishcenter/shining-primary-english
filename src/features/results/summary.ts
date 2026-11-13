import { starsFor, type PracticeKind } from "@/features/practice/model";

/**
 * Pure aggregation of practice records for the results pages (D29, D32).
 * Scores use each activity's LATEST attempt (owner decision 2026-11-12);
 * flashcards count as "seen" but never in averages (always 100 %).
 */

export type QuestionDetail = { t: string; q: string; p: number; x: number };

export type PracticeRecord = {
  studentId: string;
  activityId: string;
  score: number;
  maxScore: number;
  recordedAt: string; // ISO
  seconds?: number;
  details?: QuestionDetail[] | null;
};

export type ActivityResult = {
  activityId: string;
  attempts: number;
  /** 0–1 */
  ratio: number;
  firstRatio: number;
  bestRatio: number;
  stars: 0 | 1 | 2 | 3;
  lastAt: string;
  seconds: number;
};

export type StudentSummary = {
  studentId: string;
  done: number;
  stars: number;
  /** Mean of latest ratios of scored activities, 0–1; null when none. */
  average: number | null;
  attempts: number;
  seconds: number;
  days: number;
  lastAt: string | null;
  needsSupport: boolean;
};

export const INACTIVE_DAYS = 7;
export const LOW_AVERAGE = 0.5;
/** Below this an activity goes on the "to review" list. */
export const REVIEW_BELOW = 0.7;

// ------------------------------------------------------------------ skills ---

export const SKILLS = [
  { code: "vocab", vi: "Từ vựng" },
  { code: "listening", vi: "Nghe" },
  { code: "reading", vi: "Đọc" },
  { code: "writing", vi: "Viết" },
] as const;
export type Skill = (typeof SKILLS)[number]["code"];

/** Which skill an activity mainly practises; null = not scored by skill. */
export function skillOf(kind: PracticeKind): Skill | null {
  switch (kind) {
    case "look_choose":
    case "match":
      return "vocab";
    case "listen_choose":
    case "listening":
      return "listening";
    case "reading":
    case "true_false":
      return "reading";
    case "spell":
    case "listen_type":
    case "rearrange":
    case "fill_blank":
      return "writing";
    default:
      return null; // flashcards (not scored), mixed (several skills)
  }
}

export const isScored = (kind: PracticeKind) => kind !== "flashcards";

// --------------------------------------------------------------- per record ---

const dayOf = (iso: string) => iso.slice(0, 10);

/** Latest / first / best attempt per (student, activity). */
export function latestByActivity(records: PracticeRecord[]): Map<string, Map<string, ActivityResult>> {
  const out = new Map<string, Map<string, ActivityResult>>();
  const firstAt = new Map<string, string>(); // "student|activity" → earliest attempt
  for (const r of records) {
    if (r.maxScore <= 0) continue;
    let perStudent = out.get(r.studentId);
    if (!perStudent) out.set(r.studentId, (perStudent = new Map()));
    const key = `${r.studentId}|${r.activityId}`;
    const ratio = r.score / r.maxScore;
    const prev = perStudent.get(r.activityId);
    if (!prev) {
      firstAt.set(key, r.recordedAt);
      perStudent.set(r.activityId, {
        activityId: r.activityId,
        attempts: 1,
        ratio,
        firstRatio: ratio,
        bestRatio: ratio,
        stars: starsFor(r.score, r.maxScore),
        lastAt: r.recordedAt,
        seconds: r.seconds ?? 0,
      });
      continue;
    }
    const newer = r.recordedAt > prev.lastAt;
    const older = r.recordedAt < firstAt.get(key)!;
    if (older) firstAt.set(key, r.recordedAt);
    perStudent.set(r.activityId, {
      ...prev,
      attempts: prev.attempts + 1,
      ratio: newer ? ratio : prev.ratio,
      stars: newer ? starsFor(r.score, r.maxScore) : prev.stars,
      lastAt: newer ? r.recordedAt : prev.lastAt,
      firstRatio: older ? ratio : prev.firstRatio,
      bestRatio: Math.max(prev.bestRatio, ratio),
      seconds: prev.seconds + (r.seconds ?? 0),
    });
  }
  return out;
}

export function summariseStudents(
  studentIds: string[],
  records: PracticeRecord[],
  kindOf: (activityId: string) => PracticeKind | undefined,
  now: Date = new Date(),
): StudentSummary[] {
  const latest = latestByActivity(records);
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 86_400_000).toISOString();
  const days = new Map<string, Set<string>>();
  for (const r of records) {
    const set = days.get(r.studentId) ?? new Set<string>();
    set.add(dayOf(r.recordedAt));
    days.set(r.studentId, set);
  }
  return studentIds.map((studentId) => {
    const results = [...(latest.get(studentId)?.values() ?? [])];
    const scored = results.filter((r) => {
      const k = kindOf(r.activityId);
      return k ? isScored(k) : true;
    });
    const average = scored.length ? scored.reduce((n, r) => n + r.ratio, 0) / scored.length : null;
    const lastAt = results.reduce<string | null>((m, r) => (m && m > r.lastAt ? m : r.lastAt), null);
    return {
      studentId,
      done: results.length,
      stars: results.reduce((n, r) => n + r.stars, 0),
      average,
      attempts: results.reduce((n, r) => n + r.attempts, 0),
      seconds: results.reduce((n, r) => n + r.seconds, 0),
      days: days.get(studentId)?.size ?? 0,
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

// ------------------------------------------------------- skills and topics ---

export type SkillSummary = { skill: Skill; activities: number; average: number | null };

export function skillProfile(
  results: ActivityResult[],
  kindOf: (activityId: string) => PracticeKind | undefined,
): SkillSummary[] {
  return SKILLS.map(({ code }) => {
    const mine = results.filter((r) => {
      const k = kindOf(r.activityId);
      return k && skillOf(k) === code;
    });
    return {
      skill: code,
      activities: mine.length,
      average: mine.length ? mine.reduce((n, r) => n + r.ratio, 0) / mine.length : null,
    };
  });
}

/** The weakest skill with enough evidence (≥ 2 activities), if clearly behind. */
export function weakestSkill(profile: SkillSummary[]): Skill | null {
  const known = profile.filter((s) => s.activities >= 2 && s.average !== null);
  if (known.length < 2) return null;
  const sorted = [...known].sort((a, b) => a.average! - b.average!);
  return sorted[0]!.average! < REVIEW_BELOW ? sorted[0]!.skill : null;
}

/** Mean latest ratio of the scored activities done in a topic; null when none. */
export function topicAverage(
  results: ActivityResult[],
  kindOf: (activityId: string) => PracticeKind | undefined,
): number | null {
  const scored = results.filter((r) => {
    const k = kindOf(r.activityId);
    return k ? isScored(k) : true;
  });
  return scored.length ? scored.reduce((n, r) => n + r.ratio, 0) / scored.length : null;
}

// ------------------------------------------------------ often-wrong items ---

export type WeakItem = { label: string; type: string; seen: number; missed: number; failed: number };

/**
 * Words/sentences answered wrong at least once (D32), worst first. An item
 * counts as missed when it did not get full points.
 */
export function weakItems(records: PracticeRecord[], limit = 10): WeakItem[] {
  const per = new Map<string, WeakItem>();
  for (const r of records) {
    for (const d of r.details ?? []) {
      if (!d || typeof d.q !== "string" || !d.q) continue;
      const key = `${d.t}|${d.q.toLowerCase()}`;
      const item = per.get(key) ?? { label: d.q, type: d.t, seen: 0, missed: 0, failed: 0 };
      item.seen += 1;
      if (d.p < d.x) item.missed += 1;
      if (d.p === 0) item.failed += 1;
      per.set(key, item);
    }
  }
  return [...per.values()]
    .filter((i) => i.missed > 0)
    .sort((a, b) => b.missed / b.seen - a.missed / a.seen || b.missed - a.missed || b.failed - a.failed)
    .slice(0, limit);
}

/** "1 giờ 20 phút" / "12 phút" / "<1 phút". */
export function durationVi(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "<1 phút";
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ ${m % 60 ? `${m % 60} phút` : ""}`.trim();
}
