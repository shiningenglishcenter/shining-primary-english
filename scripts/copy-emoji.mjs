// Copies Microsoft Fluent Emoji 3D images (MIT, via @lobehub/fluent-emoji-3d)
// into public/emoji/ so the app serves them itself. Runs before `next build`
// and `next dev`; public/emoji/ is git-ignored. Credits: docs/THIRD_PARTY.md.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@lobehub", "fluent-emoji-3d", "assets");
const to = join(root, "public", "emoji");

if (!existsSync(from)) {
  console.error("copy-emoji: @lobehub/fluent-emoji-3d is not installed (run npm install)");
  process.exit(1);
}
const files = readdirSync(from).filter((f) => f.endsWith(".webp"));
mkdirSync(to, { recursive: true });
if (readdirSync(to).filter((f) => f.endsWith(".webp")).length !== files.length) {
  cpSync(from, to, { recursive: true });
}
console.warn(`copy-emoji: ${files.length} images in public/emoji`);

// Search index for the editor's emoji picker (A1, D42): English and Vietnamese
// names and keywords from emojibase-data (MIT, CLDR annotations), only for
// emoji that have a Fluent 3D picture. Row: [code, english words, vietnamese words].
const have = new Set(files.map((f) => f.slice(0, -5)));
const read = (lang) =>
  JSON.parse(readFileSync(join(root, "node_modules", "emojibase-data", lang, "data.json"), "utf8"));
const vi = new Map(read("vi").map((e) => [e.hexcode, e]));
const codeOf = (unicode) =>
  Array.from(unicode)
    .map((ch) => ch.codePointAt(0).toString(16).padStart(4, "0"))
    .join("-");
const rows = [];
for (const e of read("en").sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9))) {
  if (e.group === 2 || e.group === 9) continue; // skin-tone components, flags
  const full = codeOf(e.emoji);
  const code = have.has(full)
    ? full
    : have.has(full.replace(/-fe0f/g, ""))
      ? full.replace(/-fe0f/g, "")
      : null;
  if (!code) continue;
  const v = vi.get(e.hexcode);
  const words = (x) => [x?.label ?? "", ...(x?.tags ?? [])].join(" | ");
  rows.push([code, words(e), words(v)]);
}
writeFileSync(join(to, "index.json"), JSON.stringify(rows));
console.warn(`copy-emoji: ${rows.length} emoji in the picker index`);
