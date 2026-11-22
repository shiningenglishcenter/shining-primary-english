import type { Pack } from "./types.mts";
import { UNITS_1 } from "./flyers-1.mts";
import { UNITS_2 } from "./flyers-2.mts";
import { UNITS_3 } from "./flyers-3.mts";
import { EXAMS, GRAMMAR, REVIEWS } from "./flyers-4.mts";

/** A2 Flyers (D60): 14 topics, 4 reviews, 4 grammar topics, 2 exam-practice topics. */
export const PACK: Pack = {
  level: "FLYERS",
  writeHint: "slots",
  units: [...UNITS_1, ...UNITS_2, ...UNITS_3],
  reviews: REVIEWS,
  grammar: GRAMMAR,
  exams: EXAMS,
};
