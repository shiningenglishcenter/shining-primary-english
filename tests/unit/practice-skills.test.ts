import { describe, expect, it } from "vitest";
import { contentSchemaFor, parseYouTube, settingsOf } from "@/features/practice/model";
import {
  buildRound,
  letterTiles,
  MIXED_STEP_SIZE,
  revealPattern,
  sameWord,
  toYesNoQuestion,
} from "@/features/practice/round";

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

describe("hints and settings", () => {
  it("carries teacher hints and defaults the play settings", () => {
    const r = buildRound(
      "true_false",
      { items: [{ emoji: null, sentence: "It is red.", answer: true, hint: "Look at the colour." }] },
      words,
      rand,
    );
    expect(r.questions[0]).toMatchObject({ type: "true_false", hint: "Look at the colour." });
    expect(settingsOf(undefined)).toEqual({
      hints: true,
      explain: true,
      maxTries: 3,
      writeHint: "slots",
      yesNo: "short",
    });
    expect(settingsOf({ hints: false, explain: true, maxTries: 9 })).toEqual({
      hints: true,
      explain: true,
      maxTries: 3,
      writeHint: "slots",
      yesNo: "short",
    });
    expect(settingsOf({ hints: false, explain: true, maxTries: 1 })).toEqual({
      hints: false,
      explain: true,
      maxTries: 1,
      writeHint: "slots",
      yesNo: "short",
    });
  });
});

