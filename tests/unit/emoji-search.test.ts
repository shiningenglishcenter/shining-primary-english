import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fold, searchEmoji, type EmojiRow } from "@/features/content-editor/emoji-search";

/** A1 (D42): the picker index (built by scripts/copy-emoji.mjs) and its search. */
const rows = JSON.parse(
  readFileSync(join(process.cwd(), "public", "emoji", "index.json"), "utf8"),
) as EmojiRow[];

describe("emoji search", () => {
  it("folds Vietnamese accents and case", () => {
    expect(fold("Con Mèo Đỏ")).toBe("con meo do");
  });
  it("finds by English name, keyword or plural", () => {
    expect(searchEmoji(rows, "cat")[0]).toMatch(/^1f408|^1f431/);
    expect(searchEmoji(rows, "apple")).toContain("1f34e");
    expect(searchEmoji(rows, "apples")).toContain("1f34e");
  });
  it("finds by Vietnamese, with or without accents", () => {
    expect(searchEmoji(rows, "táo")).toContain("1f34e");
    expect(searchEmoji(rows, "tao do")).toContain("1f34e");
    expect(searchEmoji(rows, "mèo").length).toBeGreaterThan(0);
  });
  it("every result has a Fluent picture", () => {
    for (const code of searchEmoji(rows, "dog", 100)) {
      expect(readFileSync(join(process.cwd(), "public", "emoji", `${code}.webp`)).length).toBeGreaterThan(0);
    }
  });
  it("empty query gives nothing; limit is respected", () => {
    expect(searchEmoji(rows, "  ")).toEqual([]);
    expect(searchEmoji(rows, "a", 5)).toHaveLength(5);
  });
});
