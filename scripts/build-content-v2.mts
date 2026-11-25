/**
 * Content packs v2 → SQL migrations (ARCHITECTURE D60).
 *
 *   node scripts/build-content-v2.mts            # check every pack, write migrations
 *   node scripts/build-content-v2.mts --check    # check only
 *
 * The app's own content schemas are checked by tests/unit/content-packs.test.ts.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BOOK_PACKS, buildPack, PACKS, usedTracks } from "./content-v2-lib.mts";
import type { Pack } from "../content/v2/types.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrations = join(root, "supabase", "migrations");
const privateDir = join(root, "supabase", "private");
const checkOnly = process.argv.includes("--check");
const all: string[] = [];

let written = 0;
const jobs = [
  ...PACKS.map(([f, m]) => [f, m, migrations] as const),
  ...BOOK_PACKS.map(([f, m]) => [f, m, privateDir] as const),
];
for (const [file, mod, dir] of jobs) {
  const path = new URL(mod, new URL("./content-v2-lib.mts", import.meta.url));
  if (!existsSync(path)) continue;
  const pack = ((await import(path.href)) as { PACK: Pack }).PACK;
  const { sql, problems } = buildPack(file, pack);
  all.push(...problems);
  const n = pack.units.reduce((a, u) => a + u.words.length, 0);
  process.stdout.write(`${pack.level}: ${pack.units.length} units + ${pack.reviews.length} reviews, ${n} words → ${file}\n`);
  if (pack.book && usedTracks.size) {
    process.stdout.write(`  tracks: ${[...usedTracks].sort((a, b) => a - b).join(" ")}\n`);
  }
  if (!checkOnly) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, file), sql);
    if (pack.book) writeFileSync(join(dir, file.replace(/\.sql$/, ".tracks.json")), JSON.stringify([...usedTracks]));
    written++;
  }
}
if (all.length) {
  console.error(`\n${all.length} problem(s):\n${all.join("\n")}`);
  process.exit(1);
}
process.stdout.write(checkOnly ? "All packs OK.\n" : `Wrote ${written} migration(s).\n`);
