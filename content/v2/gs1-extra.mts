import type { Pack } from "./types.mts";

/**
 * Global Success 1 additions (D61): a phonics game in every unit, on the
 * letter the unit's words share. Words are the unit's own (content/gs1.mts).
 */
export const PACK: Pack = {
  level: "GS1",
  writeHint: "letters",
  units: [],
  reviews: [],
  phonicsFor: [
    { code: "unit-01", phonics: { sound: "/b/", letters: "b (ball, bike)", items: ["ball|doll|wall", "bike|kite|like", "book|cook|look", "bell|well|tell", "bag|tag|rag", "bus|sun|cup"] } },
    { code: "unit-02", phonics: { sound: "/k/", letters: "c (cake, car)", items: ["cake|lake|rake", "car|star|jar", "cat|hat|mat", "cup|pup|up", "cookie|bookie|rookie", "cow|now|how"] } },
    { code: "unit-03", phonics: { sound: "/æ/", letters: "a (apple, bag)", items: ["apple|egg|orange", "bag|bed|big", "hand|hen|hut", "hat|hot|hut", "ant|end|in", "cat|cut|kit"] } },
    { code: "unit-04", phonics: { sound: "/d/", letters: "d (dog, door)", items: ["dog|log|fog", "door|four|more", "duck|luck|truck", "doll|ball|tall", "bed|bet|beg", "desk|mask|task"] } },
    { code: "unit-05", phonics: { sound: "/ɪ/", letters: "i (fish, milk)", items: ["fish|fresh|foot", "milk|melt|mall", "chips|chops|chaps", "pig|peg|pug", "sit|sat|set", "six|sax|socks"] } },
    { code: "unit-06", phonics: { sound: "/e/", letters: "e (pen, egg)", items: ["pen|pin|pan", "egg|ink|up", "ten|tin|tan", "bed|bid|bad", "red|rod|rid", "net|nut|not"] } },
    { code: "unit-07", phonics: { sound: "/g/", letters: "g (girl, goat)", items: ["goat|boat|coat", "girl|curl|pearl", "grapes|tapes|capes", "gate|late|plate", "dog|dot|doll", "bag|bat|back"] } },
    { code: "unit-08", phonics: { sound: "/h/", letters: "h (horse, hen)", items: ["horse|course|sauce", "house|mouse|blouse", "hen|ten|pen", "hat|cat|bat", "hand|sand|band", "hop|top|mop"] } },
    { code: "unit-09", phonics: { sound: "/ɒ/", letters: "o (box, sock)", items: ["box|bus|bikes", "clock|click|clack", "sock|sack|suck", "dog|dig|dug", "hot|hat|hit", "pot|pet|pit"] } },
    { code: "unit-10", phonics: { sound: "/m/", letters: "m (monkey, mouse)", items: ["monkey|donkey|key", "mouse|house|blouse", "mango|tango|banjo", "map|cap|tap", "moon|spoon|noon", "milk|silk|ink"] } },
    { code: "unit-11", phonics: { sound: "/ʌ/", letters: "u (bus, sun)", items: ["bus|bat|bit", "sun|sin|sign", "truck|track|trick", "cup|cap|cop", "duck|dock|deck", "run|ran|rain"] } },
    { code: "unit-12", phonics: { sound: "/l/", letters: "l (lake, leaf)", items: ["lake|cake|make", "leaf|beef|reef", "lemon|demon|seven", "lion|iron|eye", "lamp|camp|damp", "leg|peg|beg"] } },
    { code: "unit-13", phonics: { sound: "/n/", letters: "n (noodles, nuts)", items: ["nuts|cuts|huts", "noodles|poodles|doodles", "nose|rose|hose", "net|wet|pet", "nest|best|vest", "nine|five|life"] } },
    { code: "unit-14", phonics: { sound: "/t/", letters: "t (teddy, train)", items: ["teddy|daddy|Eddie", "train|rain|chain", "toy|boy|joy", "top|mop|hop", "ten|hen|pen", "tiger|finger|singer"] } },
    { code: "unit-15", phonics: { sound: "/f/", letters: "f (foot, face)", items: ["foot|boot|root", "face|race|lace", "father|rather|gather", "flag|bag|rag", "fan|man|can", "fish|dish|wish"] } },
    { code: "unit-16", phonics: { sound: "/w/", letters: "w (window, water)", items: ["window|pillow|yellow", "water|daughter|doctor", "wet|net|pet", "wall|ball|tall", "web|bed|red", "wig|pig|big"] } },
  ],
};
