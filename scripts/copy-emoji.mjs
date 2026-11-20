// Copies Microsoft Fluent Emoji 3D images (MIT, via @lobehub/fluent-emoji-3d)
// into public/emoji/ so the app serves them itself. Runs before `next build`
// and `next dev`; public/emoji/ is git-ignored. Credits: docs/THIRD_PARTY.md.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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
