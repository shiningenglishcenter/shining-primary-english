import { describe, expect, it } from "vitest";
import { codeToEmoji, emojiSrc, emojiToCode } from "@/features/practice/emoji";
import { levelBySlug, starsFor } from "@/features/practice/model";
import { buildRound, sameSentence, shuffle, splitBlank } from "@/features/practice/round";

const words = [
  { word: "cat", meaningVi: "con mèo", emoji: "1f408" },
  { word: "dog", meaningVi: "con chó", emoji: "1f415" },
  { word: "fish", meaningVi: "con cá", emoji: "1f41f" },
  { word: "duck", meaningVi: "con vịt", emoji: "1f986" },
  { word: "teddy bear", meaningVi: "gấu bông", emoji: "1f9f8" },
  { word: "ghost", meaningVi: "no picture", emoji: null },
];

/** Deterministic pseudo-random source for tests. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("emoji codes", () => {
  it("round-trips emoji and code, keeping variation selectors", () => {
    expect(emojiToCode("🐈")).toBe("1f408");
    expect(emojiToCode("👁️")).toBe("1f441-fe0f");
    expect(emojiToCode("🧑‍🏫")).toBe("1f9d1-200d-1f3eb");
    expect(codeToEmoji("1f441-fe0f")).toBe("👁️");
  });
  it("only builds image paths for valid codes", () => {
    expect(emojiSrc("1f408")).toBe("/emoji/1f408.webp");
    expect(emojiSrc("../etc/passwd")).toBeNull();
    expect(emojiSrc(null)).toBeNull();
  });
});

describe("starsFor (same thresholds as record_practice)", () => {
  it("maps ratios to 0–3 stars", () => {
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(1, 10)).toBe(1);
    expect(starsFor(0, 10)).toBe(0);
    expect(starsFor(3, 0)).toBe(0);
  });
});

describe("levelBySlug", () => {
  it("falls back to Starters", () => {
    expect(levelBySlug("flyers").theme).toBe("theme-flyers");
    expect(levelBySlug("nope").code).toBe("STARTERS");
  });
});

describe("buildRound — word games", () => {
  it("listen_choose: 3 picture options including the answer, never pictureless words", () => {
    const r = buildRound("listen_choose", {}, words, seeded());
    expect(r.questions).toHaveLength(5);
    expect(r.maxScore).toBe(5);
    for (const q of r.questions) {
      if (q.type !== "listen_choose") throw new Error("wrong type");
      expect(q.options).toHaveLength(3);
      expect(q.options.map((o) => o.word)).toContain(q.answer.word);
      expect(new Set(q.options.map((o) => o.word)).size).toBe(3);
      expect(q.options.every((o) => o.emoji)).toBe(true);
    }
  });

  it("uses only the listed words when the activity names some", () => {
    const r = buildRound("look_choose", { words: ["cat", "DOG"] }, words, seeded());
    expect(r.questions.map((q) => (q.type === "look_choose" ? q.answer.word : "")).sort()).toEqual([
      "cat",
      "dog",
    ]);
  });

  it("spell skips multi-word entries and scrambles letters", () => {
    const r = buildRound("spell", {}, words, seeded(3));
    for (const q of r.questions) {
      if (q.type !== "spell") throw new Error("wrong type");
      expect(q.answer.word).not.toContain(" ");
      expect([...q.letters].sort()).toEqual(q.answer.word.split("").sort());
      if (new Set(q.answer.word).size > 1) expect(q.letters.join("")).not.toBe(q.answer.word);
    }
  });

  it("match: groups of up to 4 pairs, score = number of pairs", () => {
    const r = buildRound("match", {}, words, seeded());
    expect(r.questions.every((q) => q.type === "match" && q.pairs.length <= 4)).toBe(true);
    expect(r.maxScore).toBe(5);
  });

  it("returns an empty round when there are no usable words", () => {
    expect(buildRound("flashcards", {}, [], seeded())).toEqual({ questions: [], maxScore: 0 });
  });
});

describe("buildRound — sentence games", () => {
  it("fill_blank splits the sentence at ___ and keeps all options", () => {
    const r = buildRound(
      "fill_blank",
      {
        items: [
          { emoji: "1f41f", sentence: "A ___ can swim.", answer: "fish", options: ["fish", "cow", "goat"] },
        ],
      },
      [],
      seeded(),
    );
    const q = r.questions[0]!;
    if (q.type !== "fill_blank") throw new Error("wrong type");
    expect([q.before, q.after]).toEqual(["A ", " can swim."]);
    expect([...q.options].sort()).toEqual(["cow", "fish", "goat"]);
  });

  it("rejects malformed items instead of crashing", () => {
    expect(
      buildRound("fill_blank", { items: [{ sentence: "No blank", answer: "x", options: ["x", "y"] }] }, [])
        .maxScore,
    ).toBe(0);
    expect(buildRound("true_false", { items: "nope" }, []).maxScore).toBe(0);
  });

  it("rearrange scrambles words and keeps the answer", () => {
    const r = buildRound("rearrange", { items: [{ sentence: "I have got a cat." }] }, [], seeded(5));
    const q = r.questions[0]!;
    if (q.type !== "rearrange") throw new Error("wrong type");
    expect(q.answer).toEqual(["I", "have", "got", "a", "cat."]);
    expect(q.words.join(" ")).not.toBe("I have got a cat.");
    expect(sameSentence(q.answer, ["i", "have", "got", "a", "cat."])).toBe(true);
  });
});

describe("helpers", () => {
  it("shuffle keeps every item", () => {
    expect(shuffle([1, 2, 3, 4], seeded()).sort()).toEqual([1, 2, 3, 4]);
  });
  it("splitBlank handles a missing blank", () => {
    expect(splitBlank("Hello")).toEqual(["Hello", ""]);
  });
});
