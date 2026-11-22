import type { Pack } from "./types.mts";
import { UNITS_1 } from "./gs4-1.mts";
import { GRAMMAR, REVIEWS, UNITS_2 } from "./gs4-2.mts";

/** Tiếng Anh 4 Global Success (D60): 20 units, 4 reviews, 2 grammar topics. */
export const PACK: Pack = {
  level: "GS4",
  writeHint: "some",
  units: [...UNITS_1, ...UNITS_2],
  reviews: REVIEWS,
  grammar: GRAMMAR,
};
