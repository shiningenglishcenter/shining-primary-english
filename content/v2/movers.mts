import type { Pack } from "./types.mts";
import { UNITS_1 } from "./movers-1.mts";
import { UNITS_2 } from "./movers-2.mts";
import { UNITS_3 } from "./movers-3.mts";
import { EXAMS, GRAMMAR, REVIEWS } from "./movers-4.mts";

/** A1 Movers (D60): 14 topics, 4 reviews, 4 grammar topics, 2 exam-practice topics. */
export const PACK: Pack = {
  level: "MOVERS",
  writeHint: "some",
  units: [...UNITS_1, ...UNITS_2, ...UNITS_3],
  reviews: REVIEWS,
  grammar: GRAMMAR,
  exams: EXAMS,
};
