/**
 * Content packs v2 (ARCHITECTURE D60): one compact file per level, written
 * as an English teacher would plan a unit. scripts/build-content-v2.mts
 * checks every pack and turns it into a migration with ALL activity kinds,
 * published.
 *
 * ORIGINAL content: topics and word lists follow the Cambridge YLE lists and
 * the Tiếng Anh 1–5 Global Success syllabus; every sentence, question and
 * passage is written for SHINING (nothing copied from books or exam papers).
 *
 * Lines are "field|field|…" strings to keep the packs short and readable.
 */

export type Unit = {
  /** a-z, 0-9 and "-", unique in the level, e.g. "unit-01" or "sports". */
  code: string;
  en: string;
  vi: string;
  /** Topic picture (an emoji in Fluent Emoji 3D). */
  emoji: string;
  /**
   * "word|nghĩa|emoji" — emoji may be left empty for words without a clear
   * picture (they still appear in meaning games, flashcards need a picture).
   * Optional 4th field: part of speech when the same word appears twice.
   */
  words: string[];
  /** Sentence patterns shown at the top of the topic: "English.|Tiếng Việt." (3–5). */
  patterns: string[];
  /** Yes/No: "emoji|sentence|T" or "emoji|sentence|F" (≥ 8). Emoji may be empty. */
  tf: string[];
  /** "emoji|sentence with ___|answer|wrong|wrong" (≥ 8; optional 6th field: explanation in Vietnamese). */
  fill: string[];
  /** "English sentence.|Nghĩa." (≥ 8): "Make a sentence" (≤ 10 words) and "What does it mean?". */
  sentences: string[];
  /** A short passage of the unit's language (Vietnamese names and places welcome). */
  reading: {
    title: string;
    emoji: string;
    passage: string;
    /** "T|true sentence", "F|false sentence", "Q|question|answer|wrong|wrong" (≥ 4). */
    items: string[];
  };
  /** Sounds of the unit (Global Success phonics; Cambridge: chosen sounds), see D61. */
  phonics?: Phonics;
};

/**
 * "Listen and choose the word with the sound": each line is
 * "target word|other word|other word" — the first word has the sound.
 */
export type Phonics = { sound: string; /** e.g. "b" in "bag" */ letters: string; items: string[] };

/** A review topic built from earlier units' words and sentences. */
export type Review = { code: string; en: string; vi: string; emoji: string; units: string[] };

/** A grammar topic (D63): sentences only, with explanations. */
export type Grammar = {
  code: string;
  en: string;
  vi: string;
  emoji: string;
  /** The rule in short Vietnamese + examples: "English.|Tiếng Việt." (3–6). */
  patterns: string[];
  tf: string[];
  fill: string[];
  sentences: string[];
};

/**
 * Exam practice (D62): a topic of activities in the format of one paper
 * (e.g. Starters Listening). `content` is the stored activity content, with
 * pictures written as emoji (the build turns them into codes).
 */
export type Exam = {
  code: string;
  en: string;
  vi: string;
  emoji: string;
  acts: { kind: string; en: string; vi: string; content: Record<string, unknown> }[];
};

export type Pack = {
  /** levels.code, e.g. "MOVERS", "GS3". */
  level: string;
  /** Listen-and-write starting hint for this level (D46). */
  writeHint: "letters" | "some" | "slots" | "none";
  units: Unit[];
  reviews: Review[];
  grammar?: Grammar[];
  exams?: Exam[];
};
