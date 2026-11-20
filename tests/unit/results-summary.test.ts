import { describe, expect, it } from "vitest";
import type { PracticeKind } from "@/features/practice/model";
import {
  durationVi,
  latestByActivity,
  skillProfile,
  summariseActivities,
  summariseStudents,
  weakestSkill,
  weakItems,
} from "@/features/results/summary";

const now = new Date("2026-11-12T10:00:00Z");
const rec = (
  studentId: string,
  activityId: string,
  score: number,
  max: number,
  at: string,
  seconds = 60,
) => ({
  studentId,
  activityId,
  score,
  maxScore: max,
  recordedAt: at,
  seconds,
});
const kinds: Record<string, PracticeKind> = {
  a1: "listen_choose",
  a2: "spell",
  a3: "flashcards",
  a4: "match",
};
const kindOf = (id: string) => kinds[id];
const records = [
  rec("s1", "a1", 10, 10, "2026-11-10T08:00:00Z"),
  rec("s1", "a1", 4, 10, "2026-11-11T08:00:00Z"), // latest attempt counts, even if lower
  rec("s1", "a2", 8, 10, "2026-11-09T08:00:00Z"),
  rec("s1", "a3", 12, 12, "2026-11-11T09:00:00Z"), // flashcards: done, not averaged
  rec("s2", "a1", 2, 10, "2026-10-01T08:00:00Z"),
];

describe("results summary", () => {
  it("keeps the first, latest and best attempt and counts every try", () => {
    const a1 = latestByActivity(records).get("s1")!.get("a1")!;
    expect(a1).toMatchObject({
      attempts: 2,
      ratio: 0.4,
      firstRatio: 1,
      bestRatio: 1,
      stars: 1,
      seconds: 120,
    });
  });
  it("is order-independent", () => {
    const a1 = latestByActivity([...records].reverse())
      .get("s1")!
      .get("a1")!;
    expect(a1).toMatchObject({ ratio: 0.4, firstRatio: 1 });
  });
  it("summarises students, leaves flashcards out of averages and flags who needs support", () => {
    const [s1, s2, s3] = summariseStudents(["s1", "s2", "s3"], records, kindOf, now);
    expect(s1).toMatchObject({ done: 3, attempts: 4, days: 3, needsSupport: false });
    expect(s1!.average).toBeCloseTo(0.6);
    expect(s2).toMatchObject({ done: 1, needsSupport: true }); // inactive and low
    expect(s3).toMatchObject({ done: 0, average: null, lastAt: null, needsSupport: true });
  });
  it("summarises activities across students", () => {
    const a1 = summariseActivities(records).find((a) => a.activityId === "a1")!;
    expect(a1.students).toBe(2);
    expect(a1.average).toBeCloseTo(0.3);
  });
  it("builds a skill profile and names a clearly weak skill", () => {
    const results = [...latestByActivity(records).get("s1")!.values()];
    const profile = skillProfile(results, kindOf);
    expect(profile.find((p) => p.skill === "listening")).toMatchObject({ activities: 1, average: 0.4 });
    expect(profile.find((p) => p.skill === "vocab")).toMatchObject({ activities: 0, average: null });
    expect(weakestSkill(profile)).toBeNull(); // too little evidence (one activity each)
    expect(
      weakestSkill([
        { skill: "vocab", activities: 3, average: 0.9 },
        { skill: "writing", activities: 2, average: 0.5 },
      ]),
    ).toBe("writing");
  });
  it("lists the words a student often gets wrong, worst first", () => {
    const withDetails = [
      {
        ...rec("s1", "a1", 3, 6, "2026-11-11T08:00:00Z"),
        details: [
          { t: "listen_choose", q: "giraffe", p: 0, x: 2 },
          { t: "listen_choose", q: "cat", p: 2, x: 2 },
          { t: "listen_choose", q: "tiger", p: 1, x: 2 },
        ],
      },
      {
        ...rec("s1", "a1", 4, 6, "2026-11-12T08:00:00Z"),
        details: [
          { t: "listen_choose", q: "Giraffe", p: 1, x: 2 },
          { t: "listen_choose", q: "tiger", p: 2, x: 2 },
        ],
      },
    ];
    const weak = weakItems(withDetails);
    expect(weak.map((w) => [w.label, w.missed, w.seen])).toEqual([
      ["giraffe", 2, 2],
      ["tiger", 1, 2],
    ]);
  });
  it("formats durations", () => {
    expect(durationVi(20)).toBe("<1 phút");
    expect(durationVi(720)).toBe("12 phút");
    expect(durationVi(4800)).toBe("1 giờ 20 phút");
    expect(durationVi(3600)).toBe("1 giờ");
  });
});
