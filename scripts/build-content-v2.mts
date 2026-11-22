/**
 * Content packs v2 → SQL migrations (ARCHITECTURE D60).
 *
 *   node scripts/build-content-v2.mts            # check every pack, write migrations
 *   node scripts/build-content-v2.mts --check    # check only
 *
 * The app's own content schemas are checked by tests/unit/content-packs.test.ts.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPack, PACKS } from "./content-v2-lib.mts";
import type { Pack } from "../content/v2/types.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrations = join(root, "supabase", "migrations");
const checkOnly = process.argv.includes("--check");
const all: string[] = [];

let written = 0;
for (const [file, mod] of PACKS) {
  const path = new URL(mod, new URL("./content-v2-lib.mts", import.meta.url));
  if (!existsSync(path)) continue;
  const pack = ((await import(path.href)) as { PACK: Pack }).PACK;
  const { sql, problems } = buildPack(file, pack);
  all.push(...problems);
  const n = pack.units.reduce((a, u) => a + u.words.length, 0);
  console.log(`${pack.level}: ${pack.units.length} units + ${pack.reviews.length} reviews, ${n} words → ${file}`);
  if (!checkOnly) {
    writeFileSync(join(migrations, file), sql);
    written++;
  }
}
if (all.length) {
  console.error(`\n${all.length} problem(s):\n${all.join("\n")}`);
  process.exit(1);
}
console.log(checkOnly ? "All packs OK." : `Wrote ${written} migration(s).`);
