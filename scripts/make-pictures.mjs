// Teacher feedback C1 (ARCHITECTURE D45): a few pictures that one emoji cannot
// show (a garden, a monkey IN a tree, a grandfather with a walking stick, a
// frog jumping) are composed from Fluent Emoji 3D images (MIT) at build time
// and written to public/emoji/<code>.webp, next to the emoji themselves.
// Codes are in Unicode's private use area (U+F0001…), so the database and
// the editor treat them like any other emoji code. Credits: docs/THIRD_PARTY.md.
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SIZE = 256;

/** Walking stick with a curved handle, drawn in brown. */
const stick = (x) => `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <path d="M${x} 250 L${x} 112 Q${x} 86 ${x + 22} 86 Q${x + 40} 86 ${x + 40} 104"
        fill="none" stroke="#7a4a21" stroke-width="13" stroke-linecap="round"/>
</svg>`;

/** Dashed jump arc with a little landing mark. */
const jumpArc = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <path d="M30 228 Q120 0 228 200" fill="none" stroke="#3a9a47" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="4 20"/>
  <path d="M210 226 h36" stroke="#3a9a47" stroke-width="8" stroke-linecap="round"/>
</svg>`;

/** Grass strip along the bottom. */
const grass = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="200" width="244" height="50" rx="25" fill="#8bc34a"/>
</svg>`;

/**
 * Each picture: layers drawn in order on a 256 px square. `e` = Fluent code,
 * `svg` = drawn shape; x/y/size in px. Names feed the editor's picker index.
 */
export const PICTURES = [
  {
    code: "f0001",
    en: "garden | flowers | yard | garden with tree",
    vi: "khu vườn | vườn hoa | vườn",
    layers: [
      { svg: grass },
      { e: "1f333", x: 120, y: 6, size: 136 },
      { e: "1f337", x: 4, y: 104, size: 104 },
      { e: "1f33b", x: 78, y: 120, size: 100 },
      { e: "1f33c", x: 150, y: 140, size: 90 },
    ],
  },
  {
    code: "f0002",
    en: "monkey in the tree | monkey tree",
    vi: "khỉ trên cây | con khỉ ở trên cây",
    layers: [
      { e: "1f333", x: 0, y: 0, size: 256 },
      { e: "1f412", x: 92, y: 52, size: 112 },
    ],
  },
  {
    code: "f0003",
    en: "grandfather | grandpa | old man with a walking stick",
    vi: "ông | ông nội | ông ngoại | ông chống gậy",
    layers: [{ e: "1f474", x: 0, y: 26, size: 210 }, { svg: stick(196) }],
  },
  {
    code: "f0004",
    en: "grandmother | grandma | old woman with a walking stick",
    vi: "bà | bà nội | bà ngoại | bà chống gậy",
    layers: [{ e: "1f475", x: 0, y: 26, size: 210 }, { svg: stick(196) }],
  },
  {
    code: "f0005",
    en: "frog jumping | jump | frog jump",
    vi: "ếch nhảy | con ếch đang nhảy | nhảy",
    layers: [{ svg: jumpArc }, { e: "1f438", x: 78, y: 24, size: 120 }],
  },
];

/** Writes every picture into `dir` (public/emoji); returns the rows for the picker index. */
export async function makePictures(dir) {
  const rows = [];
  for (const p of PICTURES) {
    const out = join(dir, `${p.code}.webp`);
    const inputs = [];
    for (const l of p.layers) {
      if (l.svg) {
        inputs.push({ input: Buffer.from(l.svg), left: 0, top: 0 });
      } else {
        const src = join(dir, `${l.e}.webp`);
        if (!existsSync(src)) throw new Error(`make-pictures: ${l.e}.webp missing for ${p.code}`);
        inputs.push({ input: await sharp(src).resize(l.size, l.size).toBuffer(), left: l.x, top: l.y });
      }
    }
    await sharp({
      create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite(inputs)
      .webp({ quality: 90 })
      .toFile(out);
    rows.push([p.code, p.en, p.vi]);
  }
  return rows;
}
