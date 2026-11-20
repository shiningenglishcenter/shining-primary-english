import { describe, expect, it } from "vitest";
import { codeToEmoji, emojiSrc, emojiToCode } from "@/features/practice/emoji";
import { levelBySlug, starsFor } from "@/features/practice/model";
import {
  atLeast,
  buildRound,
  groupPairs,
  MIN_QUESTIONS,
  regroupMatches,
  sameSentence,
  shuffle,
  splitBlank,
  type Card,
  type Question,
} from "@/features/practice/round";

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
    expect(levelBySlug("flyers").code).toBe("FLYERS");
    expect(levelBySlug("g1").program).toBe("global_success");
    expect(levelBySlug("nope").code).toBe("STARTERS");
  });
});

describe("buildRound — word games", () => {
  it("listen_choose: 3 picture options including the answer, never pictureless words", () => {
    const r = buildRound("listen_choose", {}, words, seeded());
    // 5 words with pictures, repeated up to 6 questions (C8).
    expect(r.questions).toHaveLength(MIN_QUESTIONS);
    expect(r.maxScore).toBe(12);
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
    expect(new Set(r.questions.map((q) => (q.type === "look_choose" ? q.answer.word : "")))).toEqual(
      new Set(["cat", "dog"]),
    );
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
    expect(r.maxScore).toBe(10);
  });

  it("match: up to 12 words in even phone screens of at most 4", () => {
    const many: Card[] = Array.from({ length: 14 }, (_, i) => ({
      word: `w${String.fromCharCode(97 + i)}`,
      meaningVi: "",
      emoji: "1f408",
    }));
    const r = buildRound("match", {}, many, seeded());
    expect(r.questions.map((q) => (q.type === "match" ? q.pairs.length : 0))).toEqual([4, 4, 4]);
    expect(r.maxScore).toBe(24);
  });

  it("returns an empty round when there are no usable words", () => {
    expect(buildRound("flashcards", {}, [], seeded())).toEqual({ questions: [], maxScore: 0, contexts: [] });
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

describe("C5/C8 helpers (D40)", () => {
  const cards = (n: number): Card[] =>
    Array.from({ length: n }, (_, i) => ({ word: `w${i}`, meaningVi: "", emoji: "1f408" }));
  const sizes = (qs: Question[]) => qs.map((q) => (q.type === "match" ? q.pairs.length : -1));

  it("groupPairs splits evenly and never leaves a single pair", () => {
    expect(groupPairs(cards(10), 4).map((g) => g.length)).toEqual([4, 3, 3]);
    expect(groupPairs(cards(11), 6).map((g) => g.length)).toEqual([6, 5]);
    expect(groupPairs(cards(5), 4).map((g) => g.length)).toEqual([3, 2]);
    expect(groupPairs(cards(1), 4)).toEqual([]);
  });

  it("regroupMatches: wide screens show up to 6 pairs, same pairs and order of other questions", () => {
    const phone = groupPairs(cards(12), 4).map((pairs): Question => ({ type: "match", pairs }));
    const wide = regroupMatches(phone, 6);
    expect(sizes(wide)).toEqual([6, 6]);
    expect(wide.flatMap((q) => (q.type === "match" ? q.pairs : []))).toEqual(cards(12));
    const flash: Question = { type: "flash", card: cards(1)[0]! };
    // A lone match question (e.g. inside a skills challenge) is left as it is.
    expect(regroupMatches([flash, phone[0]!, flash], 6)).toEqual([flash, phone[0]!, flash]);
  });

  it("atLeast repeats short lists to 6 without the same word twice in a row", () => {
    for (let seed = 1; seed < 30; seed++) {
      const out = atLeast(["a", "b", "c"], seeded(seed));
      expect(out).toHaveLength(MIN_QUESTIONS);
      expect(new Set(out)).toEqual(new Set(["a", "b", "c"]));
      out.forEach((x, i) => expect(x).not.toBe(out[i - 1]));
    }
    expect(atLeast(["a"], seeded())).toEqual(["a"]);
    expect(
      atLeast(
        Array.from({ length: 20 }, (_, i) => i),
        seeded(),
      ),
    ).toHaveLength(8);
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
