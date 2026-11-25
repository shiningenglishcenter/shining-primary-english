/**
 * Uploads a coursebook's audio tracks (ARCHITECTURE D66) to the private
 * `learning-media` bucket, at the paths the book pack's SQL points to.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/upload-book-audio.mts <book> <tracks.json> <folder> <name pattern>
 *
 *   e.g. node scripts/upload-book-audio.mts start supabase/private/starters_start_book.tracks.json \
 *          ~/audio/start "tk{n}.mp3"
 *
 * {n} is the track number ({nnn}: three digits, e.g. 007). Only the tracks the
 * pack uses are uploaded; files already there are skipped, so it can be re-run.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { trackPath } from "./content-v2-lib.mts";

const [book, list, folder, pattern] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!book || !list || !folder || !pattern || !url || !key) {
  console.error("Usage: see the comment at the top. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const tracks = JSON.parse(readFileSync(list, "utf8")) as number[];

let uploaded = 0;
let skipped = 0;
const missing: number[] = [];
for (const n of tracks.sort((a, b) => a - b)) {
  const file = join(folder, pattern.replace("{nnn}", String(n).padStart(3, "0")).replace("{n}", String(n)));
  if (!existsSync(file)) {
    missing.push(n);
    continue;
  }
  const path = trackPath(book, n);
  const { error } = await supabase.storage
    .from("learning-media")
    .upload(path, readFileSync(file), { contentType: "audio/mpeg", upsert: false });
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error(`track ${n}: ${error.message}`);
    process.exit(1);
  }
  if (error) skipped++;
  else uploaded++;
}
process.stdout.write(`${book}: ${uploaded} uploaded, ${skipped} already there${missing.length ? `, missing files: ${missing.join(" ")}` : ""}.\n`);
