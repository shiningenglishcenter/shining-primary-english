import { describe, expect, it } from "vitest";
import { latestByActivity, summariseActivities, summariseStudents } from "@/features/results/summary";

const now = new Date("2026-11-12T10:00:00Z");
const rec = (studentId: string, activityId: string, score: number, max: number, at: string) => ({
  studentId,
  activityId,
  score,
  maxScore: max,
  recordedAt: at,
});
const records = [
  rec("s1", "a1", 10, 10, "2026-11-10T08:00:00Z"),
  rec("s1", "a1", 4, 10, "2026-11-11T08:00:00Z"), // latest attempt counts, even if lower
  rec("s1", "a2", 8, 10, "2026-11-09T08:00:00Z"),
  rec("s2", "a1", 2, 10, "2026-10-01T08:00:00Z"),
];

describe("results summary", () => {
  it("uses each activity's latest attempt and counts every try", () => {
    const s1 = latestByActivity(records).get("s1")!;
    expect(s1.get("a1")).toMatchObject({ attempts: 2, ratio: 0.4, stars: 1 });
  });
  it("summarises students and flags who needs support", () => {
    const [s1, s2, s3] = summariseStudents(["s1", "s2", "s3"], records, now);
    expect(s1).toMatchObject({ done: 2, attempts: 3, stars: 3, needsSupport: false });
    expect(s1!.average).toBeCloseTo(0.6);
    expect(s2).toMatchObject({ done: 1, needsSupport: true }); // inactive and low
    expect(s3).toMatchObject({ done: 0, average: null, lastAt: null, needsSupport: true });
  });
  it("summarises activities across students", () => {
    const a1 = summariseActivities(records).find((a) => a.activityId === "a1")!;
    expect(a1.students).toBe(2);
    expect(a1.average).toBeCloseTo(0.3);
  });
});
