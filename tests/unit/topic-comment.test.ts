import { describe, expect, it } from "vitest";
import { parentMessage } from "@/features/results/components/topic-comment";

/** Round 3 (D54): message for parents = figures + the teacher's comment. */
describe("parentMessage", () => {
  it("adds the comment after the figures, or leaves the figures alone", () => {
    expect(parentMessage("Đã làm 3/12 bài", "  Con cần ôn câu dài. ")).toBe(
      "Đã làm 3/12 bài\nNhận xét của thầy cô: Con cần ôn câu dài.",
    );
    expect(parentMessage("Đã làm 3/12 bài", "  ")).toBe("Đã làm 3/12 bài");
  });
});
