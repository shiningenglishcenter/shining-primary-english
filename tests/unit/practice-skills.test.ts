import { describe, expect, it } from "vitest";
import { contentSchemaFor, parseYouTube } from "@/features/practice/model";
import { buildRound, MIXED_STEP_SIZE, sameWord } from "@/features/practice/round";

const words = [
  { word: "cat", meaningVi: "con mèo", emoji: "1f408" },
  { word: "dog", meaningVi: "con chó", emoji: "1f415" },
  { word: "fish", meaningVi: "con cá", emoji: "1f41f" },
  { word: "teddy bear", meaningVi: "gấu bông", emoji: "1f9f8" },
];
const rand = () => 0.42;
const quiz = [
  { type: "tf", emoji: null, sentence: "Lan has a cat.", answer: true },
  {
    type: "mc",
    emoji: null,
    question: "What colour is it?",
    answer: "black",
    options: ["black", "red", "blue"],
  },
];

describe("parseYouTube", () => {
  it("reads ids and start times from the usual link shapes", () => {
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ videoId: "dQw4w9WgXcQ" });
    expect(parseYouTube("https://youtu.be/dQw4w9WgXcQ?t=75")).toEqual({ videoId: "dQw4w9WgXcQ", start: 75 });
    expect(parseYouTube("youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ videoId: "dQw4w9WgXcQ" });
    expect(parseYouTube("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s")).toEqual({
      videoId: "dQw4w9WgXcQ",
      start: 65,
    });
    expect(parseYouTube("dQw4w9WgXcQ")).toEqual({ videoId: "dQw4w9WgXcQ" });
  });
  it("rejects other sites and malformed ids", () => {
    expect(parseYouTube("https://vimeo.com/123")).toBeNull();
    expect(parseYouTube("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTube("https://youtu.be/short")).toBeNull();
  });
});

describe("listen_type", () => {
  it("uses single-word vocabulary and compares typed words loosely", () => {
    const r = buildRound("listen_type", {}, words, rand);
    expect(r.questions.map((q) => q.type === "listen_type" && q.answer.word).sort()).toEqual([
      "cat",
      "dog",
      "fish",
    ]);
    expect(sameWord("  Cat ", "cat")).toBe(true);
    expect(sameWord("cats", "cat")).toBe(false);
  });
});

describe("listening and reading", () => {
  it("keeps question order and points every question at the context", () => {
    const r = buildRound(
      "listening",
      { media: { source: "youtube", videoId: "dQw4w9WgXcQ" }, items: quiz },
      words,
      rand,
    );
    expect(r.contexts).toEqual([{ type: "listening", media: { source: "youtube", videoId: "dQw4w9WgXcQ" } }]);
    expect(r.questions.map((q) => [q.type, q.ctx])).toEqual([
      ["true_false", 0],
      ["choice", 0],
    ]);
    expect(r.maxScore).toBe(2);
  });
  it("rejects a reading passage without questions", () => {
    const content = { passage: "Hello! My name is Lan. I have a cat.", items: [] };
    expect(contentSchemaFor("reading").safeParse(content).success).toBe(false);
    expect(buildRound("reading", content, words, rand).questions).toHaveLength(0);
  });
  it("rejects a multiple-choice answer that is not an option", () => {
    const bad = { passage: "Hello! My name is Lan. I have a cat.", items: [{ ...quiz[1], answer: "green" }] };
    expect(contentSchemaFor("reading").safeParse(bad).success).toBe(false);
  });
});

describe("mixed", () => {
  const content = {
    steps: [
      { kind: "listen_choose", content: {} },
      { kind: "reading", content: { passage: "Hello! My name is Lan. I have a cat.", items: quiz } },
      { kind: "listening", content: { media: { source: "youtube", videoId: "dQw4w9WgXcQ" }, items: quiz } },
      { kind: "match", content: {} },
    ],
  };
  it("chains steps, limits each one and re-numbers contexts", () => {
    const r = buildRound("mixed", content, words, rand);
    const types = r.questions.map((q) => q.type);
    expect(types.filter((t) => t === "listen_choose")).toHaveLength(MIXED_STEP_SIZE);
    expect(types.filter((t) => t === "match")).toHaveLength(1);
    expect(r.contexts.map((c) => c.type)).toEqual(["reading", "listening"]);
    expect(r.questions.filter((q) => q.ctx !== undefined).map((q) => q.ctx)).toEqual([0, 0, 1, 1]);
    const matchPairs = r.questions.find((q) => q.type === "match");
    expect(r.maxScore).toBe(
      MIXED_STEP_SIZE + 4 + (matchPairs?.type === "match" ? matchPairs.pairs.length : 0),
    );
  });
  it("needs at least two valid steps and no nested mixed", () => {
    expect(contentSchemaFor("mixed").safeParse({ steps: [content.steps[0]] }).success).toBe(false);
    expect(
      contentSchemaFor("mixed").safeParse({ steps: [content.steps[0], { kind: "mixed", content: {} }] })
        .success,
    ).toBe(false);
    expect(
      contentSchemaFor("mixed").safeParse({ steps: [content.steps[0], { kind: "reading", content: {} }] })
        .success,
    ).toBe(false);
  });
});
