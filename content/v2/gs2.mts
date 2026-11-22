import type { Pack } from "./types.mts";
import { UNITS_1 } from "./gs2-1.mts";
import { REVIEWS, UNITS_2 } from "./gs2-2.mts";

/** Tiếng Anh 2 Global Success (D60): 16 units, 4 reviews. */
export const PACK: Pack = {
  level: "GS2",
  writeHint: "letters",
  units: [...UNITS_1, ...UNITS_2],
  reviews: REVIEWS,
};
