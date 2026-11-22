import type { Pack } from "./types.mts";
import { UNITS_1 } from "./gs3-1.mts";
import { REVIEWS, UNITS_2 } from "./gs3-2.mts";

/** Tiếng Anh 3 Global Success (D60): 20 units, 4 reviews. */
export const PACK: Pack = {
  level: "GS3",
  writeHint: "letters",
  units: [...UNITS_1, ...UNITS_2],
  reviews: REVIEWS,
};