describe("listen_type", () => {
  it("uses single-word vocabulary and compares typed words loosely", () => {
    const r = buildRound("listen_type", {}, words, rand);
    // Three usable words, repeated to six questions (C8).
    expect(r.questions).toHaveLength(6);
    expect(new Set(r.questions.map((q) => q.type === "listen_type" && q.answer.word))).toEqual(
      new Set(["cat", "dog", "fish"]),
    );
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
    expect(r.contexts).toEqual([
      { type: "listening", media: { source: "youtube", videoId: "dQw4w9WgXcQ" }, gate: false },
    ]);
    expect(r.questions.map((q) => [q.type, q.ctx])).toEqual([
      ["true_false", 0],
      ["choice", 0],
    ]);
    expect(r.maxScore).toBe(4);
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
      2 * (MIXED_STEP_SIZE + 4 + (matchPairs?.type === "match" ? matchPairs.pairs.length : 0)),
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

describe("listen-and-write hints (D46)", () => {
  it("revealPattern shows first and last letters, every third in long words, and spaces", () => {
    expect(revealPattern("cat")).toEqual(["c", null, "t"]);
    expect(revealPattern("go")).toEqual(["g", null]);
    expect(
      revealPattern("elephant")
        .map((c) => c ?? "_")
        .join(""),
    ).toBe("e__p__nt");
    expect(
      revealPattern("ice cream")
        .map((c) => c ?? "_")
        .join(""),
    ).toBe("i__ __e_m");
  });
  it("letterTiles has every letter plus 3 extra, the same each time", () => {
    const tiles = letterTiles("apple");
    expect(tiles).toHaveLength(8);
    for (const ch of "apple") expect(tiles.filter((t) => t === ch).length).toBeGreaterThanOrEqual(1);
    expect(tiles.filter((t) => t === "p")).toHaveLength(2);
    expect(letterTiles("apple")).toEqual(tiles);
  });
  it("settings default to letter boxes, as before", () => {
    expect(settingsOf({}).writeHint).toBe("slots");
    expect(settingsOf({ writeHint: "letters" }).writeHint).toBe("letters");
    expect(settingsOf({ writeHint: "nope" }).writeHint).toBe("slots");
  });
});

describe("meaning activities (D47)", () => {
  const plain = [
    { word: "happy", meaningVi: "vui", emoji: null },
    { word: "sad", meaningVi: "buồn", emoji: null },
    { word: "big", meaningVi: "to", emoji: null },
  ];
  it("match_meaning uses words without pictures and marks the screens", () => {
    const r = buildRound("match_meaning", {}, plain, rand);
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0]).toMatchObject({ type: "match", meaning: true });
    expect(buildRound("match", {}, plain, rand).questions).toHaveLength(0);
  });
  it("translate gives choice questions with the direction", () => {
    const content = {
      direction: "en_vi",
      items: [{ sentence: "I am happy.", answer: "Tớ vui.", options: ["Tớ vui.", "Tớ buồn.", "Tớ to."] }],
    };
    expect(contentSchemaFor("translate").safeParse(content).success).toBe(true);
    const q = buildRound("translate", content, [], rand).questions[0]!;
    expect(q).toMatchObject({ type: "choice", prompt: "I am happy.", answer: "Tớ vui.", translate: "en_vi" });
    expect(
      contentSchemaFor("translate").safeParse({
        items: [{ sentence: "x", answer: "a", options: ["b", "c"] }],
      }).success,
    ).toBe(false);
  });
});

describe("full Yes/No answers (D48)", () => {
  const cases: [string, string, string, string][] = [
    ["This is a dog.", "Is this a dog?", "Yes, it is.", "No, it isn't."],
    ["This is my nose.", "Is this your nose?", "Yes, it is.", "No, it isn't."],
    ["These are socks.", "Are these socks?", "Yes, they are.", "No, they aren't."],
    ["She is my mother.", "Is she your mother?", "Yes, she is.", "No, she isn't."],
    ["I can see a cat.", "Can you see a cat?", "Yes, I can.", "No, I can't."],
    ["I have got a kite.", "Have you got a kite?", "Yes, I have.", "No, I haven't."],
    ["I like ice cream.", "Do you like ice cream?", "Yes, I do.", "No, I don't."],
    ["The frog is green.", "Is the frog green?", "Yes, it is.", "No, it isn't."],
    ["A plane can fly.", "Can a plane fly?", "Yes, it can.", "No, it can't."],
    ["A snake has got four legs.", "Has a snake got four legs?", "Yes, it has.", "No, it hasn't."],
    ["There are three apples.", "Are there three apples?", "Yes, there are.", "No, there aren't."],
  ];
  it.each(cases)("%s", (s, question, yes, no) => {
    expect(toYesNoQuestion(s)).toEqual({ question, yes, no });
  });
  it("leaves other sentences alone", () => {
    expect(toYesNoQuestion("One and one is two.")).toBeNull();
    expect(toYesNoQuestion("This isn't a dog.")).toBeNull();
    expect(toYesNoQuestion("Is this a dog?")).toBeNull();
  });
});

describe("explanations (D49)", () => {
  it("carries the teacher's explanation to the question; on by default", () => {
    const content = {
      items: [
        {
          sentence: "It is ___ apple.",
          answer: "an",
          options: ["an", "a"],
          explain: "Dùng an trước nguyên âm.",
        },
      ],
    };
    expect(contentSchemaFor("fill_blank").safeParse(content).success).toBe(true);
    expect(buildRound("fill_blank", content, [], rand).questions[0]).toMatchObject({
      explain: "Dùng an trước nguyên âm.",
    });
    expect(settingsOf({}).explain).toBe(true);
    expect(
      contentSchemaFor("fill_blank").safeParse({ items: [{ ...content.items[0], explain: "x".repeat(401) }] })
        .success,
    ).toBe(false);
  });
});

describe("video gate (D50)", () => {
  it("carries the gate and per-question times", () => {
    const content = {
      media: { source: "youtube", videoId: "dQw4w9WgXcQ" },
      gate: true,
      items: [
        { type: "tf", sentence: "The cat sings.", answer: true, at: 75 },
        { type: "tf", sentence: "The dog sings.", answer: false },
      ],
    };
    expect(contentSchemaFor("listening").safeParse(content).success).toBe(true);
    const r = buildRound("listening", content, [], rand);
    expect(r.contexts[0]).toMatchObject({ type: "listening", gate: true });
    expect(r.questions[0]).toMatchObject({ at: 75 });
    expect(r.questions[1]!.at).toBeUndefined();
    const old = buildRound("listening", { ...content, gate: undefined }, [], rand);
    expect(old.contexts[0]).toMatchObject({ gate: false });
  });
});
